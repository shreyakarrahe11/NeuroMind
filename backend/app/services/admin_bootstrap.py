from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.security import hash_password, verify_password
from ..models.entities import AccountStatus, User, UserRole


def ensure_admin(db: Session, email: str, password: str) -> tuple[User, bool]:
    """Create or repair the configured local administrator account.

    When automatic bootstrap is enabled, the environment credentials are the
    source of truth. This makes a changed/old database record recoverable while
    keeping production deployments able to disable bootstrap completely.
    """
    email = email.strip().lower()
    if not email:
        raise ValueError("Initial admin email is required")
    if len(password) < 12:
        raise ValueError("Initial admin password must be at least 12 characters")

    user = db.scalar(select(User).where(User.email == email))
    created = user is None
    if user and user.role != UserRole.ADMIN:
        raise ValueError(f"Admin email {email} already belongs to a non-admin account")

    if not user:
        user = User(
            email=email,
            password_hash=hash_password(password),
            role=UserRole.ADMIN,
            first_name="NeuroMind",
            last_name="Administrator",
            auth_provider="local",
        )
        db.add(user)
    elif not user.password_hash or not verify_password(password, user.password_hash):
        user.password_hash = hash_password(password)

    user.auth_provider = "local"
    user.account_status = AccountStatus.ACTIVE
    user.is_active = True
    user.is_verified = True
    db.commit()
    db.refresh(user)
    return user, created
