from uuid import UUID

from .celery_app import celery_app
from ..ai.pipeline import AIPipeline
from ..ai.speech_processing import process_speech_assessment
from ..core.database import SessionLocal


@celery_app.task(name="neuromind.process_speech")
def process_speech_task(speech_assessment_id: str, audio_path: str):
    process_speech_assessment(UUID(speech_assessment_id), audio_path)


@celery_app.task(name="neuromind.run_assessment_pipeline")
def run_assessment_pipeline_task(session_id: str, run_id: str):
    db = SessionLocal()
    try:
        AIPipeline(db).run(UUID(session_id), UUID(run_id))
    finally:
        db.close()
