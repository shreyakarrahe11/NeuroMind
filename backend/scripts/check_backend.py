import compileall
import sys

from sqlalchemy import text

from app.ai.model_registry import model_statuses
from app.core.database import SessionLocal


def main():
    if not compileall.compile_dir("app", quiet=1):
        print("[FAIL] Python compilation")
        return 1
    print("[PASS] Python compilation and imports")

    database_ok = False
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        database_ok = True
        print("[PASS] PostgreSQL connection")
    except Exception as exc:
        print(f"[FAIL] PostgreSQL connection: {exc.__class__.__name__}")
    finally:
        db.close()

    multimodal = next(item for item in model_statuses() if item["name"] == "multimodal")
    marker = "PASS" if multimodal["state"] == "READY" else "INFO"
    print(f"[{marker}] Multimodal model: {multimodal['state']}")
    return 0 if database_ok else 1


if __name__ == "__main__":
    sys.exit(main())
