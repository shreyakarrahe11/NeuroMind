from uuid import UUID
from functools import lru_cache
from urllib.parse import quote

import httpx
import jwt
from jwt import PyJWKClient
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ...core.config import settings
from ...core.database import get_db
from ...core.dependencies import get_current_user
from ...core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from ...models.entities import (
    AccountStatus,
    DoctorProfile,
    Notification,
    PatientProfile,
    User,
    UserRole,
    LoginEvent,
)
from ...schemas.common import ClerkExchange, Login, Refresh, RegisterDoctor, RegisterPatient
from ...utils.serializers import user_out
from ...services.audit_service import audit
from ...services.rate_limit import enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["Authentication"])

ACCESS_COOKIE = "neuromind_access"
REFRESH_COOKIE = "neuromind_refresh"


def _issue_session(response: Response, user: User) -> dict:
    access_token = create_access_token(str(user.id), user.role, user.token_version)
    refresh_token = create_refresh_token(str(user.id), user.token_version)
    cookie_options = {
        "httponly": True,
        "secure": settings.is_production,
        "samesite": "strict",
        "path": "/",
    }
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.access_token_expire_minutes * 60,
        **cookie_options,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.refresh_token_expire_days * 24 * 60 * 60,
        **cookie_options,
    )
    if settings.auth_return_tokens:
        return {"access_token": access_token, "refresh_token": refresh_token}
    return {}


def _clear_session(response: Response):
    response.delete_cookie(ACCESS_COOKIE, path="/", secure=settings.is_production, httponly=True, samesite="strict")
    response.delete_cookie(REFRESH_COOKIE, path="/", secure=settings.is_production, httponly=True, samesite="strict")

def _record_login_event(db: Session, user: User | None, email: str, role: str | None, provider: str, request: Request, success: bool):
    now = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    event = LoginEvent(
        user_id=user.id if user else None,
        email=email,
        role=str(role) if role else None,
        auth_provider=provider,
        success=success,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        created_at=now,
    )
    db.add(event)
    if user and success:
        user.last_login_at = now


def _enforce_login_throttle(db: Session, email: str, request: Request):
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(minutes=settings.login_window_minutes)
    query = select(func.count()).select_from(LoginEvent).where(
        LoginEvent.email == email,
        LoginEvent.success.is_(False),
        LoginEvent.created_at >= since,
    )
    if request.client and request.client.host:
        query = query.where(LoginEvent.ip_address == request.client.host)
    failures = db.scalar(query) or 0
    if failures >= settings.login_max_failures:
        raise HTTPException(
            status_code=429,
            detail="Too many failed sign-in attempts. Try again later.",
            headers={"Retry-After": str(settings.login_window_minutes * 60)},
        )




def split_name(name: str):
    parts = name.strip().split()
    return (parts[0], " ".join(parts[1:])) if parts else ("", "")


def _doctor_code(db: Session, user_id: UUID) -> str:
    base = f"DOC-{str(user_id)[:8].upper()}"
    code = base
    n = 2
    while db.scalar(select(DoctorProfile).where(DoctorProfile.doctor_code == code)):
        code = f"{base}-{n}"
        n += 1
    return code


@lru_cache(maxsize=4)
def _clerk_jwks_client(url: str) -> PyJWKClient:
    return PyJWKClient(url, cache_keys=True)


def _clerk_verification_key(token: str):
    if settings.clerk_jwt_key.strip():
        return settings.clerk_jwt_key.replace("\\n", "\n")
    if settings.clerk_jwks_endpoint:
        try:
            return _clerk_jwks_client(settings.clerk_jwks_endpoint).get_signing_key_from_jwt(token).key
        except Exception as exc:
            detail = "Unable to verify the Clerk session signing key"
            if settings.debug:
                reason = str(exc).replace("\n", " ").strip()[:240]
                detail = f"{detail} ({exc.__class__.__name__}{f': {reason}' if reason else ''})"
            raise HTTPException(status_code=401, detail=detail) from exc
    raise HTTPException(
        status_code=503,
        detail="Clerk backend verification is not configured. Set CLERK_ISSUER, CLERK_JWKS_URL, or CLERK_JWT_KEY.",
    )


def _clerk_claims(token: str) -> dict:
    if not settings.has_clerk_verification:
        raise HTTPException(
            status_code=503,
            detail="Clerk backend verification is not configured. Set CLERK_ISSUER, CLERK_JWKS_URL, or CLERK_JWT_KEY.",
        )
    try:
        payload = jwt.decode(
            token,
            _clerk_verification_key(token),
            algorithms=["RS256"],
            issuer=settings.clerk_issuer or None,
            options={"verify_aud": False, "verify_iss": bool(settings.clerk_issuer)},
        )
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise
        raise HTTPException(status_code=401, detail="Invalid or expired Clerk session") from exc

    if settings.clerk_parties:
        azp = payload.get("azp") or payload.get("authorized_party")
        if not azp or azp not in settings.clerk_parties:
            raise HTTPException(status_code=401, detail="Clerk session origin is not authorized")

    if not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Clerk session does not contain a user identifier")
    if payload.get("sts") == "pending":
        raise HTTPException(status_code=403, detail="Clerk session is pending and cannot access patient data")
    return payload


def _clerk_backend_profile(clerk_user_id: str) -> dict | None:
    """Resolve verified identity data when custom session claims are absent."""
    secret = settings.clerk_secret_key.strip()
    if not secret:
        return None
    try:
        response = httpx.get(
            f"https://api.clerk.com/v1/users/{quote(clerk_user_id, safe='')}",
            headers={"Authorization": f"Bearer {secret}"},
            timeout=5.0,
        )
        response.raise_for_status()
        profile = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status_code=503,
            detail="Clerk user profile lookup is temporarily unavailable",
        ) from exc

    primary_id = profile.get("primary_email_address_id")
    addresses = profile.get("email_addresses") or []
    primary = next((item for item in addresses if item.get("id") == primary_id), None)
    if primary is None and len(addresses) == 1:
        primary = addresses[0]
    email = str((primary or {}).get("email_address") or "").strip().lower()
    if not email:
        raise HTTPException(
            status_code=422,
            detail="The Clerk account does not have a primary email address",
        )
    return {
        "email": email,
        "first_name": str(profile.get("first_name") or "").strip(),
        "last_name": str(profile.get("last_name") or "").strip(),
    }


@router.post("/register")
def register_patient(d: RegisterPatient, db: Session = Depends(get_db)):
    raise HTTPException(410, "Patient registration is Clerk-only. Use the Patient portal.")


@router.post("/clerk/exchange")
def clerk_exchange(payload: ClerkExchange, request: Request, response: Response, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "clerk-exchange", limit=30, window_seconds=60)
    claims = _clerk_claims(payload.token.strip())
    clerk_user_id = str(claims["sub"])
    backend_profile = None
    verified_email = str(
        claims.get("email")
        or claims.get("primary_email_address")
        or claims.get("primaryEmail")
        or ""
    ).strip().lower()
    if not verified_email:
        backend_profile = _clerk_backend_profile(clerk_user_id)
        if backend_profile:
            verified_email = backend_profile["email"]
    if not verified_email:
        raise HTTPException(
            status_code=422,
            detail="Patient identity needs an email. Add the email session claim in Clerk or configure CLERK_SECRET_KEY in backend/.env.",
        )
    email = verified_email

    first_name = str(claims.get("first_name") or (backend_profile or {}).get("first_name") or payload.first_name or "NeuroMind").strip()
    last_name = str(claims.get("last_name") or (backend_profile or {}).get("last_name") or payload.last_name or "Patient").strip()

    user = db.scalar(select(User).where(User.clerk_user_id == clerk_user_id))
    if not user:
        email_owner = db.scalar(select(User).where(User.email == email))
        user = email_owner

    if user and user.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=409,
            detail="This email is already registered as a clinical/admin account. Use the corresponding portal.",
        )

    if not user:
        user = User(
            email=email,
            password_hash=None,
            role=UserRole.PATIENT,
            first_name=first_name,
            last_name=last_name,
            auth_provider="clerk",
            clerk_user_id=clerk_user_id,
            is_active=True,
            is_verified=True,
        )
        db.add(user)
        db.flush()
        db.add(PatientProfile(user_id=user.id))
    else:
        user.clerk_user_id = clerk_user_id
        user.auth_provider = "clerk"
        user.first_name = first_name or user.first_name
        user.last_name = last_name or user.last_name
        user.is_active = True
        user.is_verified = True
        if not user.patient_profile:
            db.add(PatientProfile(user_id=user.id))

    _record_login_event(db, user, email, user.role, "clerk", request, True)
    db.commit()
    db.refresh(user)
    return {
        "success": True,
        "user": user_out(user),
        "provider": "clerk",
        **_issue_session(response, user),
    }


@router.post("/register-doctor")
def register_doctor(d: RegisterDoctor, request: Request, db: Session = Depends(get_db)):
    enforce_rate_limit(request, "doctor-registration", limit=5, window_seconds=3600)
    email = d.email.lower().strip()
    if db.scalar(select(User).where(User.email == email)):
        raise HTTPException(409, "Email already registered")
    if db.scalar(select(DoctorProfile).where(DoctorProfile.license_number == d.licenseNumber)):
        raise HTTPException(409, "Medical license number is already registered")

    fn, ln = split_name(d.name)
    user = User(
        email=email,
        password_hash=hash_password(d.password),
        role=UserRole.DOCTOR,
        first_name=fn,
        last_name=ln,
        phone=d.phone,
        is_active=False,
        is_verified=False,
        auth_provider="local",
        account_status=AccountStatus.PENDING,
    )
    db.add(user)
    db.flush()
    doctor = DoctorProfile(
        user_id=user.id,
        doctor_code=_doctor_code(db, user.id),
        specialization=d.specialization,
        qualification=d.qualification if hasattr(d, "qualification") else "",
        license_number=d.licenseNumber,
        hospital_clinic=d.institution,
        city=d.city.strip() or None,
        area=d.area.strip() or None,
        years_of_experience=d.yearsOfExperience,
        bio=d.bio,
        is_approved=False,
    )
    db.add(doctor)
    db.flush()

    admins = db.scalars(
        select(User).where(User.role == UserRole.ADMIN, User.is_active.is_(True))
    ).all()
    for admin in admins:
        db.add(
            Notification(
                recipient_user_id=admin.id,
                type="DOCTOR_APPLICATION",
                title="New Doctor Registration",
                message=f"{fn} {ln} submitted a doctor registration application for verification.",
                reference_id=str(doctor.id),
            )
        )
    db.commit()
    db.refresh(user)

    return {
        "success": True,
        "status": "PENDING",
        "message": "Doctor registration submitted. An administrator must approve the application before sign-in is activated.",
        "loginId": email,
        "doctorCode": doctor.doctor_code,
        "user": user_out(user),
    }


@router.post("/login")
def login(d: Login, request: Request, response: Response, db: Session = Depends(get_db)):
    email = d.email.lower().strip()
    _enforce_login_throttle(db, email, request)
    user = db.scalar(select(User).where(User.email == email))
    if not user:
        _record_login_event(db, None, email, None, "local", request, False)
        db.commit()
        if settings.debug and email == settings.initial_admin_email.lower().strip():
            raise HTTPException(401, "Admin account is not initialized. Run `npm run db:admin`, then sign in again.")
        raise HTTPException(401, "Invalid credentials")
    if user.auth_provider == "clerk" and user.role == UserRole.PATIENT:
        raise HTTPException(400, "Patient accounts use Clerk sign-in on the Patient portal")
    if not user.password_hash or not verify_password(d.password, user.password_hash):
        _record_login_event(db, user, email, user.role, user.auth_provider, request, False)
        db.commit()
        if settings.debug and user.role == UserRole.ADMIN:
            raise HTTPException(401, "Admin password is not synchronized. Run `npm run db:admin`, then use the credentials from backend/.env.")
        raise HTTPException(401, "Invalid credentials")
    if not user.is_active:
        _record_login_event(db, user, email, user.role, user.auth_provider, request, False)
        db.commit()
        if user.role == UserRole.DOCTOR and user.account_status == AccountStatus.PENDING:
            raise HTTPException(403, "Doctor account is pending administrator approval")
        raise HTTPException(403, "Account is not active")
    if user.role == UserRole.DOCTOR and user.doctor_profile and not user.doctor_profile.is_approved:
        _record_login_event(db, user, email, user.role, user.auth_provider, request, False)
        db.commit()
        raise HTTPException(403, "Doctor account is pending administrator approval")

    user.is_verified = True
    _record_login_event(db, user, email, user.role, user.auth_provider, request, True)
    db.commit()
    return {
        "success": True,
        "user": user_out(user),
        **_issue_session(response, user),
    }


@router.post("/refresh")
def refresh(request: Request, response: Response, d: Refresh | None = None, db: Session = Depends(get_db)):
    refresh_token = (d.refresh_token if d else None) or request.cookies.get(REFRESH_COOKIE)
    if not refresh_token:
        raise HTTPException(401, "Refresh token required")
    try:
        payload = decode_token(refresh_token)
        subject = payload.get("sub")
        if not subject:
            raise ValueError("Missing token subject")
        user_id = UUID(subject)
    except Exception:
        raise HTTPException(401, "Invalid refresh token")
    if payload.get("type") != "refresh":
        raise HTTPException(401, "Invalid refresh token")
    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(401, "Account unavailable")
    if payload.get("ver") != user.token_version:
        raise HTTPException(401, "Refresh token has been revoked")
    return {"success": True, **_issue_session(response, user)}


@router.post("/logout")
def logout(response: Response, user=Depends(get_current_user), db: Session = Depends(get_db)):
    user.token_version += 1
    user.last_logout_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    audit(db, user, "USER_LOGOUT", "User", user.id)
    db.commit()
    _clear_session(response)
    return {"success": True}


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {"success": True, "user": user_out(user)}
