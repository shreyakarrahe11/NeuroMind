from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.services.rate_limit import enforce_rate_limit


def test_development_rate_limit_returns_retry_after():
    request = Request({"type": "http", "headers": [], "client": ("127.0.0.1", 12345)})
    scope = f"test-{uuid4()}"

    enforce_rate_limit(request, scope, actor="test-user", limit=2, window_seconds=60)
    enforce_rate_limit(request, scope, actor="test-user", limit=2, window_seconds=60)
    with pytest.raises(HTTPException) as error:
        enforce_rate_limit(request, scope, actor="test-user", limit=2, window_seconds=60)

    assert error.value.status_code == 429
    assert int(error.value.headers["Retry-After"]) > 0
