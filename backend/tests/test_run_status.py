from datetime import datetime, timezone
from types import SimpleNamespace

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.api.v1.ai import status
from app.core.database import Base
from app.models.entities import (
    AssessmentSession, JobStatus, ModelRun, PatientProfile, Prediction, User, UserRole,
)


def test_status_does_not_return_previous_prediction_for_queued_run():
    engine = create_engine("sqlite+pysqlite:///:memory:")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        user = User(email="patient@example.org", role=UserRole.PATIENT)
        db.add(user)
        db.flush()
        patient = PatientProfile(user_id=user.id)
        db.add(patient)
        db.flush()
        assessment = AssessmentSession(patient_id=patient.id)
        db.add(assessment)
        db.flush()
        old_run = ModelRun(session_id=assessment.id, model_name="fusion", status=JobStatus.COMPLETED,
                           started_at=datetime.now(timezone.utc))
        db.add(old_run)
        db.flush()
        db.add(Prediction(session_id=assessment.id, model_run_id=old_run.id,
                          prediction_label="Dementia", risk_level="HIGH", probability=0.8))
        new_run = ModelRun(session_id=assessment.id, model_name="fusion", status=JobStatus.QUEUED,
                           started_at=datetime.now(timezone.utc))
        db.add(new_run)
        db.flush()

        admin = SimpleNamespace(role=UserRole.ADMIN)
        current = status(str(assessment.id), runId=str(new_run.id), user=admin, db=db)
        assert current["status"] == JobStatus.QUEUED
        assert current["prediction"] is None
        previous = status(str(assessment.id), runId=str(old_run.id), user=admin, db=db)
        assert previous["prediction"]["prediction"] == "Dementia"
