from __future__ import annotations

import argparse
import copy
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
import pandas as pd

from training.common import (
    CLASS_LABELS,
    canonical_label,
    classification_metrics,
    patient_split,
    seed_everything,
    sha256,
    write_json,
)


TABULAR_FEATURES = [
    "memory_score",
    "immediate_recall",
    "delayed_recall",
    "recognition_score",
    "attention_score",
    "digit_span",
    "reaction_time_ms",
    "sustained_attention_score",
    "sleep_hours",
    "sleep_quality",
    "exercise_hours_week",
    "smoking",
    "alcohol_use",
    "medical_history",
    "lifestyle_score",
]


def compute_class_weights(labels, num_classes: int = len(CLASS_LABELS)) -> np.ndarray:
    """Return one balanced loss weight per configured class."""
    labels = np.asarray(labels, dtype=np.int64)
    counts = np.bincount(labels, minlength=num_classes)
    if counts.size != num_classes:
        raise ValueError(f"Expected labels for {num_classes} classes; got counts {counts.tolist()}")
    weights = counts.sum() / np.maximum(counts, 1)
    return weights / weights.mean()


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--speech-artifact", required=True, help="Exact speech TorchScript model used to create speech_patient_embeddings.csv")
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--ablation-epochs", type=int, default=50)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--patience", type=int, default=15)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--model-dim", type=int, default=64)
    return parser.parse_args()


def main():
    args = parse_args()
    seed_everything(args.seed)
    import torch
    from torch import nn
    from torch.utils.data import DataLoader, TensorDataset

    from training.models import AblationMLP, FusionTransformer

    frame = pd.read_csv(args.dataset)
    dataset_provenance = json.loads(Path(f"{args.dataset}.manifest.json").read_text(encoding="utf-8"))
    if dataset_provenance.get("csv_sha256") != sha256(args.dataset):
        raise ValueError("Fusion dataset changed after patient alignment; provenance is invalid.")
    required = {"patient_id", "label", *TABULAR_FEATURES}
    if missing := required - set(frame.columns):
        raise ValueError(f"Fusion dataset is missing columns: {sorted(missing)}")
    frame["patient_id"] = frame["patient_id"].astype(str)
    if frame["patient_id"].duplicated().any():
        raise ValueError("Fusion training requires exactly one aligned row per patient.")
    frame["label"] = frame["label"].map(canonical_label)
    observed_classes = set(frame["label"].unique())
    if observed_classes != set(CLASS_LABELS):
        counts = frame["label"].value_counts().to_dict()
        raise ValueError(
            "Binary fusion training requires Non-Dementia and Dementia patients. "
            f"Observed {counts}. Do not claim clinical validation with synthetic auxiliary modalities."
        )
    label_to_index = {label: index for index, label in enumerate(CLASS_LABELS)}
    frame["label_index"] = frame["label"].map(label_to_index)

    speech_columns = sorted(
        [column for column in frame.columns if column.startswith("speech_embedding_")],
        key=lambda value: int(value.rsplit("_", 1)[1]),
    )
    if not speech_columns:
        raise ValueError("Fusion dataset contains no speech_embedding_* features.")
    speech_artifact = Path(args.speech_artifact)
    speech_manifest = json.loads(Path(f"{speech_artifact}.manifest.json").read_text(encoding="utf-8"))
    if (speech_manifest.get("class_labels") != CLASS_LABELS
            or speech_manifest.get("artifact_sha256") != sha256(speech_artifact)
            or int(speech_manifest.get("embedding_dim", -1)) != len(speech_columns)):
        raise ValueError("Speech artifact and the binary fusion training features do not match.")
    if (dataset_provenance.get("speech_artifact_sha256") != speech_manifest["artifact_sha256"]
            or dataset_provenance.get("input_features") != [*speech_columns, *TABULAR_FEATURES]):
        raise ValueError("Fusion dataset was not built from this speech model and website feature order.")
    feature_columns = [*speech_columns, *TABULAR_FEATURES]
    if frame[feature_columns].isna().any().any():
        raise ValueError("Fusion dataset contains missing model values.")

    if "split" in frame.columns:
        observed_splits = set(frame["split"].astype(str).unique())
        if observed_splits != {"train", "validation", "test"}:
            raise ValueError(
                "A supplied split column must contain only train, validation and test; "
                f"observed {sorted(observed_splits)}"
            )
        train_idx = frame.index[frame["split"] == "train"].to_numpy()
        val_idx = frame.index[frame["split"] == "validation"].to_numpy()
        test_idx = frame.index[frame["split"] == "test"].to_numpy()
    else:
        train_idx, val_idx, test_idx = patient_split(frame, "patient_id", "label", args.seed)
        frame["split"] = ""
        frame.loc[train_idx, "split"] = "train"
        frame.loc[val_idx, "split"] = "validation"
        frame.loc[test_idx, "split"] = "test"

    split_sets = [set(frame.loc[index, "patient_id"]) for index in (train_idx, val_idx, test_idx)]
    if split_sets[0] & split_sets[1] or split_sets[0] & split_sets[2] or split_sets[1] & split_sets[2]:
        raise ValueError("Patient leakage exists between fusion splits.")
    for split_name, indices in (("train", train_idx), ("validation", val_idx), ("test", test_idx)):
        missing_classes = set(CLASS_LABELS) - set(frame.loc[indices, "label"])
        if missing_classes:
            raise ValueError(f"{split_name} split is missing classes: {sorted(missing_classes)}")

    x = frame[feature_columns].to_numpy(dtype=np.float32)
    if not np.isfinite(x).all():
        raise ValueError("Fusion dataset contains infinite or non-finite model values.")
    y = frame["label_index"].to_numpy(dtype=np.int64)
    means = x[train_idx].mean(axis=0)
    scales = x[train_idx].std(axis=0)
    scales[scales < 1e-6] = 1.0
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    def loader(indices, values=x, shuffle=False):
        dataset = TensorDataset(
            torch.from_numpy(values[indices]).float(), torch.from_numpy(y[indices]).long()
        )
        return DataLoader(dataset, batch_size=args.batch_size, shuffle=shuffle)

    class_weights = compute_class_weights(y[train_idx], num_classes=len(CLASS_LABELS))
    criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(class_weights, dtype=torch.float32, device=device)
    )

    def probabilities(model, data_loader):
        model.eval()
        values = []
        labels = []
        with torch.inference_mode():
            for features, targets in data_loader:
                output = model(features.to(device))
                logits = output[0] if isinstance(output, (tuple, list)) else output
                values.append(torch.softmax(logits, dim=1).cpu().numpy())
                labels.append(targets.numpy())
        return np.concatenate(labels), np.concatenate(values)

    def fit(model, train_loader, validation_loader, epochs, patience):
        model = model.to(device)
        optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)
        best_state = None
        best_score = -1.0
        wait = 0
        history = []
        for epoch in range(1, epochs + 1):
            model.train()
            loss_sum = 0.0
            samples = 0
            for features, targets in train_loader:
                optimizer.zero_grad(set_to_none=True)
                output = model(features.to(device))
                logits = output[0] if isinstance(output, (tuple, list)) else output
                loss = criterion(logits, targets.to(device))
                loss.backward()
                nn.utils.clip_grad_norm_(model.parameters(), 1.0)
                optimizer.step()
                loss_sum += float(loss.detach().cpu()) * targets.size(0)
                samples += targets.size(0)
            val_y, val_probabilities = probabilities(model, validation_loader)
            metrics = classification_metrics(val_y, val_probabilities, CLASS_LABELS)
            history.append(
                {
                    "epoch": epoch,
                    "train_loss": loss_sum / max(samples, 1),
                    "val_macro_f1": metrics["macro_f1"],
                    "val_accuracy": metrics["accuracy"],
                }
            )
            if metrics["macro_f1"] > best_score + 1e-5:
                best_score = metrics["macro_f1"]
                best_state = copy.deepcopy(model.state_dict())
                wait = 0
            else:
                wait += 1
                if wait >= patience:
                    break
        if best_state is None:
            raise RuntimeError("Training did not create a checkpoint.")
        model.load_state_dict(best_state)
        return model, history

    speech_dim = len(speech_columns)
    model = FusionTransformer(
        speech_dim=speech_dim,
        tabular_dims=(4, 4, 7),
        means=torch.tensor(means, dtype=torch.float32),
        scales=torch.tensor(scales, dtype=torch.float32),
        model_dim=args.model_dim,
    )
    model, history = fit(
        model,
        loader(train_idx, shuffle=True),
        loader(val_idx),
        args.epochs,
        args.patience,
    )
    test_y, test_probabilities = probabilities(model, loader(test_idx))
    test_metrics = classification_metrics(test_y, test_probabilities, CLASS_LABELS)

    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    model = model.cpu().eval()
    scripted = torch.jit.script(model)
    artifact = output / "neuromind_multimodal_transformer_binary.pt"
    scripted.save(str(artifact))
    manifest = {
        "name": "neuromind-multimodal-transformer",
        "version": "2.0.0",
        "framework": "torchscript",
        "task": "binary_multimodal_screening",
        "input_features": feature_columns,
        "speech_embedding_dim": speech_dim,
        "speech_artifact_sha256": speech_manifest["artifact_sha256"],
        "tabular_feature_count": len(TABULAR_FEATURES),
        "modality_slices": {
            "speech": [0, speech_dim],
            "memory": [speech_dim, speech_dim + 4],
            "attention": [speech_dim + 4, speech_dim + 8],
            "lifestyle": [speech_dim + 8, speech_dim + 15],
        },
        "class_labels": CLASS_LABELS,
        "output_type": "logits",
        "patient_level_split": True,
        "normalization_bundled_in_artifact": True,
        "background_values": means.tolist(),
        "artifact_sha256": sha256(artifact),
        "test_metrics": test_metrics,
    }
    write_json(f"{artifact}.manifest.json", manifest)
    write_json(output / "fusion_training_history.json", history)
    write_json(output / "fusion_test_metrics.json", test_metrics)

    predictions = frame.loc[test_idx, ["patient_id", "label"]].copy()
    for class_index, label in enumerate(CLASS_LABELS):
        predictions[f"probability_{label.lower()}"] = test_probabilities[:, class_index]
    predictions["prediction"] = [CLASS_LABELS[index] for index in test_probabilities.argmax(axis=1)]
    predictions.to_csv(output / "fusion_test_predictions.csv", index=False)
    frame[["patient_id", "label", "split"]].to_csv(output / "patient_splits.csv", index=False)

    normalized = (x - means) / scales
    group_indices = {
        "speech_only": list(range(0, speech_dim)),
        "memory_only": list(range(speech_dim, speech_dim + 4)),
        "attention_only": list(range(speech_dim + 4, speech_dim + 8)),
        "lifestyle_only": list(range(speech_dim + 8, speech_dim + 15)),
        "speech_memory": list(range(0, speech_dim + 4)),
        "speech_memory_attention": list(range(0, speech_dim + 8)),
        "all_modalities": list(range(0, speech_dim + 15)),
    }
    ablation_results = {}
    for name, indices in group_indices.items():
        seed_everything(args.seed)
        subset = normalized[:, indices].astype(np.float32)
        ablation = AblationMLP(len(indices), num_classes=2)
        ablation, _ = fit(
            ablation,
            loader(train_idx, values=subset, shuffle=True),
            loader(val_idx, values=subset),
            args.ablation_epochs,
            min(args.patience, 8),
        )
        ablation_y, ablation_probabilities = probabilities(
            ablation, loader(test_idx, values=subset)
        )
        ablation_results[name] = classification_metrics(
            ablation_y, ablation_probabilities, CLASS_LABELS
        )
        print(name, ablation_results[name]["macro_f1"])
    write_json(output / "ablation_results.json", ablation_results)
    print({"artifact": str(artifact), "test": test_metrics})


if __name__ == "__main__":
    main()
