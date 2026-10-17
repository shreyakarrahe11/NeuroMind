from uuid import UUID
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter,Depends,HTTPException,Request
from sqlalchemy.orm import Session
from sqlalchemy import select
from fastapi import BackgroundTasks
from ...core.database import get_db
from ...core.config import settings
from ...core.dependencies import get_current_user
from ...models.entities import *
from ...ai.model_registry import model_statuses
from ...ai.models.multimodal_model import MultimodalModelService
from ...utils.serializers import prediction_out
from ...services.task_dispatcher import dispatch_pipeline
from ...services.rate_limit import enforce_rate_limit
router=APIRouter(prefix="/ai",tags=["AI"])


def _assessment(db: Session, value: str):
    try:
        identifier = UUID(value)
    except (TypeError, ValueError):
        raise HTTPException(400, "Invalid assessment id")
    assessment = db.get(AssessmentSession, identifier)
    if not assessment:
        raise HTTPException(404, "Assessment not found")
    return assessment


@router.get("/models/status")
def models_status(user=Depends(get_current_user)):
    return {"models":model_statuses(),"note":"Binary Non-Dementia/Dementia speech and multimodal artifacts are required. Memory, attention, and lifestyle scores feed fusion; their standalone adapters are optional."}
def authorize(a,user,db):
    if user.role==UserRole.PATIENT:
        p=db.scalar(select(PatientProfile).where(PatientProfile.user_id==user.id))
        if not p or a.patient_id!=p.id: raise HTTPException(403,"Not your assessment")
    elif user.role==UserRole.DOCTOR:
        d=user.doctor_profile
        if not d:
            raise HTTPException(403,"Doctor profile not found")
        shared=db.scalar(select(ReportShare).join(Report,ReportShare.report_id==Report.id).where(ReportShare.doctor_id==d.id,ReportShare.revoked_at.is_(None),Report.session_id==a.id))
        if not shared:
            raise HTTPException(403,"Patient has not shared this assessment report with you")
@router.post("/assessments/{assessment_id}/run")
def run(assessment_id:str,bg:BackgroundTasks,request:Request,user=Depends(get_current_user),db:Session=Depends(get_db)):
    enforce_rate_limit(request,"ai-run",actor=user.id,limit=5,window_seconds=900)
    a=_assessment(db,assessment_id)
    authorize(a,user,db)
    # Serialize submissions for this assessment across API workers. PostgreSQL
    # holds the row lock through the active-run check and queued-run insert.
    a=db.scalar(select(AssessmentSession).where(AssessmentSession.id==a.id).with_for_update().execution_options(populate_existing=True))
    if a.status == AssessmentStatus.PROCESSED:
        completed=db.scalar(select(ModelRun).where(ModelRun.session_id==a.id,ModelRun.status==JobStatus.COMPLETED).order_by(ModelRun.started_at.desc()).limit(1))
        if completed:
            return {"status":"completed","runId":str(completed.id)}
    if a.status != AssessmentStatus.COMPLETED:
        raise HTTPException(409,"Complete and validate all assessment sections before running the model")
    # Avoid duplicate jobs.
    active=db.scalar(select(ModelRun).where(ModelRun.session_id==a.id,ModelRun.status.in_([JobStatus.QUEUED,JobStatus.PROCESSING])).order_by(ModelRun.started_at.desc()).limit(1))
    if active:
        cutoff=datetime.now(timezone.utc)-timedelta(seconds=settings.task_time_limit_seconds + 90)
        started=active.started_at
        if started and (started if started.tzinfo else started.replace(tzinfo=timezone.utc)) < cutoff:
            active.status=JobStatus.FAILED
            active.completed_at=datetime.now(timezone.utc)
            active.error_message="The processing worker exceeded its time limit. Start a new analysis."
            db.flush()
        else:
            return {"status":"processing","runId":str(active.id)}
    adapter=MultimodalModelService()
    detail=adapter.status_detail()
    r=ModelRun(
        session_id=a.id,
        model_name=adapter.manifest.get("name","multimodal"),
        model_version=adapter.manifest.get("version","unconfigured"),
        status=JobStatus.QUEUED,
        started_at=datetime.now(timezone.utc),
        metadata_json=detail,
    ); db.add(r); db.commit()
    try:
        queue=dispatch_pipeline(bg,a.id,r.id)
    except Exception as exc:
        r.status=JobStatus.FAILED; r.error_message="Background processing queue is unavailable"; db.commit()
        raise HTTPException(503,"AI processing queue is unavailable") from exc
    return {"status":"queued","runId":str(r.id),"queue":queue}
@router.get("/assessments/{assessment_id}/status")
def status(assessment_id:str,runId:str|None=None,user=Depends(get_current_user),db:Session=Depends(get_db)):
    a=_assessment(db,assessment_id)
    authorize(a,user,db)
    if runId:
        try: rid=UUID(runId)
        except ValueError: raise HTTPException(400,"Invalid run id")
        latest=db.scalar(select(ModelRun).where(ModelRun.id==rid,ModelRun.session_id==a.id))
        if not latest: raise HTTPException(404,"Analysis run not found")
    else:
        latest=db.scalar(select(ModelRun).where(ModelRun.session_id==a.id).order_by(ModelRun.started_at.desc()).limit(1))
    pred=(db.scalar(select(Prediction).where(Prediction.model_run_id==latest.id).order_by(Prediction.created_at.desc()).limit(1))
          if latest and latest.status==JobStatus.COMPLETED else None)
    return {"assessmentId":str(a.id),"runId":str(latest.id) if latest else None,"status":latest.status if latest else "not_started","message":latest.error_message if latest else None,"prediction":prediction_out(pred) if pred else None}
@router.get("/assessments/{assessment_id}/predictions")
def predictions(assessment_id:str,user=Depends(get_current_user),db:Session=Depends(get_db)):
    a=_assessment(db,assessment_id)
    authorize(a,user,db); return [prediction_out(x) for x in db.scalars(select(Prediction).where(Prediction.session_id==a.id).order_by(Prediction.created_at.desc())).all()]
@router.get("/assessments/{assessment_id}/explanations")
def explanations(assessment_id:str,user=Depends(get_current_user),db:Session=Depends(get_db)):
    a=_assessment(db,assessment_id)
    authorize(a,user,db)
    p=db.scalar(select(Prediction).where(Prediction.session_id==a.id).order_by(Prediction.created_at.desc()))
    return [{"featureName":e.feature_name,"featureValueDisplay":e.feature_value,"shapValue":e.importance_value,"direction":e.direction,"method":e.method} for e in (p.explanations if p else [])]
