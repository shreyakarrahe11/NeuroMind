from fastapi import BackgroundTasks

from ..ai.pipeline import AIPipeline
from ..ai.speech_processing import process_speech_assessment
from ..core.config import settings
from ..core.database import SessionLocal


def _use_celery() -> bool:
    return settings.task_queue_mode.strip().lower() == "celery"


def dispatch_speech(background_tasks: BackgroundTasks, speech_assessment_id, audio_path: str) -> str:
    if _use_celery():
        from ..tasks.jobs import process_speech_task

        process_speech_task.delay(str(speech_assessment_id), audio_path)
        return "celery"
    background_tasks.add_task(process_speech_assessment, speech_assessment_id, audio_path)
    return "background"


def _run_pipeline(session_id, run_id):
    db = SessionLocal()
    try:
        AIPipeline(db).run(session_id, run_id)
    finally:
        db.close()


def dispatch_pipeline(background_tasks: BackgroundTasks, session_id, run_id) -> str:
    if _use_celery():
        from ..tasks.jobs import run_assessment_pipeline_task

        run_assessment_pipeline_task.delay(str(session_id), str(run_id))
        return "celery"
    background_tasks.add_task(_run_pipeline, session_id, run_id)
    return "background"


def task_queue_ready() -> bool:
    if not _use_celery():
        return True
    try:
        from redis import Redis

        return bool(Redis.from_url(settings.redis_url, socket_connect_timeout=1, socket_timeout=1).ping())
    except Exception:
        return False
