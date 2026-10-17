from sqlalchemy import select
from sqlalchemy.orm import Session
from fastapi import HTTPException

from ..models.entities import Assignment, DoctorProfile, Notification, User, now
from .audit_service import audit


def choose_doctor(db: Session, patient, doctor: DoctorProfile, actor: User, source: str):
    """Call after locking the patient row; unique ACTIVE index is the final race guard."""
    doctor_user = db.get(User, doctor.user_id)
    if not doctor.is_approved or not doctor_user or not doctor_user.is_active:
        raise HTTPException(409, "This doctor is not currently available")
    current = db.scalar(select(Assignment).where(
        Assignment.patient_id == patient.id, Assignment.status == "ACTIVE"
    ))
    if current:
        if current.doctor_id != doctor.id:
            raise HTTPException(409, "An active doctor is already assigned. Contact support to change your care team.")
        patient.doctor_assignment_requested_at = None
        return current
    assignment = Assignment(patient_id=patient.id, doctor_id=doctor.id, assigned_by=actor.id)
    db.add(assignment)
    patient.doctor_assignment_requested_at = None
    db.flush()
    audit(db, actor, "DOCTOR_SELECTED" if source == "PATIENT" else "PATIENT_ASSIGNED", "Assignment", assignment.id,
          {"patient_id": str(patient.id), "doctor_id": str(doctor.id), "source": source})
    patient_user = db.get(User, patient.user_id)
    db.add(Notification(recipient_user_id=doctor_user.id, type="PATIENT_ASSIGNED", title="New patient in your care team",
                        message="A patient is now assigned to your NeuroMind care team. Reports are shared separately by the patient.",
                        reference_id=str(patient.id)))
    db.add(Notification(recipient_user_id=patient_user.id, type="DOCTOR_ASSIGNED", title="Doctor selected",
                        message=f"{doctor_user.first_name} {doctor_user.last_name} is now your NeuroMind doctor. You choose which reports to share.",
                        reference_id=str(doctor.id)))
    return assignment
