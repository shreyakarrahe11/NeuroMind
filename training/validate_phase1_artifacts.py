from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import numpy as np
from training.common import sha256


TABULAR_FEATURES = [
    "memory_score", "immediate_recall", "delayed_recall", "recognition_score",
    "attention_score", "digit_span", "reaction_time_ms", "sustained_attention_score",
    "sleep_hours", "sleep_quality", "exercise_hours_week", "smoking", "alcohol_use",
    "medical_history", "lifestyle_score",
]


def parse_args():
    parser = argparse.ArgumentParser()
    parser.add_argument("--speech-artifact", required=True)
    parser.add_argument("--fusion-artifact", required=True)
    return parser.parse_args()


def manifest(path: Path):
    return json.loads(Path(f"{path}.manifest.json").read_text(encoding="utf-8"))


def main():
    args = parse_args()
    import torch

    speech_path = Path(args.speech_artifact)
    fusion_path = Path(args.fusion_artifact)
    speech_manifest = manifest(speech_path)
    fusion_manifest = manifest(fusion_path)
    if speech_manifest.get("task") != "speech_sequence_encoder":
        raise AssertionError("Speech manifest task is invalid.")
    if fusion_manifest.get("task") != "binary_multimodal_screening":
        raise AssertionError("Fusion manifest task is invalid.")
    if speech_manifest.get("artifact_sha256") != sha256(speech_path):
        raise AssertionError("Speech artifact checksum does not match its manifest.")
    if fusion_manifest.get("artifact_sha256") != sha256(fusion_path):
        raise AssertionError("Fusion artifact checksum does not match its manifest.")
    if speech_manifest.get("class_labels") != ["Non-Dementia", "Dementia"]:
        raise AssertionError("Speech class labels must be Non-Dementia and Dementia.")
    if fusion_manifest.get("class_labels") != ["Non-Dementia", "Dementia"]:
        raise AssertionError("Fusion class labels must be Non-Dementia and Dementia.")
    speech_dim = int(speech_manifest["embedding_dim"])
    expected_features = [
        *[f"speech_embedding_{index}" for index in range(speech_dim)],
        *TABULAR_FEATURES,
    ]
    if fusion_manifest.get("input_features") != expected_features:
        raise AssertionError("Fusion feature order is incompatible with the speech and assessment contracts.")
    if int(fusion_manifest.get("speech_embedding_dim", -1)) != speech_dim:
        raise AssertionError("Fusion speech dimension does not match the speech encoder.")
    if fusion_manifest.get("speech_artifact_sha256") != speech_manifest["artifact_sha256"]:
        raise AssertionError("Fusion was trained with a different speech encoder.")
    speech = torch.jit.load(str(speech_path), map_location="cpu").eval()
    fusion = torch.jit.load(str(fusion_path), map_location="cpu").eval()
    with torch.inference_mode():
        speech_logits, speech_embedding = speech(
            torch.randn(1, 80, int(speech_manifest["input_dim"]))
        )
        fusion_logits = fusion(
            torch.randn(1, len(fusion_manifest["input_features"]))
        )
    if speech_embedding.shape[-1] != int(speech_manifest["embedding_dim"]):
        raise AssertionError("Speech embedding dimension does not match its manifest.")
    if speech_logits.shape[-1] != len(speech_manifest["class_labels"]):
        raise AssertionError("Speech output classes do not match its manifest.")
    if fusion_logits.shape[-1] != 2:
        raise AssertionError("Fusion artifact does not return two class logits.")
    probabilities = torch.softmax(fusion_logits, dim=1).numpy()[0]
    if not np.isclose(probabilities.sum(), 1.0, atol=1e-5):
        raise AssertionError("Fusion probabilities do not sum to one.")
    print(
        {
            "speechEmbeddingShape": list(speech_embedding.shape),
            "fusionClasses": fusion_manifest["class_labels"],
            "fusionProbabilitySum": float(probabilities.sum()),
            "status": "READY",
        }
    )


if __name__ == "__main__":
    main()
