
from uuid import uuid4
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base,engine
Base.metadata.create_all(engine)
client=TestClient(app)

def test_health(): assert client.get("/health").status_code==200

def test_patient_registration_is_clerk_only():
    r=client.post("/api/v1/auth/register",json={"name":"Test Patient","email":"patient@example.org","password":"TestPass123!"})
    assert r.status_code==410

def test_admin_endpoint_requires_role():
    assert client.get("/api/v1/admin/dashboard").status_code==401
