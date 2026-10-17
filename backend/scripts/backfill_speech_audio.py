"""Copy pre-migration recordings to PostgreSQL. Run after Alembic upgrade.

    cd backend && python -m scripts.backfill_speech_audio

Idempotent: one short database transaction per recording. Missing/corrupt
objects are counted and never silently represented as stored recordings.
"""
import hashlib
from sqlalchemy import select

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.entities import SpeechAssessment, SpeechAudioBlob
from app.services.object_storage import object_storage

MEDIA_TYPES = {"wav": "audio/wav", "mp3": "audio/mpeg", "flac": "audio/flac", "m4a": "audio/mp4",
               "webm": "audio/webm", "ogg": "audio/ogg"}


def main():
    copied = 0
    failures = []
    with SessionLocal() as db:
        ids = db.scalars(select(SpeechAssessment.id).outerjoin(
            SpeechAudioBlob, SpeechAudioBlob.speech_assessment_id == SpeechAssessment.id
        ).where(SpeechAudioBlob.speech_assessment_id.is_(None)).order_by(SpeechAssessment.id)).all()
    for speech_id in ids:
        try:
            with SessionLocal() as db:
                speech = db.scalar(select(SpeechAssessment).where(SpeechAssessment.id == speech_id).with_for_update())
                if not speech or db.get(SpeechAudioBlob, speech_id):
                    continue
                with object_storage.local_path(speech.audio_file_path) as path:
                    if not path.is_file() or path.stat().st_size > settings.max_upload_mb * 1024 * 1024:
                        raise ValueError("Recording missing or exceeds upload limit")
                    data = path.read_bytes()
                if not data:
                    raise ValueError("Recording empty")
                db.add(SpeechAudioBlob(speech_assessment_id=speech.id, content=data, byte_size=len(data),
                                       sha256=hashlib.sha256(data).hexdigest(),
                                       content_type=MEDIA_TYPES.get(speech.audio_format, "application/octet-stream")))
                db.commit()
                copied += 1
        except Exception as exc:
            failures.append({"speechAssessmentId": str(speech_id), "error": type(exc).__name__})
    print({"backfilled": copied, "failed": failures})
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
