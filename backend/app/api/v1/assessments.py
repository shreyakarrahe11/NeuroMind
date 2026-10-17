from pathlib import Path
import uuid
import hashlib
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile, Response
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...models.entities import *
from ...schemas.common import AssessmentCreate, AssessmentUpdate, AttentionSubmission, LifestyleSubmission, MemorySubmission
from ...services.task_dispatcher import dispatch_speech
from ...services.object_storage import object_storage
from ...services.rate_limit import enforce_rate_limit
from ...services.audit_service import audit
from ...utils.serializers import assessment_out
from ...utils.memory_scoring import calculate_memory_scores
from ...ai.feature_contract import sustained_attention_score
from ...ai.models.speech_model import SpeechModelService
from ...utils.lifestyle_scoring import calculate_lifestyle_score

router = APIRouter(prefix="/assessments", tags=["Assessments"])


def _client_datetime(value):
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    except (TypeError, ValueError):
        return None


def _replace_events(db: Session, assessment, assessment_type: str, data: dict):
    """Normalize high-value interaction telemetry into queryable rows."""
    db.execute(delete(AssessmentEvent).where(
        AssessmentEvent.session_id == assessment.id,
        AssessmentEvent.assessment_type == assessment_type,
    ))
    events = []
    if assessment_type == "memory":
        events.append({
            "event_type": "SECTION_COMPLETED",
            "occurred_at": _client_datetime(data.get("completedAt")),
            "elapsed_ms": sum(float(x or 0) for x in (data.get("stepDurationsMs") or {}).values()),
            "payload": {
                "startedAt": data.get("startedAt"),
                "completedAt": data.get("completedAt"),
                "stepDurationsMs": data.get("stepDurationsMs") or {},
            },
        })
    elif assessment_type == "attention":
        for task_name in ("visualAttention", "audioAttention", "musicAttention", "videoAttention"):
            task = data.get(task_name)
            if not isinstance(task, dict):
                continue
            for item in task.get("rawResponses") or []:
                events.append({
                    "event_type": f"{task_name.upper()}_TARGET_CLICK",
                    "occurred_at": _client_datetime(item.get("occurredAt")),
                    "elapsed_ms": item.get("elapsedMs"),
                    "payload": item,
                })
        for item in data.get("reactionTimeTrials") or []:
            events.append({
                "event_type": "REACTION_TIME_TRIAL",
                "occurred_at": _client_datetime(item.get("occurredAt")),
                "elapsed_ms": item.get("reactionTimeMs"),
                "payload": item,
            })
        for item in data.get("digitSpanTrials") or []:
            events.append({
                "event_type": "DIGIT_SPAN_TRIAL",
                "occurred_at": _client_datetime(item.get("occurredAt")),
                "elapsed_ms": item.get("timeTakenMs"),
                "payload": item,
            })
        events.append({
            "event_type": "SECTION_COMPLETED",
            "occurred_at": _client_datetime(data.get("completedAt")),
            "elapsed_ms": data.get("totalDurationMs"),
            "payload": {"startedAt": data.get("startedAt"), "completedAt": data.get("completedAt")},
        })
    counters = {}
    for event in events:
        event_type = event["event_type"]
        sequence = counters.get(event_type, 0)
        counters[event_type] = sequence + 1
        db.add(AssessmentEvent(
            session_id=assessment.id,
            assessment_type=assessment_type,
            event_type=event_type,
            event_sequence=sequence,
            occurred_at=event.get("occurred_at"),
            elapsed_ms=event.get("elapsed_ms"),
            payload_json=event.get("payload") or {},
        ))


def patient_for_user(user, db):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise HTTPException(403, "Patient profile required")
    return patient


def get_session(aid, user, db):
    try:
        assessment_id = UUID(str(aid))
    except (TypeError, ValueError):
        raise HTTPException(400, "Invalid assessment id")

    assessment = db.get(AssessmentSession, assessment_id)
    if not assessment:
        raise HTTPException(404, "Assessment not found")

    if user.role == UserRole.PATIENT:
        patient = patient_for_user(user, db)
        if assessment.patient_id != patient.id:
            raise HTTPException(403, "Not your assessment")
    elif user.role == UserRole.DOCTOR:
        doctor = user.doctor_profile
        if not doctor:
            raise HTTPException(403, "Doctor profile required")
        allowed = db.scalar(select(ReportShare).join(Report, ReportShare.report_id == Report.id).where(
            ReportShare.doctor_id == doctor.id, ReportShare.revoked_at.is_(None), Report.session_id == assessment.id))
        if not allowed:
            raise HTTPException(403, "Patient has not shared this assessment report with you")
    elif user.role != UserRole.ADMIN:
        raise HTTPException(403, "Insufficient permissions")

    return assessment


@router.post("")
def create(data: AssessmentCreate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    patient = patient_for_user(user, db)
    assessment = AssessmentSession(
        patient_id=patient.id,
        status=AssessmentStatus.IN_PROGRESS,
        current_step="overview",
    )
    db.add(assessment)
    db.commit()
    db.refresh(assessment)
    return {
        "sessionId": str(assessment.id),
        "createdAt": assessment.created_at.isoformat(),
        "updatedAt": assessment.updated_at.isoformat(),
        "patientInfo": data.patientInfo or {},
        "patientId": str(patient.user_id),
        "status": {"speech": False, "memory": False, "attention": False, "lifestyle": False},
    }


@router.get("/{assessment_id}")
def get_one(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    return assessment_out(get_session(assessment_id, user, db), db)


@router.put("/{assessment_id}")
def update(assessment_id: str, data: AssessmentUpdate, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    assessment = get_session(assessment_id, user, db)
    values = data.model_dump(exclude_unset=True)
    if "currentStep" in values:
        assessment.current_step = values["currentStep"]
    if "status" in values:
        assessment.status = values["status"]
    db.commit()
    return assessment_out(assessment, db)


@router.post("/{assessment_id}/complete")
def complete(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    assessment = get_session(assessment_id, user, db)
    sections = {
        "speech": assessment.speech,
        "memory": assessment.memory,
        "attention": assessment.attention,
        "lifestyle": assessment.lifestyle,
    }
    missing = [name for name, value in sections.items() if value is None]
    if missing:
        raise HTTPException(409, f"Complete these assessment sections first: {', '.join(missing)}")
    if assessment.speech.feature_extraction_status != "COMPLETED":
        status = assessment.speech.feature_extraction_status
        if status == "ACOUSTIC_ONLY":
            raise HTTPException(409, "The trained speech model is not configured; deep speech features are required before analysis.")
        raise HTTPException(409, f"Speech feature extraction is not complete (status: {status}).")
    speech_model = SpeechModelService()
    if (speech_model.status().value != "READY"
            or assessment.speech.speech_artifact_sha256 != speech_model.manifest.get("artifact_sha256")):
        raise HTTPException(409, "Speech features were extracted with an older model. Reupload the recording before analysis.")
    assessment.status = AssessmentStatus.COMPLETED
    assessment.completed_at = datetime.now(timezone.utc)
    db.commit()
    return {"success": True, "status": assessment.status}


@router.get("/{assessment_id}/status")
def status(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    assessment = get_session(assessment_id, user, db)
    return {
        "assessmentId": str(assessment.id),
        "status": assessment.status,
        "currentStep": assessment.current_step,
        "modelStatus": [
            {"model": r.model_name, "status": r.status, "message": r.error_message}
            for r in assessment.model_runs
        ],
    }


@router.post("/{assessment_id}/memory")
def memory(assessment_id: str, payload: MemorySubmission, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    assessment = get_session(assessment_id, user, db)
    data = payload.memoryData.model_dump()
    memory_row = assessment.memory or MemoryAssessment(session_id=assessment.id)
    memory_row.raw_response_json = data
    metrics = payload.memoryData.rawMetrics
    scores = calculate_memory_scores(
        immediate_recall=metrics.immediateRecallCount,
        delayed_recall=metrics.delayedRecallCount,
        recognition_true_positives=metrics.recognitionTruePositives,
        recognition_false_positives=metrics.recognitionFalsePositives,
        recognition_total_correct=metrics.recognitionTotalCorrect,
    )
    memory_row.immediate_recall = scores.immediate_recall
    memory_row.delayed_recall = scores.delayed_recall
    memory_row.recognition_score = scores.recognition_accuracy
    memory_row.memory_score = scores.memory_score
    _replace_events(db, assessment, "memory", data)
    if assessment.memory is None:
        db.add(memory_row)
    assessment.current_step = "memory"
    db.commit()
    db.refresh(memory_row)
    return {
        "success": True,
        "memoryScore": memory_row.memory_score,
        "immediateRecallScore": memory_row.immediate_recall,
        "delayedRecallScore": memory_row.delayed_recall,
        "recognitionScore": memory_row.recognition_score,
    }


@router.get("/{assessment_id}/memory")
def get_memory(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    assessment = get_session(assessment_id, user, db)
    return assessment.memory.raw_response_json if assessment.memory else {}


@router.post("/{assessment_id}/attention")
def attention(assessment_id: str, payload: AttentionSubmission, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    assessment = get_session(assessment_id, user, db)
    data = payload.attentionData.model_dump()
    row = assessment.attention or AttentionAssessment(session_id=assessment.id)
    row.raw_response_json = data
    row.reaction_time = (
        data.get("reactionTimeMedianMs")
        or data.get("reactionTimeMeanMs")
        or data.get("reactionTimeMs")
    )
    media_tasks = [
        value
        for key in ("visualAttention", "audioAttention", "musicAttention", "videoAttention")
        if isinstance((value := data.get(key)), dict)
    ]
    if not media_tasks and isinstance(data.get("sustainedAttention"), dict):
        media_tasks = [data["sustainedAttention"]]
    row.accuracy = sustained_attention_score(data)
    row.errors = sum(
        int(task.get("misses", 0) or 0) + int(task.get("falseAlarms", 0) or 0)
        for task in media_tasks
    )
    row.attention_score = data.get("attentionScore")
    if row.attention_score is None:
        digit_score = min(
            100.0,
            float(data.get("digitSpanMaxScore") or data.get("digitSpan") or 0) / 9.0 * 100.0,
        )
        available = [value for value in (digit_score, row.accuracy) if value is not None]
        row.attention_score = sum(available) / len(available) if available else None
    media_reaction_times = [
        float(task.get("meanResponseTimeMs"))
        for task in media_tasks
        if task.get("meanResponseTimeMs") is not None
    ]
    row.completion_time = (
        sum(media_reaction_times) / len(media_reaction_times) if media_reaction_times else None
    )
    _replace_events(db, assessment, "attention", data)
    if assessment.attention is None:
        db.add(row)
    assessment.current_step = "attention"
    db.commit()
    return {"success": True, "attentionScore": row.attention_score or 0}


@router.get("/{assessment_id}/attention")
def get_attention(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    assessment = get_session(assessment_id, user, db)
    return assessment.attention.raw_response_json if assessment.attention else {}


@router.get("/{assessment_id}/events")
def get_events(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    assessment = get_session(assessment_id, user, db)
    rows = db.scalars(
        select(AssessmentEvent)
        .where(AssessmentEvent.session_id == assessment.id)
        .order_by(AssessmentEvent.created_at, AssessmentEvent.event_sequence)
    ).all()
    return [
        {
            "id": str(row.id),
            "assessmentType": row.assessment_type,
            "eventType": row.event_type,
            "sequence": row.event_sequence,
            "occurredAt": row.occurred_at.isoformat() if row.occurred_at else None,
            "elapsedMs": row.elapsed_ms,
            "payload": row.payload_json,
        }
        for row in rows
    ]


@router.get("/{assessment_id}/clinical-data")
def clinical_data(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Return the complete authorized assessment record without exposing server paths."""
    assessment = get_session(assessment_id, user, db)
    speech_row = assessment.speech
    return {
        "assessmentId": str(assessment.id),
        "status": assessment.status,
        "currentStep": assessment.current_step,
        "startedAt": assessment.started_at.isoformat(),
        "completedAt": assessment.completed_at.isoformat() if assessment.completed_at else None,
        "speech": None if not speech_row else {
            "originalFilename": speech_row.original_filename,
            "format": speech_row.audio_format,
            "promptId": speech_row.prompt_id,
            "promptType": speech_row.prompt_type,
            "durationSeconds": speech_row.duration_seconds,
            "sampleRate": speech_row.sample_rate,
            "recording": None if not speech_row.audio_blob else {
                "storedInPostgres": True,
                "byteSize": speech_row.audio_blob.byte_size,
                "sha256": speech_row.audio_blob.sha256,
                "contentType": speech_row.audio_blob.content_type,
                "downloadPath": f"/assessments/{assessment.id}/speech/audio",
            },
            "processing": {
                "preprocessing": speech_row.preprocessing_status,
                "features": speech_row.feature_extraction_status,
                "transcription": speech_row.transcription_status,
                "errorCode": speech_row.processing_error_code,
            },
            "features": [
                {"name": item.feature_name, "value": item.feature_value, "group": item.feature_group}
                for item in speech_row.features
            ],
            "transcription": None if not speech_row.transcription else {
                "text": speech_row.transcription.transcript,
                "language": speech_row.transcription.language,
                "model": speech_row.transcription.model_name,
                "confidence": speech_row.transcription.confidence_score,
            },
        },
        "memory": None if not assessment.memory else {
            "answers": assessment.memory.raw_response_json,
            "memoryScore": assessment.memory.memory_score,
            "immediateRecall": assessment.memory.immediate_recall,
            "delayedRecall": assessment.memory.delayed_recall,
            "recognitionScore": assessment.memory.recognition_score,
        },
        "attention": None if not assessment.attention else {
            "answers": assessment.attention.raw_response_json,
            "attentionScore": assessment.attention.attention_score,
            "reactionTime": assessment.attention.reaction_time,
            "accuracy": assessment.attention.accuracy,
            "errors": assessment.attention.errors,
        },
        "lifestyle": None if not assessment.lifestyle else {
            "answers": assessment.lifestyle.responses_json,
            "overallScore": assessment.lifestyle.overall_lifestyle_score,
        },
        "events": get_events(assessment_id, user, db),
        "modelRuns": [
            {
                "id": str(row.id),
                "model": row.model_name,
                "version": row.model_version,
                "status": row.status,
                "startedAt": row.started_at.isoformat() if row.started_at else None,
                "completedAt": row.completed_at.isoformat() if row.completed_at else None,
                "error": row.error_message,
            }
            for row in assessment.model_runs
        ],
    }


@router.get("/{assessment_id}/speech/audio")
def download_speech_audio(assessment_id: str, request: Request, user=Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_rate_limit(request, "speech-download", actor=user.id, limit=30, window_seconds=3600)
    assessment = get_session(assessment_id, user, db)
    if not assessment.speech or not assessment.speech.audio_blob:
        raise HTTPException(404, "Stored recording not found")
    blob = assessment.speech.audio_blob
    content = blob.content
    if hashlib.sha256(content).hexdigest() != blob.sha256:
        raise HTTPException(503, "Stored recording failed integrity verification")
    audit(db, user, "SPEECH_AUDIO_DOWNLOADED", "SpeechAssessment", assessment.speech.id,
          {"assessment_id": str(assessment.id)})
    db.commit()
    return Response(content=content, media_type=blob.content_type, headers={
        "Content-Disposition": f'attachment; filename="speech-{assessment.id}.{assessment.speech.audio_format}"',
        "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff",
    })


@router.post("/{assessment_id}/lifestyle")
def lifestyle(assessment_id: str, payload: LifestyleSubmission, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    assessment = get_session(assessment_id, user, db)
    data = payload.lifestyleData.model_dump()
    row = assessment.lifestyle or LifestyleAssessment(session_id=assessment.id)
    row.responses_json = data
    row.sleep_score = data.get("sleepScore")
    row.physical_activity_score = data.get("physicalActivityScore")
    row.social_activity_score = data.get("socialActivityScore")
    row.diet_score = data.get("dietScore")
    row.smoking_status = str(data.get("smoking", data.get("smokingStatus", "")))
    row.alcohol_status = str(data.get("alcoholUse", data.get("alcoholStatus", "")))
    row.stress_score = data.get("stressScore")
    row.overall_lifestyle_score = data.get("overallLifestyleScore")
    if row.overall_lifestyle_score is None:
        row.overall_lifestyle_score = calculate_lifestyle_score(data)
    if assessment.lifestyle is None:
        db.add(row)
    assessment.current_step = "lifestyle"
    db.commit()
    return {"success": True, "lifestyleScore": row.overall_lifestyle_score}


@router.get("/{assessment_id}/lifestyle")
def get_lifestyle(assessment_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    assessment = get_session(assessment_id, user, db)
    return assessment.lifestyle.responses_json if assessment.lifestyle else {}


@router.post("/{assessment_id}/speech")
async def speech(
    assessment_id: str,
    background_tasks: BackgroundTasks,
    request: Request,
    audioFile: UploadFile = File(...),
    promptId: str = Form("", max_length=120),
    promptType: str = Form("reading", pattern="^(reading|picture_description|free_speech)$"),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    enforce_rate_limit(request, "speech-upload", actor=user.id, limit=10, window_seconds=3600)
    assessment = get_session(assessment_id, user, db)
    extension = Path(audioFile.filename or "").suffix.lower().lstrip(".")
    allowed = {"wav", "mp3", "flac", "m4a", "webm", "ogg"}
    if extension not in allowed:
        raise HTTPException(400, f"Unsupported audio format: {extension or 'unknown'}")

    content_type = (audioFile.content_type or "").lower()
    if content_type and not (content_type.startswith("audio/") or content_type == "application/octet-stream"):
        raise HTTPException(400, "Uploaded file is not an audio media type")
    maximum_bytes = settings.max_upload_mb * 1024 * 1024
    data = await audioFile.read(maximum_bytes + 1)
    if len(data) > maximum_bytes:
        raise HTTPException(413, "Audio file exceeds configured size limit")
    if not data:
        raise HTTPException(400, "Audio file is empty")

    safe = f"speech-{uuid.uuid4().hex}.{extension}"
    try:
        audio_reference = object_storage.save_audio(
            assessment.patient_id,
            assessment.id,
            safe,
            data,
            content_type,
        )
    except Exception as exc:
        raise HTTPException(503, "Audio object storage is unavailable") from exc

    speech_row = assessment.speech
    previous_path = speech_row.audio_file_path if speech_row and speech_row.audio_file_path else None
    if speech_row is None:
        speech_row = SpeechAssessment(
            session_id=assessment.id,
            audio_file_path=audio_reference,
            original_filename=Path(audioFile.filename or safe).name[:255],
            audio_format=extension,
            prompt_id=promptId.strip() or None,
            prompt_type=promptType,
        )
        db.add(speech_row)
    else:
        speech_row.audio_file_path = audio_reference
        speech_row.original_filename = Path(audioFile.filename or safe).name[:255]
        speech_row.audio_format = extension
        speech_row.prompt_id = promptId.strip() or None
        speech_row.prompt_type = promptType
        speech_row.preprocessing_status = "PENDING"
        speech_row.feature_extraction_status = "PENDING"
        speech_row.transcription_status = "NOT_REQUIRED"
        speech_row.processing_error_code = None
        speech_row.speech_artifact_sha256 = None

    # The raw recording and its prompt context commit together.
    speech_row.feature_extraction_status = "PENDING"
    speech_row.processing_error_code = None
    speech_row.speech_artifact_sha256 = None
    assessment.current_step = "speech"
    try:
        db.flush()
        media_types = {"wav": "audio/wav", "mp3": "audio/mpeg", "flac": "audio/flac", "m4a": "audio/mp4",
                       "webm": "audio/webm", "ogg": "audio/ogg"}
        blob = db.get(SpeechAudioBlob, speech_row.id)
        if blob is None:
            blob = SpeechAudioBlob(speech_assessment_id=speech_row.id)
            db.add(blob)
        blob.content = data
        blob.byte_size = len(data)
        blob.sha256 = hashlib.sha256(data).hexdigest()
        blob.content_type = media_types[extension]
        db.commit()
    except Exception:
        db.rollback()
        object_storage.delete(audio_reference)
        raise
    db.refresh(speech_row)
    if previous_path and previous_path != audio_reference:
        try:
            object_storage.delete(previous_path)
        except Exception:
            pass
    try:
        queue = dispatch_speech(background_tasks, speech_row.id, audio_reference)
    except Exception as exc:
        speech_row.preprocessing_status = "FAILED"
        speech_row.feature_extraction_status = "FAILED"
        speech_row.processing_error_code = "QUEUE_UNAVAILABLE"
        db.commit()
        raise HTTPException(503, "Speech processing queue is unavailable") from exc
    return {
        "success": True,
        "speech_assessment_id": str(speech_row.id),
        "duration": speech_row.duration_seconds or 0,
        "embeddingExtracted": False,
        "promptId": promptId,
        "promptType": promptType,
        "status": "processing",
        "queue": queue,
    }


@router.post("/legacy-speech")
def legacy_speech():
    return {"success": False, "message": "Use /assessments/{id}/speech"}
