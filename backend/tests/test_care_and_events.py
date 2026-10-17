from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.database import Base, SessionLocal, engine
from app.core.security import create_access_token
from app.main import app, ensure_initial_admin
from app.models.entities import (
    Assignment,
    DoctorProfile,
    PatientProfile,
    User,
    UserRole,
)


Base.metadata.create_all(engine)


def _headers(user):
    return {"Authorization": f"Bearer {create_access_token(str(user.id), user.role)}"}


def _care_fixture():
    ensure_initial_admin()
    db = SessionLocal()
    suffix = uuid4().hex[:10]
    patient_user = User(
        email=f"patient-{suffix}@example.org",
        role=UserRole.PATIENT,
        first_name="Care",
        last_name="Patient",
        auth_provider="clerk",
        clerk_user_id=f"clerk-{suffix}",
        is_active=True,
        is_verified=True,
    )
    doctor_user = User(
        email=f"doctor-{suffix}@example.org",
        role=UserRole.DOCTOR,
        first_name="Care",
        last_name="Doctor",
        is_active=True,
        is_verified=True,
    )
    second_doctor_user = User(
        email=f"doctor2-{suffix}@example.org",
        role=UserRole.DOCTOR,
        first_name="Second",
        last_name="Doctor",
        is_active=True,
        is_verified=True,
    )
    db.add_all([patient_user, doctor_user, second_doctor_user])
    db.flush()
    patient = PatientProfile(user_id=patient_user.id)
    doctor = DoctorProfile(
        user_id=doctor_user.id,
        doctor_code=f"CARE-{suffix}",
        license_number=f"LIC-{suffix}",
        is_approved=True,
    )
    second_doctor = DoctorProfile(
        user_id=second_doctor_user.id,
        doctor_code=f"CARE2-{suffix}",
        license_number=f"LIC2-{suffix}",
        is_approved=True,
    )
    db.add_all([patient, doctor, second_doctor])
    db.flush()
    admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
    db.add(Assignment(patient_id=patient.id, doctor_id=doctor.id, assigned_by=admin.id))
    db.commit()
    db.refresh(patient_user)
    db.refresh(doctor_user)
    db.refresh(second_doctor_user)
    db.refresh(admin)
    result = patient_user, doctor_user, second_doctor_user, admin
    db.close()
    return result


def test_secure_messages_change_request_and_rating_flow():
    patient, doctor, second_doctor, admin = _care_fixture()
    with TestClient(app) as client:
        created = client.post(
            "/api/v1/care/messages",
            headers=_headers(patient),
            json={"recipient_id": str(doctor.id), "body": "Could we discuss my report?"},
        )
        assert created.status_code == 201
        assert created.json()["body"] == "Could we discuss my report?"

        thread = client.get(f"/api/v1/care/messages/{patient.id}", headers=_headers(doctor))
        assert thread.status_code == 200
        assert thread.json()[0]["readAt"] is not None

        requested = client.post(
            "/api/v1/care/doctor-change-requests",
            headers=_headers(patient),
            json={"reason": "I need a specialist with a different clinic schedule.", "requested_doctor_id": str(second_doctor.id)},
        )
        assert requested.status_code == 201
        request_id = requested.json()["id"]

        resolved = client.put(
            f"/api/v1/care/doctor-change-requests/{request_id}",
            headers=_headers(admin),
            json={"status": "APPROVED", "doctor_id": str(second_doctor.id), "resolution_note": "Approved after care review."},
        )
        assert resolved.status_code == 200
        assert resolved.json()["status"] == "APPROVED"

        rating = client.post(
            "/api/v1/care/ratings",
            headers=_headers(patient),
            json={"doctor_id": str(second_doctor.id), "rating": 5, "comment": "Very clear communication."},
        )
        assert rating.status_code == 200
        assert rating.json()["rating"] == 5


def test_attention_clicks_are_normalized_as_assessment_events():
    patient, _, _, _ = _care_fixture()
    headers = _headers(patient)
    with TestClient(app) as client:
        created = client.post("/api/v1/assessments", headers=headers, json={"patientInfo": {}})
        assert created.status_code == 200
        assessment_id = created.json()["sessionId"]
        response = client.post(
            f"/api/v1/assessments/{assessment_id}/attention",
            headers=headers,
            json={
                "attentionData": {
                    "startedAt": "2026-09-21T10:00:00Z",
                    "completedAt": "2026-09-21T10:01:00Z",
                    "totalDurationMs": 60000,
                    "digitSpanMaxScore": 4,
                    "reactionTimeMedianMs": 320,
                    "visualAttention": {
                        "hits": 1,
                        "misses": 0,
                        "falseAlarms": 0,
                        "meanResponseTimeMs": 450,
                        "rawResponses": [{
                            "occurredAt": "2026-09-21T10:00:45Z",
                            "elapsedMs": 45000,
                            "mediaTimeMs": 12450,
                            "outcome": "hit",
                            "targetWindowIndex": 0,
                            "reactionTimeMs": 450,
                        }],
                    },
                }
            },
        )
        assert response.status_code == 200
        events = client.get(f"/api/v1/assessments/{assessment_id}/events", headers=headers)
        assert events.status_code == 200
        event_types = [item["eventType"] for item in events.json()]
        assert "VISUALATTENTION_TARGET_CLICK" in event_types
        assert "SECTION_COMPLETED" in event_types


def test_patient_profile_update_persists_validated_demographics():
    patient, _, _, _ = _care_fixture()
    headers = _headers(patient)
    with TestClient(app) as client:
        updated = client.put(
            "/api/v1/patients/me",
            headers=headers,
            json={
                "name": "Updated Patient",
                "dateOfBirth": "1955-04-12",
                "gender": "Prefer not to say",
                "education": "Graduate",
                "occupation": "Retired teacher",
                "phone": "+91 9000000000",
            },
        )
        assert updated.status_code == 200
        payload = updated.json()
        assert payload["name"] == "Updated Patient"
        assert payload["dateOfBirth"] == "1955-04-12"
        assert payload["education"] == "Graduate"

        rejected = client.put(
            "/api/v1/patients/me",
            headers=headers,
            json={"dateOfBirth": "2015-01-01", "unexpected": "field"},
        )
        assert rejected.status_code == 422


def test_lifestyle_submission_rejects_inconsistent_medical_history():
    patient, _, _, _ = _care_fixture()
    headers = _headers(patient)
    with TestClient(app) as client:
        created = client.post("/api/v1/assessments", headers=headers, json={"patientInfo": {}})
        assessment_id = created.json()["sessionId"]
        response = client.post(
            f"/api/v1/assessments/{assessment_id}/lifestyle",
            headers=headers,
            json={
                "lifestyleData": {
                    "sleepHours": "7-8",
                    "sleepQuality": "Good",
                    "exerciseHoursWeek": "3-5",
                    "smoking": False,
                    "alcoholUse": "None",
                    "hypertension": True,
                    "medicalHistory": ["None"],
                }
            },
        )
        assert response.status_code == 422
