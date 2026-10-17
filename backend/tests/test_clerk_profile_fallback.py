from types import SimpleNamespace

import pytest
from fastapi import HTTPException

from app.api.v1 import auth


class _Response:
    def __init__(self, payload):
        self._payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self._payload


def test_clerk_profile_uses_primary_verified_identity(monkeypatch):
    monkeypatch.setattr(auth, "settings", SimpleNamespace(clerk_secret_key="sk_test_server"))
    captured = {}

    def fake_get(url, *, headers, timeout):
        captured.update(url=url, headers=headers, timeout=timeout)
        return _Response(
            {
                "primary_email_address_id": "id_primary",
                "email_addresses": [
                    {"id": "id_other", "email_address": "other@example.com"},
                    {"id": "id_primary", "email_address": " Patient@Example.com "},
                ],
                "first_name": "Ada",
                "last_name": "Lovelace",
            }
        )

    monkeypatch.setattr(auth.httpx, "get", fake_get)

    profile = auth._clerk_backend_profile("user/unsafe value")

    assert profile == {
        "email": "patient@example.com",
        "first_name": "Ada",
        "last_name": "Lovelace",
    }
    assert captured["url"].endswith("/user%2Funsafe%20value")
    assert captured["headers"] == {"Authorization": "Bearer sk_test_server"}
    assert captured["timeout"] == 5.0


def test_clerk_profile_is_optional_without_server_secret(monkeypatch):
    monkeypatch.setattr(auth, "settings", SimpleNamespace(clerk_secret_key=""))
    assert auth._clerk_backend_profile("user_123") is None


def test_clerk_profile_requires_primary_email(monkeypatch):
    monkeypatch.setattr(auth, "settings", SimpleNamespace(clerk_secret_key="sk_test_server"))
    monkeypatch.setattr(auth.httpx, "get", lambda *args, **kwargs: _Response({"email_addresses": []}))

    with pytest.raises(HTTPException) as exc_info:
        auth._clerk_backend_profile("user_123")

    assert exc_info.value.status_code == 422
    assert "primary email" in exc_info.value.detail.lower()
