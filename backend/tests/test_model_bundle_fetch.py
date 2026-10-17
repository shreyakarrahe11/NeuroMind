import hashlib
import json
import zipfile
from pathlib import Path

import pytest

from scripts.fetch_model_bundle import BundleError, safe_extract_bundle, validate_bundle_root


TABULAR_FEATURES = [
    "memory_score", "immediate_recall", "delayed_recall", "recognition_score",
    "attention_score", "digit_span", "reaction_time_ms", "sustained_attention_score",
    "sleep_hours", "sleep_quality", "exercise_hours_week", "smoking", "alcohol_use",
    "medical_history", "lifestyle_score",
]


def _write_json(path: Path, payload: dict):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload), encoding="utf-8")


def _sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _valid_bundle(root: Path):
    speech_dir = root / "speech"
    fusion_dir = root / "multimodal"
    backbone = speech_dir / "wav2vec2_backbone"
    backbone.mkdir(parents=True)

    speech = speech_dir / "neuromind_speech_bilstm_attention.pt"
    speech.write_bytes(b"test-speech-torchscript-placeholder")
    speech_manifest = {
        "task": "speech_sequence_encoder",
        "sequence_input": True,
        "input_dim": 768,
        "embedding_dim": 128,
        "wav2vec_model": "facebook/wav2vec2-base-960h",
        "class_labels": ["Non-Dementia", "Dementia"],
        "artifact_sha256": _sha(speech),
    }
    _write_json(Path(f"{speech}.manifest.json"), speech_manifest)

    _write_json(backbone / "config.json", {"hidden_size": 768})
    _write_json(backbone / "neuromind_backbone.json", {"source_model": "facebook/wav2vec2-base-960h"})
    _write_json(backbone / "preprocessor_config.json", {"feature_size": 1})
    _write_json(backbone / "tokenizer_config.json", {"tokenizer_class": "Wav2Vec2CTCTokenizer"})
    _write_json(backbone / "vocab.json", {"<pad>": 0, "<unk>": 1})
    (backbone / "model.safetensors").write_bytes(b"test-backbone-weight-placeholder")

    fusion = fusion_dir / "neuromind_multimodal_transformer_binary.pt"
    fusion_dir.mkdir(parents=True, exist_ok=True)
    fusion.write_bytes(b"test-fusion-torchscript-placeholder")
    features = [f"speech_embedding_{i}" for i in range(128)] + TABULAR_FEATURES
    fusion_manifest = {
        "task": "binary_multimodal_screening",
        "speech_embedding_dim": 128,
        "speech_artifact_sha256": speech_manifest["artifact_sha256"],
        "input_features": features,
        "class_labels": ["Non-Dementia", "Dementia"],
        "background_values": [0.0] * len(features),
        "artifact_sha256": _sha(fusion),
    }
    _write_json(Path(f"{fusion}.manifest.json"), fusion_manifest)
    return speech, fusion


def test_valid_bundle_root_checks_artifact_and_cross_model_contract(tmp_path):
    _valid_bundle(tmp_path)
    result = validate_bundle_root(tmp_path)
    assert len(result["speech_sha256"]) == 64
    assert result["speech_embedding_dim"] == 128
    assert result["fusion_feature_count"] == 143


def test_bundle_rejects_wrong_fusion_speech_lineage(tmp_path):
    _valid_bundle(tmp_path)
    fusion_manifest_path = tmp_path / "multimodal/neuromind_multimodal_transformer_binary.pt.manifest.json"
    data = json.loads(fusion_manifest_path.read_text(encoding="utf-8"))
    data["speech_artifact_sha256"] = "0" * 64
    fusion_manifest_path.write_text(json.dumps(data), encoding="utf-8")
    with pytest.raises(BundleError, match="exact speech artifact"):
        validate_bundle_root(tmp_path)


def test_safe_extract_rejects_path_traversal(tmp_path):
    archive_path = tmp_path / "bad.zip"
    with zipfile.ZipFile(archive_path, "w") as archive:
        archive.writestr("../escape.txt", "no")
    with pytest.raises(BundleError, match="path traversal"):
        safe_extract_bundle(archive_path, tmp_path / "extracted")
