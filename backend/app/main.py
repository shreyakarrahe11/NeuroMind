import logging
import uuid
from contextlib import asynccontextmanager
from time import perf_counter

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from .core.config import settings
from .core.database import SessionLocal
from .api.router import api, legacy
from .ai.model_registry import inference_ready
from .services.admin_bootstrap import ensure_admin
from .services.task_dispatcher import task_queue_ready

logger = logging.getLogger("neuromind.startup")

def ensure_initial_admin():
    if not settings.auto_create_initial_admin or not settings.initial_admin_password:
        return
    db = SessionLocal()
    try:
        ensure_admin(db, settings.initial_admin_email, settings.initial_admin_password)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(_app: FastAPI):
    validation_errors = settings.validate_runtime()
    if validation_errors:
        raise RuntimeError("Unsafe production configuration: " + "; ".join(validation_errors))
    settings.storage_dir.mkdir(parents=True, exist_ok=True)
    for name in ["audio", "processed_audio", "reports", "temporary"]:
        (settings.storage_dir / name).mkdir(parents=True, exist_ok=True)
    settings.knowledge_dir.mkdir(parents=True, exist_ok=True)
    # Tables are created by Alembic, not by application startup. This keeps
    # schema changes versioned and prevents accidental drift.
    try:
        ensure_initial_admin()
    except Exception as exc:
        # A fresh PostgreSQL instance may not have migrations applied yet.
        # The app still starts so the operator can run `alembic upgrade head`.
        logger.warning("Initial admin was not synchronized: %s", exc)
    yield


app = FastAPI(
    title=settings.app_name,
    version="2.1.0",
    description="NeuroMind AI-assisted dementia risk screening backend",
    lifespan=lifespan,
    docs_url="/docs" if settings.api_docs_enabled else None,
    redoc_url="/redoc" if settings.api_docs_enabled else None,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


@app.middleware("http")
async def security_and_trace_headers(request: Request, call_next):
    request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
    request.state.request_id = request_id
    started = perf_counter()
    if request.method in {"POST", "PUT", "PATCH", "DELETE"}:
        origin = request.headers.get("Origin")
        if origin and origin not in settings.origins:
            return JSONResponse(
                {"detail": "Request origin is not authorized"},
                status_code=403,
                headers={"X-Request-ID": request_id},
            )
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((perf_counter() - started) * 1000, 2)
        logger.exception(
            "request_failed request_id=%s method=%s path=%s duration_ms=%s",
            request_id,
            request.method,
            request.url.path,
            duration_ms,
        )
        raise
    duration_ms = round((perf_counter() - started) * 1000, 2)
    logger.info(
        "request_complete request_id=%s method=%s path=%s status=%s duration_ms=%s",
        request_id,
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    response.headers["X-Request-ID"] = request_id
    response.headers["X-Response-Time-Ms"] = str(duration_ms)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), geolocation=(), payment=()"
    response.headers["Cache-Control"] = "no-store"
    if settings.is_production:
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


app.include_router(api)
app.include_router(legacy)


@app.get("/health")
def health():
    return {"status": "ok", "service": "neuromind-api"}


@app.get("/health/live")
def health_live():
    return {"status": "ok", "service": "neuromind-api"}


@app.get("/health/ready")
def health_ready():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        database_ready = True
    except Exception:
        database_ready = False
    finally:
        db.close()
    models_ready = inference_ready()
    queue_ready = task_queue_ready()
    body = {
        "status": "ready" if database_ready else "not_ready",
        "database": "connected" if database_ready else "unavailable",
        "inference": "ready" if models_ready else "pending_model",
        "taskQueue": "ready" if queue_ready else "unavailable",
        "reportProvider": "configured" if settings.gemini_api_key else "not_configured",
    }
    ready = database_ready and queue_ready
    if settings.is_production or settings.require_models_for_readiness:
        ready = ready and models_ready and bool(settings.gemini_api_key)
    body["status"] = "ready" if ready else "not_ready"
    return JSONResponse(body, status_code=200 if ready else 503)


@app.get("/health/db")
def health_db():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ok", "database": "connected"}
    except Exception:
        return JSONResponse(
            {"status": "error", "database": "unavailable"}, status_code=503
        )
    finally:
        db.close()
