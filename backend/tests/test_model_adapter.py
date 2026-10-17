from app.ai.models.generic import GenericModelAdapter
from hashlib import sha256


class BinaryModel:
    classes_ = [0, 1]
    feature_names_in_ = ["memory_score", "attention_score"]

    def predict_proba(self, values):
        return [[0.30, 0.70]]


def test_binary_mapping_uses_non_dementia_and_dementia(tmp_path):
    artifact = tmp_path / "fusion.joblib"
    artifact.write_bytes(b"test artifact")
    artifact.with_name("fusion.joblib.manifest.json").write_text(
        '{"input_features":["memory_score","attention_score"],'
        '"class_labels":["Non-Dementia","Dementia"],'
        '"artifact_sha256":"' + sha256(b"test artifact").hexdigest() + '"}',
        encoding="utf-8",
    )
    adapter = GenericModelAdapter(artifact)
    adapter.model = BinaryModel()

    result = adapter.predict({"memory_score": 60, "attention_score": 55})

    assert result["label"] == "Dementia"
    assert result["class_probabilities"] == {
        "Non-Dementia": 0.30,
        "Dementia": 0.70,
    }
    assert result["probability"] == 0.70


def test_manifest_feature_contract_rejects_missing_values(tmp_path):
    artifact = tmp_path / "fusion.joblib"
    artifact.write_bytes(b"test artifact")
    artifact.with_name("fusion.joblib.manifest.json").write_text(
        '{"input_features":["memory_score","speech_embedding_0"],"artifact_sha256":"'
        + sha256(b"test artifact").hexdigest()
        + '"}',
        encoding="utf-8",
    )
    adapter = GenericModelAdapter(artifact)
    adapter.model = BinaryModel()

    try:
        adapter.predict({"memory_score": 60})
        assert False, "missing manifest feature should fail"
    except ValueError as exc:
        assert "speech_embedding_0" in str(exc)
