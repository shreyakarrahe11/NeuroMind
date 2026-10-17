from pathlib import Path

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.database import Base
from app.models.entities import ModelArtifact
from app.services.model_artifact_service import register_model_artifact


class Adapter:
    name = "multimodal"

    def __init__(self, checksum: str, version: str):
        self.path = Path(f"/models/fusion-{version}.pt")
        self.manifest = {
            "name": "neuromind-fusion",
            "version": version,
            "task": "binary_multimodal_screening",
            "framework": "torchscript",
            "artifact_sha256": checksum,
            "input_features": ["speech_embedding_0", "memory_score"],
            "class_labels": ["Non-Dementia", "Dementia"],
            "test_metrics": {"macro_f1": 0.8},
        }


def test_registry_is_idempotent_and_activates_latest_version():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        first = register_model_artifact(db, Adapter("a" * 64, "1.0.0"))
        db.commit()
        same = register_model_artifact(db, Adapter("a" * 64, "1.0.0"))
        assert same.id == first.id
        second = register_model_artifact(db, Adapter("b" * 64, "2.0.0"))
        db.commit()
        rows = db.scalars(select(ModelArtifact).order_by(ModelArtifact.version)).all()
        assert [row.is_active for row in rows] == [False, True]
        assert second.class_labels_json == ["Non-Dementia", "Dementia"]
