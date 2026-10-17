from uuid import uuid4

from fastapi.testclient import TestClient

from app.core.config import settings
from app.core.security import create_refresh_token
from app.main import app, ensure_initial_admin
from app.models.entities import UserRole


def test_admin_bootstrap_doctor_approval_and_login():
    ensure_initial_admin()
    email = f"doctor-{uuid4().hex[:10]}@hospital.example"
    password = "DoctorTest@123!"

    with TestClient(app) as client:
        admin_login = client.post("/api/v1/auth/login", json={
            "email": settings.initial_admin_email,
            "password": settings.initial_admin_password,
        })
        assert admin_login.status_code == 200
        assert client.cookies.get("neuromind_access")
        assert client.cookies.get("neuromind_refresh")
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        readiness = client.get("/api/v1/admin/ai-readiness", headers=admin_headers)
        assert readiness.status_code == 200
        assert len(readiness.json()["models"]) == 5
        assert "knowledge" in readiness.json()

        malformed_refresh = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": create_refresh_token("not-a-uuid", UserRole.ADMIN)},
        )
        assert malformed_refresh.status_code == 401
        assert client.get("/api/v1/ai/assessments/not-a-uuid/status", headers=admin_headers).status_code == 400

        registration = client.post("/api/v1/auth/register-doctor", json={
            "name": "Dr. Integration Test",
            "email": email,
            "password": password,
            "institution": "NeuroMind Test Hospital",
            "department": "Neurology",
            "licenseNumber": f"TEST-{uuid4().hex[:12]}",
            "specialization": "Memory Disorders",
        })
        assert registration.status_code == 200
        doctor_id = registration.json()["user"]["id"]

        pending_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert pending_login.status_code == 403

        approval = client.put(f"/api/v1/admin/doctors/{doctor_id}/approve", headers=admin_headers)
        assert approval.status_code == 200
        assert approval.json()["status"] == "ACTIVE"

        doctor_login = client.post("/api/v1/auth/login", json={"email": email, "password": password})
        assert doctor_login.status_code == 200
        assert doctor_login.json()["user"]["role"] == "DOCTOR"
        doctor_headers = {"Authorization": f"Bearer {doctor_login.json()['access_token']}"}
        assert client.get("/api/v1/doctors/me", headers=doctor_headers).status_code == 200
        assert client.get("/api/v1/doctors/me").status_code == 200

        cookie_refresh = client.post("/api/v1/auth/refresh")
        assert cookie_refresh.status_code == 200
        assert client.cookies.get("neuromind_access")

        rejected_origin = client.post(
            "/api/v1/auth/refresh",
            headers={"Origin": "https://malicious.example"},
        )
        assert rejected_origin.status_code == 403

        logout = client.post("/api/v1/auth/logout", headers=doctor_headers)
        assert logout.status_code == 200
        assert client.cookies.get("neuromind_access") is None
        assert client.cookies.get("neuromind_refresh") is None
        assert client.get("/api/v1/doctors/me", headers=doctor_headers).status_code == 401
        revoked_refresh = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": doctor_login.json()["refresh_token"]},
        )
        assert revoked_refresh.status_code == 401

        audit_log = client.get("/api/v1/admin/audit-logs?limit=20", headers=admin_headers)
        assert audit_log.status_code == 200
        assert audit_log.json()["total"] >= 2
        approved_entry = next(item for item in audit_log.json()["items"] if item["action"] == "DOCTOR_APPROVED")
        assert approved_entry["entityId"]
