"""Validate and install final Phase 1 artifacts into the web project."""

from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

if __package__ in {None, ""}:
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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
    parser.add_argument("--wav2vec-backbone", required=True)
    parser.add_argument("--project-root", default=".")
    parser.add_argument("--update-env", action="store_true")
    return parser.parse_args()


def validate(artifact: Path, expected_task: str):
    manifest_path = Path(f"{artifact}.manifest.json")
    if not artifact.is_file() or not manifest_path.is_file():
        raise FileNotFoundError(f"Artifact or manifest is missing for {artifact}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    if manifest.get("task") != expected_task:
        raise ValueError(f"{artifact.name} has task={manifest.get('task')}, expected {expected_task}")
    expected_hash = manifest.get("artifact_sha256")
    actual_hash = sha256(artifact)
    if expected_hash != actual_hash:
        raise ValueError(f"SHA-256 mismatch for {artifact}")
    return manifest_path, manifest


def set_env_value(path: Path, key: str, value: str):
    lines = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    updated = []
    found = False
    for line in lines:
        if line.startswith(f"{key}="):
            updated.append(f"{key}={value}")
            found = True
        else:
            updated.append(line)
    if not found:
        updated.append(f"{key}={value}")
    path.write_text("\n".join(updated) + "\n", encoding="utf-8")


def install(source: Path, source_manifest: Path, destination: Path):
    destination.mkdir(parents=True, exist_ok=True)
    artifact_target = destination / source.name
    manifest_target = destination / source_manifest.name
    shutil.copy2(source, artifact_target)
    shutil.copy2(source_manifest, manifest_target)
    return artifact_target


def main():
    args = parse_args()
    root = Path(args.project_root).expanduser().resolve()
    speech = Path(args.speech_artifact).expanduser().resolve()
    fusion = Path(args.fusion_artifact).expanduser().resolve()
    backbone = Path(args.wav2vec_backbone).expanduser().resolve()
    speech_manifest, speech_metadata = validate(speech, "speech_sequence_encoder")
    fusion_manifest, fusion_metadata = validate(fusion, "binary_multimodal_screening")
    if speech_metadata.get("class_labels") != ["Non-Dementia", "Dementia"]:
        raise ValueError("Speech model must classify Non-Dementia and Dementia.")
    if fusion_metadata.get("class_labels") != ["Non-Dementia", "Dementia"]:
        raise ValueError("Fusion model must classify Non-Dementia and Dementia.")
    if not speech_metadata.get("sequence_input") or int(speech_metadata.get("embedding_dim", 0)) <= 0:
        raise ValueError("Speech manifest must declare sequence_input and a positive embedding_dim.")
    speech_dim = int(speech_metadata["embedding_dim"])
    expected_features = [
        *[f"speech_embedding_{index}" for index in range(speech_dim)],
        *TABULAR_FEATURES,
    ]
    if fusion_metadata.get("input_features") != expected_features:
        raise ValueError("Fusion input feature order does not match the live NeuroMind contract.")
    if int(fusion_metadata.get("speech_embedding_dim", -1)) != speech_dim:
        raise ValueError("Fusion and speech embedding dimensions do not match.")
    if fusion_metadata.get("speech_artifact_sha256") != speech_metadata["artifact_sha256"]:
        raise ValueError("Fusion was trained with a different speech encoder.")
    backbone_metadata_path = backbone / "neuromind_backbone.json"
    backbone_config_path = backbone / "config.json"
    if not backbone.is_dir() or not backbone_metadata_path.is_file() or not backbone_config_path.is_file():
        raise FileNotFoundError("Wav2Vec2 backbone directory is incomplete.")
    backbone_metadata = json.loads(backbone_metadata_path.read_text(encoding="utf-8"))
    backbone_config = json.loads(backbone_config_path.read_text(encoding="utf-8"))
    if backbone_metadata.get("source_model") != speech_metadata.get("wav2vec_model"):
        raise ValueError("Wav2Vec2 backbone source does not match the speech manifest.")
    if int(backbone_config.get("hidden_size", -1)) != int(speech_metadata.get("input_dim", -2)):
        raise ValueError("Wav2Vec2 hidden size does not match the speech encoder input.")

    speech_target = install(speech, speech_manifest, root / "ai_models" / "speech")
    fusion_target = install(fusion, fusion_manifest, root / "ai_models" / "multimodal")
    backbone_target = root / "ai_models" / "speech" / "wav2vec2_backbone"
    if backbone != backbone_target.resolve():
        shutil.copytree(backbone, backbone_target, dirs_exist_ok=True)
    if args.update_env:
        env = root / "backend" / ".env"
        if not env.exists():
            raise FileNotFoundError("backend/.env is missing; run npm run setup before --update-env.")
        # FastAPI starts with ``backend`` as its working directory. Relative
        # paths keep the installed ZIP portable between Colab, Windows and Linux.
        set_env_value(env, "SPEECH_MODEL_PATH", f"../ai_models/speech/{speech_target.name}")
        set_env_value(env, "MULTIMODAL_MODEL_PATH", f"../ai_models/multimodal/{fusion_target.name}")
        set_env_value(env, "WAV2VEC_MODEL_NAME", "../ai_models/speech/wav2vec2_backbone")
        set_env_value(env, "WAV2VEC_LOCAL_FILES_ONLY", "true")
    print({"speech": str(speech_target), "fusion": str(fusion_target), "wav2vecBackbone": str(backbone_target), "envUpdated": args.update_env})


if __name__ == "__main__":
    main()
