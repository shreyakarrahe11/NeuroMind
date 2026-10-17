from sqlalchemy import select, update

from ..models.entities import ModelArtifact


def register_model_artifact(db, adapter) -> ModelArtifact:
    manifest = dict(adapter.manifest or {})
    checksum = str(manifest.get("artifact_sha256") or "").strip()
    if len(checksum) != 64:
        raise ValueError("Model manifest must contain a valid artifact_sha256 checksum.")
    existing = db.scalar(
        select(ModelArtifact).where(ModelArtifact.checksum_sha256 == checksum)
    )
    if existing:
        if not existing.is_active:
            existing.is_active = True
        return existing

    task = str(manifest.get("task") or adapter.name)
    db.execute(
        update(ModelArtifact)
        .where(ModelArtifact.task == task, ModelArtifact.is_active.is_(True))
        .values(is_active=False)
    )
    artifact = ModelArtifact(
        name=str(manifest.get("name") or adapter.name),
        version=str(manifest.get("version") or "unknown"),
        task=task,
        framework=str(manifest.get("framework") or "unknown"),
        artifact_path=str(adapter.path),
        checksum_sha256=checksum,
        input_features_json=list(manifest.get("input_features") or []),
        class_labels_json=list(manifest.get("class_labels") or []),
        metrics_json=dict(manifest.get("test_metrics") or {}),
        manifest_json=manifest,
        is_active=True,
    )
    db.add(artifact)
    db.flush()
    return artifact

