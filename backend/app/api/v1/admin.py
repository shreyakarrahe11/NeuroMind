from uuid import UUID

from fastapi import APIRouter,Depends,HTTPException,Query
from sqlalchemy.orm import Session
from sqlalchemy import select,func
from ...core.database import get_db
from ...core.dependencies import require_admin
from ...models.entities import *
from ...utils.serializers import user_out,patient_out,assessment_out,report_out
from ...services.audit_service import audit
from ...services.doctor_assignment import choose_doctor
from ...schemas.common import AdminUserUpdate, AssignmentCreate, AssignmentUpdate
from ...ai.model_registry import inference_ready, model_statuses
from ...ai.rag.retriever import rag
from ...core.config import settings
from ...services.task_dispatcher import task_queue_ready
from datetime import datetime, timezone
router=APIRouter(prefix="/admin",tags=["Admin"])

def _uuid(value:str, label:str="id"):
    try: return UUID(value)
    except (TypeError,ValueError): raise HTTPException(400,f"Invalid {label}")

def _doctor_by_any_id(db:Session,value:str):
    identifier=_uuid(value,"doctor id")
    return db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==identifier)) or db.get(DoctorProfile,identifier)
@router.get("/dashboard")
def dashboard(db:Session=Depends(get_db),user=Depends(require_admin)):
    users=db.scalar(select(func.count()).select_from(User)) or 0
    patients=db.scalar(select(func.count()).select_from(User).where(User.role==UserRole.PATIENT)) or 0
    doctors=db.scalar(select(func.count()).select_from(User).where(User.role==UserRole.DOCTOR)) or 0
    active=db.scalar(select(func.count()).select_from(DoctorProfile).join(User,User.id==DoctorProfile.user_id).where(DoctorProfile.is_approved.is_(True),User.is_active.is_(True))) or 0
    pending=db.scalar(select(func.count()).select_from(DoctorProfile).join(User,User.id==DoctorProfile.user_id).where(DoctorProfile.is_approved.is_(False),User.account_status==AccountStatus.PENDING)) or 0
    assessments=db.scalar(select(func.count()).select_from(AssessmentSession)) or 0
    reports=db.scalar(select(func.count()).select_from(Report)) or 0
    high=db.scalar(select(func.count()).select_from(Report).where(Report.risk_level=="HIGH")) or 0
    return {"totalUsers":users,"totalPatients":patients,"totalDoctors":doctors,"activeDoctors":active,"pendingDoctors":pending,"totalAssessments":assessments,"totalReports":reports,"pendingReviews":db.scalar(select(func.count()).select_from(Report).where(Report.report_status.in_(["GENERATED","PENDING_MODEL"]))) or 0,"highRiskAssessments":high}
@router.get("/users")
def users(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),user=Depends(require_admin)): return [user_out(u) for u in db.scalars(select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)).all()]
@router.get("/users/{user_id}")
def user(user_id:str,db:Session=Depends(get_db),admin=Depends(require_admin)):
    u=db.get(User,_uuid(user_id,"user id"))
    if not u: raise HTTPException(404,"User not found")
    return user_out(u)
@router.put("/users/{user_id}")
def update_user(user_id:str,data:AdminUserUpdate,db:Session=Depends(get_db),admin=Depends(require_admin)):
    u=db.get(User,_uuid(user_id,"user id"))
    if not u: raise HTTPException(404,"User not found")
    values=data.model_dump(exclude_unset=True)
    if "status" in values:
        try: status=AccountStatus(str(values["status"]))
        except ValueError: raise HTTPException(422,"Invalid account status")
        if u.role==UserRole.DOCTOR and status==AccountStatus.ACTIVE and u.doctor_profile and not u.doctor_profile.is_approved:
            raise HTTPException(409,"Approve the doctor credentials before activating this account")
        u.account_status=status
        u.is_active=status==AccountStatus.ACTIVE
        audit(db,admin,'USER_STATUS_CHANGED','User',u.id,{'status':status.value})
    for k in ["first_name","last_name","phone"]:
        if k in values: setattr(u,k,(values[k] or "").strip() or None if k=="phone" else (values[k] or "").strip())
    db.commit(); return user_out(u)
@router.delete("/users/{user_id}")
def delete_user(user_id:str,db:Session=Depends(get_db),admin=Depends(require_admin)):
    u=db.get(User,_uuid(user_id,"user id"))
    if not u: raise HTTPException(404,"User not found")
    if u.id==admin.id: raise HTTPException(400,"Cannot delete current administrator")
    db.delete(u); db.commit(); return {"success":True}
@router.get("/doctors")
def all_doctors(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    out=[]
    for u in db.scalars(select(User).where(User.role==UserRole.DOCTOR).order_by(User.created_at.desc()).offset(offset).limit(limit)).all():
        if not u.doctor_profile: continue
        item=user_out(u); item["assignedPatientCount"]=db.scalar(select(func.count()).select_from(Assignment).where(Assignment.doctor_id==u.doctor_profile.id,Assignment.status=="ACTIVE")) or 0; out.append(item)
    return out
@router.put("/doctors/{doctor_id}/approve")
def approve(doctor_id:str,db:Session=Depends(get_db),admin=Depends(require_admin)):
    d=_doctor_by_any_id(db,doctor_id)
    if not d: raise HTTPException(404,"Doctor not found")
    doctor_user=db.get(User,d.user_id)
    d.is_approved=True; doctor_user.is_active=True; doctor_user.is_verified=True; doctor_user.account_status=AccountStatus.ACTIVE
    audit(db,admin,'DOCTOR_APPROVED','DoctorProfile',d.id)
    db.add(Notification(recipient_user_id=doctor_user.id,type='DOCTOR_APPROVED',title='Doctor Account Approved',message='Your NeuroMind doctor application has been approved. You can now sign in with your registered email and password.',reference_id=str(d.id)))
    db.commit()
    return user_out(doctor_user)
@router.put("/doctors/{doctor_id}/reject")
def reject(doctor_id:str,db:Session=Depends(get_db),admin=Depends(require_admin)):
    d=_doctor_by_any_id(db,doctor_id)
    if not d: raise HTTPException(404,"Doctor not found")
    doctor_user=db.get(User,d.user_id)
    d.is_approved=False; doctor_user.is_active=False; doctor_user.account_status=AccountStatus.DEACTIVATED
    audit(db,admin,'DOCTOR_REJECTED','DoctorProfile',d.id)
    db.add(Notification(recipient_user_id=doctor_user.id,type='DOCTOR_REJECTED',title='Doctor Application Not Approved',message='Your NeuroMind doctor application was not approved. Please contact the administrator for further information.',reference_id=str(d.id)))
    db.commit()
    return user_out(doctor_user)
@router.get("/patients")
def all_patients(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    return [patient_out(p,db) for p in db.scalars(select(PatientProfile).offset(offset).limit(limit)).all()]
@router.get("/doctor-assistance-requests")
def assistance_requests(limit:int=Query(100,ge=1,le=200),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    rows=db.scalars(select(PatientProfile).outerjoin(Assignment,
                     (Assignment.patient_id==PatientProfile.id) & (Assignment.status=="ACTIVE"))
                    .where(PatientProfile.doctor_assignment_requested_at.is_not(None),Assignment.id.is_(None))
                    .order_by(PatientProfile.doctor_assignment_requested_at).offset(offset).limit(limit)).all()
    return [patient_out(p,db) for p in rows]
@router.post("/assignments")
def assign(data:AssignmentCreate,db:Session=Depends(get_db),admin=Depends(require_admin)):
    p=db.scalar(select(PatientProfile).where(PatientProfile.user_id==data.patient_id).with_for_update()) or db.scalar(select(PatientProfile).where(PatientProfile.id==data.patient_id).with_for_update())
    d=db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==data.doctor_id)) or db.get(DoctorProfile,data.doctor_id)
    if not p or not d: raise HTTPException(400,"Invalid patient or doctor")
    if not p.doctor_assignment_requested_at:
        raise HTTPException(409,"The patient has not requested admin help choosing a doctor")
    choose_doctor(db,p,d,admin,"ADMIN")
    db.commit(); return patient_out(p,db)
@router.get("/assignments")
def assignments(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    result=[]
    for a in db.scalars(select(Assignment).order_by(Assignment.assigned_at.desc()).offset(offset).limit(limit)).all():
        doctor=db.get(DoctorProfile,a.doctor_id); patient=db.get(PatientProfile,a.patient_id)
        result.append({"id":str(a.id),"doctorId":str(doctor.user_id) if doctor else None,"patientId":str(patient.user_id) if patient else None,"doctorProfileId":str(a.doctor_id),"patientProfileId":str(a.patient_id),"status":a.status,"assignedAt":a.assigned_at.isoformat()})
    return result
@router.put("/assignments/{assignment_id}")
def update_assignment(assignment_id:str,data:AssignmentUpdate,db:Session=Depends(get_db),admin=Depends(require_admin)):
    a=db.get(Assignment,_uuid(assignment_id,"assignment id"))
    if not a: raise HTTPException(404,"Assignment not found")
    if data.status=="ACTIVE":
        p=db.scalar(select(PatientProfile).where(PatientProfile.id==a.patient_id).with_for_update())
        if not p or not p.doctor_assignment_requested_at:
            raise HTTPException(409,"A patient request is required to reactivate an assignment")
        current=db.scalars(select(Assignment).where(Assignment.patient_id==a.patient_id,Assignment.status=="ACTIVE",Assignment.id!=a.id)).all()
        if current: raise HTTPException(409,"An active doctor is already assigned")
        p.doctor_assignment_requested_at=None
    a.status=data.status; a.unassigned_at=None if a.status=="ACTIVE" else datetime.now(timezone.utc)
    audit(db,admin,'ASSIGNMENT_STATUS_CHANGED','Assignment',a.id,{'status':a.status})
    db.commit(); return {"success":True}
@router.delete("/assignments/{assignment_id}")
def remove_assignment(assignment_id:str,db:Session=Depends(get_db),admin=Depends(require_admin)):
    a=db.get(Assignment,_uuid(assignment_id,"assignment id"))
    if not a: raise HTTPException(404,"Assignment not found")
    a.status="INACTIVE"; a.unassigned_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    audit(db,admin,"ASSIGNMENT_REMOVED","Assignment",a.id)
    db.commit(); return {"success":True}
@router.get("/login-activity")
def login_activity(limit: int = 100, db: Session = Depends(get_db), admin=Depends(require_admin)):
    from ...models.entities import LoginEvent
    limit = max(1, min(limit, 500))
    rows = db.scalars(select(LoginEvent).order_by(LoginEvent.created_at.desc()).limit(limit)).all()
    return [
        {
            "id": str(x.id),
            "userId": str(x.user_id) if x.user_id else None,
            "email": x.email,
            "role": x.role,
            "authProvider": x.auth_provider,
            "success": x.success,
            "ipAddress": x.ip_address,
            "userAgent": x.user_agent,
            "createdAt": x.created_at.isoformat(),
        }
        for x in rows
    ]


@router.get("/audit-logs")
def audit_logs(
    limit: int = 100,
    offset: int = 0,
    action: str | None = None,
    entity_type: str | None = None,
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    """Administrative audit trail with bounded pagination and optional filters."""
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    statement = select(AuditLog)
    count_statement = select(func.count()).select_from(AuditLog)
    if action:
        statement = statement.where(AuditLog.action == action[:120])
        count_statement = count_statement.where(AuditLog.action == action[:120])
    if entity_type:
        statement = statement.where(AuditLog.entity_type == entity_type[:80])
        count_statement = count_statement.where(AuditLog.entity_type == entity_type[:80])
    total = db.scalar(count_statement) or 0
    rows = db.scalars(
        statement.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit)
    ).all()
    user_ids = {row.user_id for row in rows if row.user_id}
    users_by_id = {
        item.id: item
        for item in db.scalars(select(User).where(User.id.in_(user_ids))).all()
    } if user_ids else {}
    return {
        "items": [
            {
                "id": str(row.id),
                "userId": str(row.user_id) if row.user_id else None,
                "actorEmail": users_by_id[row.user_id].email if row.user_id in users_by_id else None,
                "action": row.action,
                "entityType": row.entity_type,
                "entityId": row.entity_id,
                "ipAddress": row.ip_address,
                "details": row.details_json or {},
                "createdAt": row.created_at.isoformat(),
            }
            for row in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }

@router.get("/reports")
def reports(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)): return [report_out(r,db) for r in db.scalars(select(Report).order_by(Report.created_at.desc()).offset(offset).limit(limit)).all()]

@router.get("/assessments")
def all_assessments(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    return [assessment_out(row,db) for row in db.scalars(select(AssessmentSession).order_by(AssessmentSession.created_at.desc()).offset(offset).limit(limit)).all()]

@router.get("/model-artifacts")
def model_artifacts(limit:int=Query(200,ge=1,le=500),offset:int=Query(0,ge=0),db:Session=Depends(get_db),admin=Depends(require_admin)):
    """Return the immutable model versions registered by the inference pipeline."""
    rows=db.scalars(select(ModelArtifact).order_by(ModelArtifact.registered_at.desc()).offset(offset).limit(limit)).all()
    return [
        {
            "id":str(item.id),
            "name":item.name,
            "version":item.version,
            "task":item.task,
            "framework":item.framework,
            "artifactPath":item.artifact_path,
            "checksumSha256":item.checksum_sha256,
            "inputFeatures":item.input_features_json,
            "classLabels":item.class_labels_json,
            "metrics":item.metrics_json,
            "isActive":item.is_active,
            "registeredAt":item.registered_at.isoformat(),
            "runCount":db.scalar(select(func.count()).select_from(ModelRun).where(ModelRun.model_artifact_id==item.id)) or 0,
        }
        for item in rows
    ]


@router.get("/ai-readiness")
def ai_readiness(db: Session = Depends(get_db), admin=Depends(require_admin)):
    documents = db.scalars(select(KnowledgeDocument).order_by(KnowledgeDocument.title)).all()
    semantic_ready, semantic_error = rag.semantic_status(db)
    return {
        "inferenceReady": inference_ready(),
        "models": model_statuses(),
        "taskQueueReady": task_queue_ready(),
        "reportProviderConfigured": bool(settings.gemini_api_key),
        "requireEvidenceForReports": settings.require_rag_evidence_for_report,
        "knowledge": {
            "documentCount": len(documents),
            "chunkCount": db.scalar(select(func.count()).select_from(KnowledgeChunk)) or 0,
            "semanticIndexReady": semantic_ready,
            "semanticIndexError": semantic_error,
            "documents": [
                {
                    "id": str(document.id),
                    "title": document.title,
                    "source": document.source,
                    "documentType": document.document_type,
                    "version": document.version,
                    "publicationDate": document.publication_date.isoformat() if document.publication_date else None,
                    "chunkCount": len(document.chunks),
                }
                for document in documents
            ],
        },
    }
