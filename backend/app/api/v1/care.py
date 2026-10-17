from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from ...core.database import get_db
from ...core.dependencies import get_current_user, require_admin
from ...models.entities import (
    AccountStatus,
    Assignment,
    CareMessage,
    DoctorChangeRequest,
    DoctorProfile,
    DoctorRating,
    Notification,
    PatientProfile,
    User,
    UserRole,
)
from ...services.audit_service import audit
from ...services.field_encryption import decrypt_text, encrypt_text
from ...services.rate_limit import enforce_rate_limit


router = APIRouter(prefix="/care", tags=["Care communication"])


class MessageIn(BaseModel):
    recipient_id: UUID
    body: str = Field(min_length=1, max_length=4000)


class ChangeRequestIn(BaseModel):
    reason: str = Field(min_length=10, max_length=2000)
    requested_doctor_id: Optional[UUID] = None


class ChangeResolutionIn(BaseModel):
    status: str
    resolution_note: str = Field(default="", max_length=2000)
    doctor_id: Optional[UUID] = None


class RatingIn(BaseModel):
    doctor_id: UUID
    report_id: Optional[UUID] = None
    rating: int = Field(ge=1, le=5)
    comment: str = Field(default="", max_length=2000)


def _patient(user: User, db: Session) -> PatientProfile:
    patient = db.scalar(select(PatientProfile).where(PatientProfile.user_id == user.id))
    if not patient:
        raise HTTPException(403, "Patient profile required")
    return patient


def _doctor(user: User, db: Session) -> DoctorProfile:
    doctor = db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == user.id))
    if not doctor or not doctor.is_approved:
        raise HTTPException(403, "Approved doctor profile required")
    return doctor


def _doctor_by_user_id(db: Session, value: UUID) -> Optional[DoctorProfile]:
    return db.scalar(select(DoctorProfile).where(DoctorProfile.user_id == value)) or db.get(DoctorProfile, value)


def _active_assignment(db: Session, patient_id: UUID, doctor_id: UUID) -> Optional[Assignment]:
    return db.scalar(
        select(Assignment).where(
            Assignment.patient_id == patient_id,
            Assignment.doctor_id == doctor_id,
            Assignment.status == "ACTIVE",
        )
    )


def _participants(user: User, counterpart_id: UUID, db: Session):
    counterpart = db.get(User, counterpart_id)
    if not counterpart or not counterpart.is_active:
        raise HTTPException(404, "Care participant not found")

    if user.role == UserRole.PATIENT and counterpart.role == UserRole.DOCTOR:
        patient, doctor = _patient(user, db), _doctor_by_user_id(db, counterpart.id)
    elif user.role == UserRole.DOCTOR and counterpart.role == UserRole.PATIENT:
        doctor, patient = _doctor(user, db), db.scalar(
            select(PatientProfile).where(PatientProfile.user_id == counterpart.id)
        )
    else:
        raise HTTPException(403, "Messages are available only between an assigned patient and doctor")

    if not patient or not doctor or not _active_assignment(db, patient.id, doctor.id):
        raise HTTPException(403, "An active doctor-patient assignment is required")
    return patient, doctor, counterpart


def _message_out(row: CareMessage):
    return {
        "id": str(row.id),
        "patientId": str(row.patient_id),
        "doctorId": str(row.doctor_id),
        "senderId": str(row.sender_user_id),
        "recipientId": str(row.recipient_user_id),
        "body": decrypt_text(row.body),
        "readAt": row.read_at.isoformat() if row.read_at else None,
        "createdAt": row.created_at.isoformat(),
    }


def _change_out(row: DoctorChangeRequest, db: Session):
    patient = db.get(PatientProfile, row.patient_id)
    patient_user = db.get(User, patient.user_id) if patient else None
    requested = db.get(DoctorProfile, row.requested_doctor_id) if row.requested_doctor_id else None
    requested_user = db.get(User, requested.user_id) if requested else None
    return {
        "id": str(row.id),
        "patientId": str(patient.user_id) if patient else None,
        "patientName": f"{patient_user.first_name} {patient_user.last_name}".strip() if patient_user else "",
        "currentDoctorProfileId": str(row.current_doctor_id) if row.current_doctor_id else None,
        "requestedDoctorId": str(requested.user_id) if requested else None,
        "requestedDoctorName": f"{requested_user.first_name} {requested_user.last_name}".strip() if requested_user else None,
        "reason": row.reason,
        "status": row.status,
        "resolutionNote": row.resolution_note,
        "createdAt": row.created_at.isoformat(),
        "resolvedAt": row.resolved_at.isoformat() if row.resolved_at else None,
    }


@router.get("/contacts")
def contacts(limit: int = Query(default=200, ge=1, le=500), offset: int = Query(default=0, ge=0), user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role == UserRole.PATIENT:
        patient = _patient(user, db)
        assignments = db.scalars(
            select(Assignment).where(Assignment.patient_id == patient.id, Assignment.status == "ACTIVE").offset(offset).limit(limit)
        ).all()
        profile_ids = [item.doctor_id for item in assignments]
        profiles = db.scalars(select(DoctorProfile).where(DoctorProfile.id.in_(profile_ids))).all() if profile_ids else []
        users = [db.get(User, profile.user_id) for profile in profiles]
    elif user.role == UserRole.DOCTOR:
        doctor = _doctor(user, db)
        assignments = db.scalars(
            select(Assignment).where(Assignment.doctor_id == doctor.id, Assignment.status == "ACTIVE").offset(offset).limit(limit)
        ).all()
        profile_ids = [item.patient_id for item in assignments]
        profiles = db.scalars(select(PatientProfile).where(PatientProfile.id.in_(profile_ids))).all() if profile_ids else []
        users = [db.get(User, profile.user_id) for profile in profiles]
    else:
        raise HTTPException(403, "Patient or doctor access required")
    return [
        {"id": str(item.id), "name": f"{item.first_name} {item.last_name}".strip(), "role": item.role, "email": item.email}
        for item in users if item
    ]


@router.get("/messages/{counterpart_id}")
def messages(
    counterpart_id: UUID,
    limit: int = Query(default=100, ge=1, le=500),
    user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    patient, doctor, _ = _participants(user, counterpart_id, db)
    rows = db.scalars(
        select(CareMessage)
        .where(CareMessage.patient_id == patient.id, CareMessage.doctor_id == doctor.id)
        .order_by(CareMessage.created_at.desc())
        .limit(limit)
    ).all()
    now_value = datetime.now(timezone.utc)
    for row in rows:
        if row.recipient_user_id == user.id and row.read_at is None:
            row.read_at = now_value
    db.commit()
    return [_message_out(row) for row in reversed(rows)]


@router.post("/messages", status_code=201)
def send_message(data: MessageIn, request: Request, user=Depends(get_current_user), db: Session = Depends(get_db)):
    enforce_rate_limit(request, "care-message", actor=user.id, limit=30, window_seconds=60)
    patient, doctor, recipient = _participants(user, data.recipient_id, db)
    body = data.body.strip()
    if not body:
        raise HTTPException(422, "Message cannot be empty")
    row = CareMessage(
        patient_id=patient.id,
        doctor_id=doctor.id,
        sender_user_id=user.id,
        recipient_user_id=recipient.id,
        body=encrypt_text(body),
    )
    db.add(row)
    db.flush()
    db.add(Notification(
        recipient_user_id=recipient.id,
        type="CARE_MESSAGE",
        title="New secure care message",
        message="You have a new message in your NeuroMind care channel.",
        reference_id=str(user.id),
    ))
    audit(db, user, "CARE_MESSAGE_SENT", "CareMessage", row.id, {"recipient_id": str(recipient.id)})
    db.commit()
    db.refresh(row)
    return _message_out(row)


@router.get("/doctor-change-requests")
def change_requests(limit: int = Query(default=100, ge=1, le=500), offset: int = Query(default=0, ge=0), user=Depends(get_current_user), db: Session = Depends(get_db)):
    query = select(DoctorChangeRequest).order_by(DoctorChangeRequest.created_at.desc())
    if user.role == UserRole.PATIENT:
        query = query.where(DoctorChangeRequest.patient_id == _patient(user, db).id)
    elif user.role != UserRole.ADMIN:
        raise HTTPException(403, "Patient or administrator access required")
    return [_change_out(row, db) for row in db.scalars(query.offset(offset).limit(limit)).all()]


@router.post("/doctor-change-requests", status_code=201)
def request_doctor_change(data: ChangeRequestIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    patient = _patient(user, db)
    pending = db.scalar(select(DoctorChangeRequest).where(
        DoctorChangeRequest.patient_id == patient.id,
        DoctorChangeRequest.status == "PENDING",
    ))
    if pending:
        raise HTTPException(409, "A doctor change request is already pending")
    current = db.scalar(select(Assignment).where(Assignment.patient_id == patient.id, Assignment.status == "ACTIVE"))
    requested = None
    if data.requested_doctor_id:
        requested = _doctor_by_user_id(db, data.requested_doctor_id)
        if not requested or not requested.is_approved:
            raise HTTPException(422, "Requested doctor is not approved")
        if current and requested.id == current.doctor_id:
            raise HTTPException(422, "Requested doctor is already assigned")
    row = DoctorChangeRequest(
        patient_id=patient.id,
        current_doctor_id=current.doctor_id if current else None,
        requested_doctor_id=requested.id if requested else None,
        reason=data.reason.strip(),
    )
    db.add(row)
    db.flush()
    admins = db.scalars(select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))).all()
    for admin in admins:
        db.add(Notification(
            recipient_user_id=admin.id,
            type="DOCTOR_CHANGE_REQUEST",
            title="Doctor change request",
            message="A patient requested a change to their assigned doctor.",
            reference_id=str(row.id),
        ))
    audit(db, user, "DOCTOR_CHANGE_REQUESTED", "DoctorChangeRequest", row.id)
    db.commit()
    db.refresh(row)
    return _change_out(row, db)


@router.put("/doctor-change-requests/{request_id}")
def resolve_change_request(
    request_id: UUID,
    data: ChangeResolutionIn,
    admin=Depends(require_admin),
    db: Session = Depends(get_db),
):
    row = db.get(DoctorChangeRequest, request_id)
    if not row:
        raise HTTPException(404, "Doctor change request not found")
    if row.status != "PENDING":
        raise HTTPException(409, "Doctor change request is already resolved")
    status = data.status.strip().upper()
    if status not in {"APPROVED", "REJECTED"}:
        raise HTTPException(422, "Status must be APPROVED or REJECTED")
    selected = _doctor_by_user_id(db, data.doctor_id) if data.doctor_id else (
        db.get(DoctorProfile, row.requested_doctor_id) if row.requested_doctor_id else None
    )
    if status == "APPROVED":
        if not selected or not selected.is_approved:
            raise HTTPException(422, "Select an approved doctor before approving")
        current = db.scalars(select(Assignment).where(
            Assignment.patient_id == row.patient_id, Assignment.status == "ACTIVE"
        )).all()
        now_value = datetime.now(timezone.utc)
        for assignment in current:
            assignment.status = "INACTIVE"
            assignment.unassigned_at = now_value
        # Flush the deactivation first so the partial unique index cannot see
        # two active assignments during the reassignment transaction.
        db.flush()
        db.add(Assignment(
            patient_id=row.patient_id,
            doctor_id=selected.id,
            assigned_by=admin.id,
        ))
    row.status = status
    row.resolution_note = data.resolution_note.strip() or None
    row.resolved_by = admin.id
    row.resolved_at = datetime.now(timezone.utc)
    patient = db.get(PatientProfile, row.patient_id)
    if patient:
        db.add(Notification(
            recipient_user_id=patient.user_id,
            type="DOCTOR_CHANGE_RESOLVED",
            title=f"Doctor change request {status.lower()}",
            message=row.resolution_note or f"Your doctor change request was {status.lower()}.",
            reference_id=str(row.id),
        ))
    audit(db, admin, f"DOCTOR_CHANGE_{status}", "DoctorChangeRequest", row.id)
    db.commit()
    return _change_out(row, db)


@router.post("/ratings")
def rate_doctor(data: RatingIn, user=Depends(get_current_user), db: Session = Depends(get_db)):
    if user.role != UserRole.PATIENT:
        raise HTTPException(403, "Patient access required")
    patient = _patient(user, db)
    doctor = _doctor_by_user_id(db, data.doctor_id)
    if not doctor or not _active_assignment(db, patient.id, doctor.id):
        raise HTTPException(403, "Only your currently assigned doctor can be rated")
    row = db.scalar(select(DoctorRating).where(
        DoctorRating.patient_id == patient.id,
        DoctorRating.doctor_id == doctor.id,
        DoctorRating.report_id == data.report_id,
    ))
    if row is None:
        row = DoctorRating(patient_id=patient.id, doctor_id=doctor.id, report_id=data.report_id, rating=data.rating)
        db.add(row)
        db.flush()
    row.rating = data.rating
    row.comment = data.comment.strip() or None
    audit(db, user, "DOCTOR_RATED", "DoctorRating", row.id, {"rating": data.rating})
    db.commit()
    db.refresh(row)
    return {"id": str(row.id), "rating": row.rating, "comment": row.comment, "updatedAt": row.updated_at.isoformat()}


@router.get("/doctors/{doctor_user_id}/rating")
def doctor_rating(doctor_user_id: UUID, user=Depends(get_current_user), db: Session = Depends(get_db)):
    doctor = _doctor_by_user_id(db, doctor_user_id)
    if not doctor:
        raise HTTPException(404, "Doctor not found")
    average, count = db.execute(
        select(func.avg(DoctorRating.rating), func.count(DoctorRating.id)).where(DoctorRating.doctor_id == doctor.id)
    ).one()
    return {"doctorId": str(doctor.user_id), "averageRating": round(float(average), 2) if average is not None else None, "ratingCount": int(count)}
