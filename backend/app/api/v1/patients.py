from uuid import UUID

from fastapi import APIRouter,Depends,HTTPException,Query
from sqlalchemy.orm import Session
from sqlalchemy import select
from ...core.database import get_db
from ...core.dependencies import require_roles
from ...models.entities import *
from ...utils.serializers import user_out,patient_out,assessment_out,report_out,notification_out
from ...schemas.common import PatientProfileUpdate, ReportShareIn, PatientDoctorChoice
from ...services.audit_service import audit
from ...services.doctor_assignment import choose_doctor
router=APIRouter(prefix="/patients",tags=["Patients"])
def pp(user,db): return db.scalar(select(PatientProfile).where(PatientProfile.user_id==user.id))
@router.post("/me/doctor-choice")
def doctor_choice(data:PatientDoctorChoice,user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=db.scalar(select(PatientProfile).where(PatientProfile.user_id==user.id).with_for_update())
    if not p: raise HTTPException(404,"Patient profile not found")
    d=db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==data.doctor_id)) or db.get(DoctorProfile,data.doctor_id)
    if not d: raise HTTPException(404,"Doctor not found")
    choose_doctor(db,p,d,user,"PATIENT")
    db.commit()
    return patient_out(p,db)

@router.post("/me/doctor-assistance")
def request_doctor_assistance(user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=db.scalar(select(PatientProfile).where(PatientProfile.user_id==user.id).with_for_update())
    if not p: raise HTTPException(404,"Patient profile not found")
    if db.scalar(select(Assignment).where(Assignment.patient_id==p.id,Assignment.status=="ACTIVE")):
        raise HTTPException(409,"A doctor is already assigned")
    if not p.doctor_assignment_requested_at:
        p.doctor_assignment_requested_at=now()
        audit(db,user,"DOCTOR_ASSISTANCE_REQUESTED","PatientProfile",p.id)
        for admin in db.scalars(select(User).where(User.role==UserRole.ADMIN,User.is_active.is_(True))).all():
            db.add(Notification(recipient_user_id=admin.id,type="DOCTOR_ASSISTANCE_REQUESTED",title="Patient requests help choosing a doctor",
                                message="Review the pending doctor assistance queue.",reference_id=str(p.id)))
        db.commit()
    return patient_out(p,db)

@router.delete("/me/doctor-assistance")
def cancel_doctor_assistance(user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=db.scalar(select(PatientProfile).where(PatientProfile.user_id==user.id).with_for_update())
    if not p: raise HTTPException(404,"Patient profile not found")
    if p.doctor_assignment_requested_at:
        p.doctor_assignment_requested_at=None
        audit(db,user,"DOCTOR_ASSISTANCE_CANCELLED","PatientProfile",p.id)
        db.commit()
    return patient_out(p,db)
@router.get("/me")
def me(user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db)
    if not p: raise HTTPException(404,"Patient profile not found")
    return patient_out(p,db)
@router.put("/me")
def update(data:PatientProfileUpdate,user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db)
    if not p: raise HTTPException(404,"Patient profile not found")
    values=data.model_dump(exclude_unset=True)
    if "name" in values:
        parts=(values.pop("name") or "").strip().split(maxsplit=1)
        if not parts: raise HTTPException(422,"Name cannot be empty")
        user.first_name=parts[0]
        user.last_name=parts[1] if len(parts)>1 else ""
    if "dateOfBirth" in values: p.date_of_birth=values["dateOfBirth"]
    if "gender" in values: p.gender=values["gender"]
    if "education" in values: p.education_level=(values["education"] or "").strip()
    if "occupation" in values: p.occupation=(values["occupation"] or "").strip()
    if "phone" in values: user.phone=(values["phone"] or "").strip() or None
    audit(db,user,"PATIENT_PROFILE_UPDATED","PatientProfile",p.id,{"fields":sorted(values.keys())})
    db.commit(); return patient_out(p,db)
@router.get("/me/assessments")
def assessments(limit:int=Query(100,ge=1,le=500),offset:int=Query(0,ge=0),user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db); return [assessment_out(x,db) for x in db.scalars(select(AssessmentSession).where(AssessmentSession.patient_id==p.id).order_by(AssessmentSession.created_at.desc()).offset(offset).limit(limit)).all()]
@router.get("/me/reports")
def reports(limit:int=Query(100,ge=1,le=500),offset:int=Query(0,ge=0),user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db); return [report_out(x,db) for x in db.scalars(select(Report).where(Report.patient_id==p.id).order_by(Report.created_at.desc()).offset(offset).limit(limit)).all()]
@router.get("/me/notifications")
def notifications(limit:int=Query(100,ge=1,le=500),offset:int=Query(0,ge=0),user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    return [notification_out(x) for x in db.scalars(select(Notification).where(Notification.recipient_user_id==user.id).order_by(Notification.created_at.desc()).offset(offset).limit(limit)).all()]

@router.post("/me/reports/{report_id}/share")
def share_report(report_id:str,data:ReportShareIn,user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db)
    try:
        rid=UUID(report_id)
    except ValueError:
        raise HTTPException(400,"Invalid report id")
    r=db.get(Report,rid)
    if not r or r.patient_id!=p.id: raise HTTPException(404,"Report not found")
    if str(r.report_status) not in {"GENERATED","REVIEWED","FINALIZED"} or not r.ai_report:
        raise HTTPException(409,"The report is not ready to be shared yet.")
    did=data.doctor_id
    d=db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==did)) or db.get(DoctorProfile,did)
    if not d or not d.is_approved:
        raise HTTPException(400,"Approved doctor not found")
    existing=db.scalar(select(ReportShare).where(ReportShare.report_id==r.id,ReportShare.doctor_id==d.id,ReportShare.revoked_at.is_(None)))
    if not existing:
        db.add(ReportShare(report_id=r.id,patient_id=p.id,doctor_id=d.id))
        doctor_user=db.get(User,d.user_id)
        if doctor_user:
            db.add(Notification(recipient_user_id=d.user_id,type="REPORT_SHARED",title="Patient Shared a NeuroMind Report",message="A patient has shared a NeuroMind assessment report with you for review.",reference_id=str(r.id)))
    db.commit()
    return {"success":True,"shared":True,"doctorId":str(d.user_id),"report":report_out(r,db)}

@router.delete("/me/reports/{report_id}/share/{doctor_id}")
def revoke_report_share(report_id:str,doctor_id:str,user=Depends(require_roles(UserRole.PATIENT)),db:Session=Depends(get_db)):
    p=pp(user,db)
    try: rid,did=UUID(report_id),UUID(doctor_id)
    except ValueError: raise HTTPException(400,"Invalid report or doctor id")
    r=db.get(Report,rid)
    if not r or r.patient_id!=p.id: raise HTTPException(404,"Report not found")
    d=db.scalar(select(DoctorProfile).where(DoctorProfile.user_id==did)) or db.get(DoctorProfile,did)
    if not d: raise HTTPException(404,"Doctor not found")
    share=db.scalar(select(ReportShare).where(ReportShare.report_id==r.id,ReportShare.doctor_id==d.id,ReportShare.revoked_at.is_(None)))
    if share:
        share.revoked_at=now()
        audit(db,user,"REPORT_SHARE_REVOKED","ReportShare",share.id)
        db.commit()
    return {"success":True,"report":report_out(r,db)}
