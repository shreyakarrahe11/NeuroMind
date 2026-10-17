from uuid import UUID

from fastapi import Depends, HTTPException, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from .database import get_db
from .security import decode_token
from ..models.entities import User, UserRole

bearer = HTTPBearer(auto_error=False)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Depends(bearer),
    db: Session = Depends(get_db),
):
    token = credentials.credentials if credentials else request.cookies.get("neuromind_access")
    if not token:
        raise HTTPException(status_code=401, detail="Authentication required")
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Access token required")
        subject = payload.get("sub")
        if not subject:
            raise ValueError("Missing token subject")
        user = db.get(User, UUID(subject))
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="Account unavailable")
    if payload.get("ver") != user.token_version:
        raise HTTPException(status_code=401, detail="Session has been revoked")
    return user


def require_roles(*roles):
    def dependency(user=Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user

    return dependency


require_user = require_roles(UserRole.PATIENT, UserRole.DOCTOR, UserRole.ADMIN)
require_doctor = require_roles(UserRole.DOCTOR)
require_admin = require_roles(UserRole.ADMIN)
