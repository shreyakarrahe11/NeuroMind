"""Shared fixed-window rate limits for expensive or abuse-sensitive actions."""

from collections import defaultdict
from functools import lru_cache
from hashlib import sha256
from threading import Lock
from time import time

from fastapi import HTTPException, Request

from ..core.config import settings


_memory_counts: dict[str, int] = defaultdict(int)
_memory_lock = Lock()


@lru_cache(maxsize=1)
def _redis_client():
    from redis import Redis

    return Redis.from_url(settings.redis_url, socket_connect_timeout=2, socket_timeout=2)


def _client_ip(request: Request) -> str:
    # The bundled reverse proxy overwrites X-Real-IP. Avoid trusting the first
    # X-Forwarded-For value, which a direct client can pre-populate.
    real_ip = request.headers.get("x-real-ip", "").strip()
    return real_ip or (request.client.host if request.client else "unknown")


def enforce_rate_limit(
    request: Request,
    scope: str,
    *,
    actor: object | None = None,
    limit: int,
    window_seconds: int,
) -> None:
    if not settings.rate_limit_enabled:
        return
    identity = str(actor or _client_ip(request))
    identity_hash = sha256(identity.encode("utf-8")).hexdigest()[:24]
    window = int(time()) // window_seconds
    key = f"neuromind:rate:{scope}:{identity_hash}:{window}"
    retry_after = window_seconds - (int(time()) % window_seconds)

    if settings.is_production:
        try:
            client = _redis_client()
            count = int(client.incr(key))
            if count == 1:
                client.expire(key, window_seconds + 5)
        except Exception as exc:
            raise HTTPException(503, "Request protection service is unavailable") from exc
    else:
        with _memory_lock:
            count = _memory_counts[key] + 1
            _memory_counts[key] = count

    if count > limit:
        raise HTTPException(
            429,
            f"Too many requests. Try again in {retry_after} seconds.",
            headers={"Retry-After": str(retry_after)},
        )
