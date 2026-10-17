from __future__ import annotations

import argparse
import copy
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


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output-dir", required=True)
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--batch-size", type=int, default=8)
    parser.add_argument("--hidden-dim", type=int, default=128)
    parser.add_argument("--embedding-dim", type=int, default=128)
    parser.add_argument("--max-frames", type=int, default=256,
                        help="Uniformly sample at most this many valid frames inside the exported model")
    parser.add_argument("--heads", type=int, default=4)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--patience", type=int, default=10)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--wav2vec-model", default="facebook/wav2vec2-base-960h")
    parser.add_argument("--train-frame-mask", type=float, default=0.03,
                        help="Fraction of hidden-state frames masked during training only (0 to 0.15)")
    parser.add_argument("--min-test-macro-f1", type=float, default=0.0,
                        help="Predeclared release criterion on held-out patients; failure blocks artifact export")
    parser.add_argument("--min-dementia-recall", type=float, default=0.0,
                        help="Predeclared minimum held-out Dementia sensitivity")
    parser.add_argument("--validation-only", action="store_true",
                        help="Experiment on training/validation patients; never open the test set or export artifacts")
    return parser.parse_args()


def main():
    args = parse_args()
    if not 0 <= args.train_frame_mask <= 0.15:
        raise ValueError("--train-frame-mask must be between 0 and 0.15")
    if not 0 <= args.min_test_macro_f1 <= 1 or not 0 <= args.min_dementia_recall <= 1:
        raise ValueError("Release criteria must be between 0 and 1")
    if args.max_frames < 1:
        raise ValueError("--max-frames must be positive")
    seed_everything(args.seed)
    import torch
    from torch import nn
    from torch.nn.utils.rnn import pad_sequence
    from torch.utils.data import DataLoader, Dataset

    from training.models import SpeechBiLSTMAttention

    frame = pd.read_csv(args.manifest)
    required = {"patient_id", "label", "embedding_path"}
    if missing := required - set(frame.columns):
        raise ValueError(f"Speech manifest is missing columns: {sorted(missing)}")
    frame["patient_id"] = frame["patient_id"].astype(str)
    frame["label"] = frame["label"].map(canonical_label)
    observed_labels = set(frame["label"].unique().tolist())
    unsupported = observed_labels - set(CLASS_LABELS)
    if unsupported:
        raise ValueError(f"Unsupported speech labels: {sorted(unsupported)}")
    class_labels = [label for label in CLASS_LABELS if label in observed_labels]
    if len(class_labels) < 2:
        raise ValueError("Speech training requires at least two classes.")
    label_to_index = {label: index for index, label in enumerate(class_labels)}
    frame["label_index"] = frame["label"].map(label_to_index)
    if "audio_sha256" in frame.columns:
        duplicate_patients = frame.groupby("audio_sha256")["patient_id"].nunique()
        if (duplicate_patients > 1).any():
            raise ValueError("Identical audio is present under different patients; held-out validation would leak")
    train_idx, val_idx, test_idx = patient_split(frame, "patient_id", "label", args.seed)
    for split_name, indices in (("train", train_idx), ("validation", val_idx), ("test", test_idx)):
        missing_classes = set(class_labels) - set(frame.loc[indices, "label"])
        if missing_classes:
            raise ValueError(f"{split_name} speech split is missing classes: {sorted(missing_classes)}")

    with np.load(frame.iloc[0]["embedding_path"]) as item:
        input_dim = int(item["hidden_states"].shape[1])

    class SequenceDataset(Dataset):
        def __init__(self, indices):
            self.rows = frame.loc[indices].reset_index(drop=True)

        def __len__(self):
            return len(self.rows)

        def __getitem__(self, index):
            row = self.rows.iloc[index]
            with np.load(row.embedding_path) as item:
                sequence = item["hidden_states"].astype(np.float32)
            if sequence.ndim != 2 or sequence.shape[0] == 0 or sequence.shape[1] != input_dim:
                raise ValueError(f"Invalid speech sequence shape for patient {row.patient_id}: {sequence.shape}")
            if not np.isfinite(sequence).all():
                raise ValueError(f"Speech sequence contains non-finite values for patient {row.patient_id}")
            return (
                torch.from_numpy(sequence),
                int(row.label_index),
                str(row.patient_id),
            )

    def collate(batch):
        sequences, labels, patients = zip(*batch)
        return (
            pad_sequence(sequences, batch_first=True, padding_value=0.0),
            torch.tensor(labels, dtype=torch.long),
            list(patients),
        )

    loaders = {
        "train": DataLoader(
            SequenceDataset(train_idx), batch_size=args.batch_size, shuffle=True, collate_fn=collate
        ),
        "val": DataLoader(
            SequenceDataset(val_idx), batch_size=args.batch_size, shuffle=False, collate_fn=collate
        ),
        "test": DataLoader(
            SequenceDataset(test_idx), batch_size=args.batch_size, shuffle=False, collate_fn=collate
        ),
        "all": DataLoader(
            SequenceDataset(frame.index.to_numpy()),
            batch_size=args.batch_size,
            shuffle=False,
            collate_fn=collate,
        ),
    }
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = SpeechBiLSTMAttention(
        input_dim=input_dim,
        hidden_dim=args.hidden_dim,
        embedding_dim=args.embedding_dim,
        num_classes=len(class_labels),
        num_heads=args.heads,
        max_frames=args.max_frames,
    ).to(device)
    train_labels = frame.loc[train_idx, "label_index"].to_numpy()
    counts = np.bincount(train_labels, minlength=len(class_labels))
    weights = counts.sum() / np.maximum(counts, 1)
    weights = weights / weights.mean()
    # With batch size 1, CrossEntropyLoss's default weighted mean divides by
    # the sole sample's class weight and cancels it. Apply the class weight
    # before an ordinary batch mean so training is balanced at any batch size.
    criterion = nn.CrossEntropyLoss(
        weight=torch.tensor(weights, dtype=torch.float32, device=device),
        reduction="none",
    )
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=1e-4)

    def evaluate(loader, return_embeddings=False):
        model.eval()
        rows = []
        with torch.inference_mode():
            for sequences, labels, patients in loader:
                logits, embeddings = model(sequences.to(device))
                probabilities = torch.softmax(logits, dim=1).cpu().numpy()
                for index, patient in enumerate(patients):
                    rows.append(
                        {
                            "patient_id": patient,
                            "label": int(labels[index]),
                            "probabilities": probabilities[index],
                            "embedding": embeddings[index].cpu().numpy(),
                        }
                    )
        grouped = []
        for patient_id, items in pd.DataFrame(rows).groupby("patient_id"):
            labels = items["label"].unique()
            if len(labels) != 1:
                raise ValueError(f"Patient {patient_id} has conflicting speech labels")
            grouped.append(
                {
                    "patient_id": patient_id,
                    "label": int(labels[0]),
                    "probabilities": np.stack(items["probabilities"]).mean(axis=0),
                    "embedding": np.stack(items["embedding"]).mean(axis=0),
                }
            )
        metrics = classification_metrics(
            [item["label"] for item in grouped],
            np.stack([item["probabilities"] for item in grouped]),
            class_labels,
        )
        return (metrics, grouped) if return_embeddings else metrics

    best_state = None
    best_score = -1.0
    wait = 0
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        running_loss = 0.0
        for sequences, labels, _ in loaders["train"]:
            optimizer.zero_grad(set_to_none=True)
            if args.train_frame_mask:
                # Preserve padded rows so the sequence model can still infer lengths.
                valid_frames = sequences.abs().sum(dim=-1).ne(0)
                mask = (torch.rand(valid_frames.shape) < args.train_frame_mask) & valid_frames
                sequences = torch.where(mask.unsqueeze(-1),
                                        torch.randn_like(sequences) * 0.01, sequences)
            logits, _ = model(sequences.to(device))
            loss = criterion(logits, labels.to(device)).mean()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
            running_loss += float(loss.detach().cpu()) * labels.size(0)
        val_metrics = evaluate(loaders["val"])
        epoch_row = {
            "epoch": epoch,
            "train_loss": running_loss / len(loaders["train"].dataset),
            "val_macro_f1": val_metrics["macro_f1"],
            "val_accuracy": val_metrics["accuracy"],
        }
        history.append(epoch_row)
        print(epoch_row)
        if val_metrics["macro_f1"] > best_score + 1e-5:
            best_score = val_metrics["macro_f1"]
            best_state = copy.deepcopy(model.state_dict())
            wait = 0
        else:
            wait += 1
            if wait >= args.patience:
                break

    if best_state is None:
        raise RuntimeError("Speech training did not produce a checkpoint.")
    model.load_state_dict(best_state)
    if args.validation_only:
        print({"validation_only": True, "best_epoch": history[int(np.argmax(
            [row["val_macro_f1"] for row in history]))]["epoch"],
               "validation": evaluate(loaders["val"]),
               "artifact_exported": False})
        return
    test_metrics, _ = evaluate(loaders["test"], return_embeddings=True)
    if (test_metrics["macro_f1"] < args.min_test_macro_f1 or
            test_metrics["per_class"]["Dementia"]["recall"] < args.min_dementia_recall):
        raise RuntimeError("Held-out speech model failed the predeclared release criteria; no artifact was exported. "
                           f"Metrics: {test_metrics}")
    _, all_rows = evaluate(loaders["all"], return_embeddings=True)
    output = Path(args.output_dir)
    output.mkdir(parents=True, exist_ok=True)
    model = model.cpu().eval()
    scripted = torch.jit.script(model)
    artifact = output / "neuromind_speech_bilstm_attention.pt"
    scripted.save(str(artifact))
    manifest = {
        "name": "neuromind-speech-bilstm-attention",
        "version": "2.1.0",
        "framework": "torchscript",
        "task": "speech_sequence_encoder",
        "sequence_input": True,
        "input_dim": input_dim,
        "embedding_dim": args.embedding_dim,
        "class_labels": class_labels,
        "output_type": "logits",
        "wav2vec_model": args.wav2vec_model,
        "patient_level_split": True,
        "artifact_sha256": sha256(artifact),
        "test_metrics": test_metrics,
        "release_criteria": {"min_test_macro_f1": args.min_test_macro_f1,
                             "min_dementia_recall": args.min_dementia_recall},
        "train_frame_mask": args.train_frame_mask,
        "max_frames": args.max_frames,
    }
    write_json(f"{artifact}.manifest.json", manifest)
    write_json(output / "speech_training_history.json", history)
    write_json(output / "speech_test_metrics.json", test_metrics)
    split_by_patient = {}
    for split_name, indices in (("train", train_idx), ("validation", val_idx), ("test", test_idx)):
        for patient in frame.loc[indices, "patient_id"].unique():
            split_by_patient[str(patient)] = split_name
    embedding_rows = []
    for item in all_rows:
        row = {"patient_id": item["patient_id"], "label": class_labels[item["label"]]}
        row["split"] = split_by_patient[str(item["patient_id"])]
        row.update({f"speech_embedding_{i}": float(v) for i, v in enumerate(item["embedding"])})
        embedding_rows.append(row)
    embeddings_csv = output / "speech_patient_embeddings.csv"
    pd.DataFrame(embedding_rows).to_csv(embeddings_csv, index=False)
    write_json(f"{embeddings_csv}.manifest.json", {
        "speech_artifact_sha256": manifest["artifact_sha256"],
        "embedding_dim": args.embedding_dim,
        "csv_sha256": sha256(embeddings_csv),
    })
    print({"artifact": str(artifact), "test": test_metrics})


if __name__ == "__main__":
    main()
