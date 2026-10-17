from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, or_
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.dependencies import get_current_user, require_doctor
from ...models.entities import Assignment, DoctorProfile, PatientProfile, Report, User, UserRole
from ...utils.serializers import patient_out, report_out, user_out
from ...schemas.common import DoctorProfileUpdate
from ...services.audit_service import audit

router = APIRouter(prefix="/doctors", tags=["Doctors"])


def directory_item(u: User, d: DoctorProfile):
    """Public, approved practice details only; never expose license or contact data."""
    return {"id": str(u.id), "name": f"{u.first_name} {u.last_name}".strip(), "role": "DOCTOR",
            "specialization": d.specialization, "qualification": d.qualification,
            "institution": d.hospital_clinic, "department": d.hospital_clinic,
            "yearsOfExperience": d.years_of_experience, "bio": d.bio,
            "city": d.city, "area": d.area, "isApproved": True}


def dp(user, db):
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if not doctor:
        raise HTTPException(403, "Doctor profile not found")
    return doctor


def patient_by_any_id(patient_id, db):
    try:
        identifier = UUID(patient_id)
    except ValueError:
        raise HTTPException(400, "Invalid patient id")
    return db.scalar(select(PatientProfile).where(PatientProfile.user_id == identifier)) or db.get(PatientProfile, identifier)


def assigned(doctor, patient, db):
    return db.scalar(
        select(Assignment).where(
            Assignment.doctor_id == doctor.id,
            Assignment.patient_id == patient.id,
            Assignment.status == "ACTIVE",
        )
    )


@router.get("")
def doctors(limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
            city: str | None = Query(None, max_length=120), area: str | None = Query(None, max_length=120),
            specialization: str | None = Query(None, max_length=120),
            search: str | None = Query(None, max_length=120),
            min_experience: int | None = Query(None, ge=0, le=75),
            user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(User, DoctorProfile).join(DoctorProfile, User.id == DoctorProfile.user_id).where(
        User.role == UserRole.DOCTOR, User.is_active.is_(True), DoctorProfile.is_approved.is_(True)
    )
    if city: query = query.where(DoctorProfile.city.ilike(f"%{city.strip()}%"))
    if area: query = query.where(DoctorProfile.area.ilike(f"%{area.strip()}%"))
    if specialization: query = query.where(DoctorProfile.specialization.ilike(f"%{specialization.strip()}%"))
    if min_experience is not None: query = query.where(DoctorProfile.years_of_experience >= min_experience)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        query = query.where(or_(User.first_name.ilike(pattern), User.last_name.ilike(pattern),
                                DoctorProfile.specialization.ilike(pattern), DoctorProfile.qualification.ilike(pattern),
                                DoctorProfile.hospital_clinic.ilike(pattern), DoctorProfile.city.ilike(pattern),
                                DoctorProfile.area.ilike(pattern)))
    rows = db.execute(query.order_by(User.last_name, User.first_name, User.id).offset(offset).limit(limit)).all()
    return [directory_item(u,d) for u,d in rows]


@router.get("/me")
def me(user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    if not doctor:
        raise HTTPException(404, "Doctor profile not found")
    return user_out(user)


@router.put("/me")
def update(data: DoctorProfileUpdate, user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    if not doctor:
        raise HTTPException(404, "Doctor profile not found")
    mapping = {
        "licenseNumber": "license_number",
        "specialization": "specialization",
        "department": "hospital_clinic",
        "institution": "hospital_clinic",
        "qualification": "qualification",
        "city": "city",
        "area": "area",
        "bio": "bio",
    }
    values = data.model_dump(exclude_unset=True)
    if "name" in values:
        parts = (values.pop("name") or "").strip().split(maxsplit=1)
        if parts:
            user.first_name = parts[0]
            user.last_name = parts[1] if len(parts) > 1 else ""
    for key, value in values.items():
        if key == "phone":
            user.phone = (value or "").strip() or None
        elif key in {"first_name", "last_name"}:
            setattr(user, key, (value or "").strip())
        elif key in mapping:
            setattr(doctor, mapping[key], (value or "").strip())
        elif key == "yearsOfExperience":
            doctor.years_of_experience = value
    audit(db, user, "DOCTOR_PROFILE_UPDATED", "DoctorProfile", doctor.id, {"fields": sorted(values.keys())})
    db.commit()
    db.refresh(user)
    return user_out(user)


@router.get("/me/patients")
def patients(limit: int = Query(200, ge=1, le=500), offset: int = Query(0, ge=0), user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    rows = db.scalars(
        select(Assignment).where(Assignment.doctor_id == doctor.id, Assignment.status == "ACTIVE").offset(offset).limit(limit)
    ).all()
    return [patient_out(db.get(PatientProfile, row.patient_id), db) for row in rows]


@router.get("/me/patients/{patient_id}")
def patient(patient_id: str, user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    p = patient_by_any_id(patient_id, db)
    if not p or not assigned(doctor, p, db):
        raise HTTPException(403, "Patient is not assigned to this doctor")
    return patient_out(p, db)


@router.get("/me/patients/{patient_id}/assessments")
def patient_assessments(patient_id: str, limit: int = Query(100, ge=1, le=500), offset: int = Query(0, ge=0), user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    p = patient_by_any_id(patient_id, db)
    if not p or not assigned(doctor, p, db):
        raise HTTPException(403, "Patient is not assigned to this doctor")
    from ...models.entities import AssessmentSession, ReportShare
    from ...utils.serializers import assessment_out
    rows = db.scalars(select(AssessmentSession).join(Report, Report.session_id == AssessmentSession.id)
                      .join(ReportShare, ReportShare.report_id == Report.id)
                      .where(AssessmentSession.patient_id == p.id, ReportShare.doctor_id == doctor.id,
                             ReportShare.revoked_at.is_(None)).order_by(AssessmentSession.created_at.desc()).offset(offset).limit(limit)).all()
    return [assessment_out(row, db) for row in rows]


@router.get("/me/reports")
def reports(limit: int = Query(200, ge=1, le=500), offset: int = Query(0, ge=0), user=Depends(require_doctor), db: Session = Depends(get_db)):
    doctor = dp(user, db)
    from ...models.entities import ReportShare
    shared = [x.report_id for x in db.scalars(select(ReportShare).where(ReportShare.doctor_id == doctor.id, ReportShare.revoked_at.is_(None))).all()]
    if shared:
        q = select(Report).where(Report.id.in_(shared)).order_by(Report.created_at.desc())
        return [report_out(r, db) for r in db.scalars(q.offset(offset).limit(limit)).all()]
    return []


@router.get("/{doctor_id}")
def doctor(doctor_id: str, user=Depends(get_current_user), db: Session = Depends(get_db)):
    try:
        did = UUID(doctor_id)
    except ValueError:
        raise HTTPException(400, "Invalid doctor id")
    d = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == did)) or db.get(DoctorProfile, did)
    doctor_user = db.get(User,d.user_id) if d else None
    if not d or not d.is_approved or not doctor_user or not doctor_user.is_active:
        raise HTTPException(404, "Doctor not found")
    return directory_item(doctor_user,d)
