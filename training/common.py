from __future__ import annotations

import hashlib
import json
import random
from pathlib import Path

import numpy as np


CLASS_LABELS = ["Non-Dementia", "Dementia"]


def seed_everything(seed: int) -> None:
    random.seed(seed)
    np.random.seed(seed)
    try:
        import torch

        torch.manual_seed(seed)
        torch.cuda.manual_seed_all(seed)
        torch.use_deterministic_algorithms(False)
    except ImportError:
        pass


def canonical_label(value, mapping: dict[str, str] | None = None) -> str:
    text = str(value).strip()
    if mapping and text in mapping:
        text = mapping[text]
    normalized = text.lower().replace("_", "-").strip()
    aliases = {
        "healthy": "Non-Dementia",
        "control": "Non-Dementia",
        "non-dementia": "Non-Dementia",
        "non dementia": "Non-Dementia",
        "dementia": "Dementia",
        "ad": "Dementia",
        "alzheimers": "Dementia",
        "alzheimer's": "Dementia",
    }
    return aliases.get(normalized, text)


def load_label_map(path: str | None) -> dict[str, str]:
    if not path:
        return {}
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError("Label map must be a JSON object.")
    return {str(key): str(value) for key, value in data.items()}


def patient_split(frame, group_column: str, label_column: str, seed: int = 42):
    """Return leak-free train/validation/test row indices (80/10/10)."""
    from sklearn.model_selection import train_test_split

    patient_labels = frame[[group_column, label_column]].drop_duplicates()
    conflicts = patient_labels.groupby(group_column)[label_column].nunique()
    conflicts = conflicts[conflicts > 1]
    if not conflicts.empty:
        raise ValueError(f"Patients with conflicting labels: {conflicts.index.tolist()[:10]}")

    patients = patient_labels[group_column].to_numpy()
    labels = patient_labels[label_column].to_numpy()
    try:
        train_patients, holdout_patients = train_test_split(
            patients, test_size=0.20, random_state=seed, stratify=labels
        )
        holdout_labels = patient_labels.set_index(group_column).loc[holdout_patients, label_column]
        val_patients, test_patients = train_test_split(
            holdout_patients,
            test_size=0.50,
            random_state=seed,
            stratify=holdout_labels,
        )
    except ValueError as exc:
        raise ValueError(
            "Patient-level stratification failed. Every class needs enough distinct patients "
            "for train, validation and test splits."
        ) from exc

    sets = [set(train_patients), set(val_patients), set(test_patients)]
    if sets[0] & sets[1] or sets[0] & sets[2] or sets[1] & sets[2]:
        raise AssertionError("Patient leakage detected while creating splits.")
    return tuple(frame.index[frame[group_column].isin(values)].to_numpy() for values in sets)


def classification_metrics(y_true, probabilities, class_labels: list[str]):
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        precision_recall_fscore_support,
        roc_auc_score,
    )

    y_true = np.asarray(y_true, dtype=int)
    probabilities = np.asarray(probabilities, dtype=float)
    y_pred = probabilities.argmax(axis=1)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true,
        y_pred,
        labels=list(range(len(class_labels))),
        zero_division=0,
    )
    result = {
        "accuracy": float(accuracy_score(y_true, y_pred)),
        "macro_precision": float(np.mean(precision)),
        "macro_recall": float(np.mean(recall)),
        "macro_f1": float(np.mean(f1)),
        "per_class": {
            label: {
                "precision": float(precision[index]),
                "recall": float(recall[index]),
                "f1": float(f1[index]),
                "support": int(support[index]),
            }
            for index, label in enumerate(class_labels)
        },
        "confusion_matrix": confusion_matrix(
            y_true, y_pred, labels=list(range(len(class_labels)))
        ).tolist(),
    }
    try:
        if len(class_labels) == 2:
            result["roc_auc"] = float(roc_auc_score(y_true, probabilities[:, 1]))
        else:
            result["roc_auc_ovr_macro"] = float(
                roc_auc_score(y_true, probabilities, multi_class="ovr", average="macro")
            )
    except ValueError:
        result["roc_auc"] = None
    return result


def write_json(path: str | Path, value) -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2), encoding="utf-8")


def sha256(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()
