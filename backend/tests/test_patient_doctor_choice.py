"""Database-backed role and request flow; requires a disposable test Postgres."""
from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token
from app.main import app, ensure_initial_admin
from app.models.entities import DoctorProfile, PatientProfile, User, UserRole


def authorization(user):
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role)}"}


def test_patient_choice_assistance_queue_and_report_consent():
    Base.metadata.create_all(engine)
    ensure_initial_admin()
    suffix = uuid4().hex[:10]
    with SessionLocal() as db:
        patient = User(email=f"choice-{suffix}@example.org", first_name="Patient", role=UserRole.PATIENT,
                       auth_provider="clerk", clerk_user_id=f"choice-{suffix}", is_active=True)
        doctor = User(email=f"doctor-{suffix}@example.org", first_name="Doctor", role=UserRole.DOCTOR, is_active=True)
        db.add_all([patient, doctor]); db.flush()
        db.add(PatientProfile(user_id=patient.id))
        db.add(DoctorProfile(user_id=doctor.id, doctor_code=f"D-{suffix}",
                             license_number=f"L-{suffix}", specialization="Neurology",
                             city="Bengaluru", area="Indiranagar", years_of_experience=12,
                             is_approved=True))
        db.commit()
        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        patient_id, doctor_id, admin_id = patient.id, doctor.id, admin.id

    with SessionLocal() as db:
        patient = db.get(User, patient_id)
        doctor = db.get(User, doctor_id)
        admin = db.get(User, admin_id)
        with TestClient(app) as client:
            directory = client.get("/api/v1/doctors?city=Bengaluru&min_experience=10", headers=authorization(patient))
            assert directory.status_code == 200
            assert any(item["id"] == str(doctor_id) for item in directory.json())

            request = client.post("/api/v1/patients/me/doctor-assistance", headers=authorization(patient))
            assert request.status_code == 200
            assert request.json()["doctorAssistanceRequestedAt"]
            queue = client.get("/api/v1/admin/doctor-assistance-requests", headers=authorization(admin))
            assert any(item["id"] == str(patient_id) for item in queue.json())
            assert client.get("/api/v1/admin/doctor-assistance-requests", headers=authorization(patient)).status_code == 403

            choice = client.post("/api/v1/patients/me/doctor-choice", headers=authorization(patient),
                                 json={"doctor_id": str(doctor_id)})
            assert choice.status_code == 200
            assert choice.json()["assignedDoctorId"] == str(doctor_id)
            assert choice.json()["doctorAssistanceRequestedAt"] is None
            repeat = client.post("/api/v1/patients/me/doctor-choice", headers=authorization(patient),
                                 json={"doctor_id": str(doctor_id)})
            assert repeat.status_code == 200
            assert client.post("/api/v1/patients/me/doctor-assistance", headers=authorization(patient)).status_code == 409
            assert client.post("/api/v1/admin/assignments", headers=authorization(admin),
                               json={"patient_id": str(patient_id), "doctor_id": str(doctor_id)}).status_code == 409
