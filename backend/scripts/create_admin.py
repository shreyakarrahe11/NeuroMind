import os
import sys

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.admin_bootstrap import ensure_admin


def create(email: str, password: str):
    db = SessionLocal()
    try:
        user, created = ensure_admin(db, email, password)
        print(f"Admin {'created' if created else 'synchronized'}: {user.email}")
    except ValueError as exc:
        raise SystemExit(str(exc)) from exc
    finally:
        db.close()


if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else os.getenv("INITIAL_ADMIN_EMAIL", settings.initial_admin_email)
    password = sys.argv[2] if len(sys.argv) > 2 else os.getenv("INITIAL_ADMIN_PASSWORD", settings.initial_admin_password)
    create(email, password)
