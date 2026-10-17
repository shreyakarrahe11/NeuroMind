"""Verify or create the PostgreSQL database configured by DATABASE_URL."""

from __future__ import annotations

import argparse
import sys

import psycopg
from psycopg import sql
from sqlalchemy.engine import make_url

from app.core.config import settings


def ensure_database(check_only: bool = False) -> int:
    url = make_url(settings.database_url)
    if url.get_backend_name() != "postgresql":
        print("[PASS] Non-PostgreSQL database does not require bootstrap")
        return 0

    target = (url.database or "").strip()
    if not target:
        print("[FAIL] DATABASE_URL does not contain a database name", file=sys.stderr)
        return 1

    try:
        with psycopg.connect(
            host=url.host or "localhost",
            port=url.port or 5432,
            user=url.username,
            password=url.password,
            dbname="postgres",
            connect_timeout=5,
            autocommit=True,
        ) as connection:
            exact = connection.execute(
                "SELECT datname FROM pg_database WHERE datname = %s", (target,),
            ).fetchone()
            if exact:
                print(f"[PASS] PostgreSQL database: {target}")
                return 0

            case_matches = connection.execute(
                "SELECT datname FROM pg_database WHERE lower(datname) = lower(%s) ORDER BY datname",
                (target,),
            ).fetchall()
            if case_matches:
                actual = case_matches[0][0]
                print(
                    f"[FIX ] Database names are case-sensitive: DATABASE_URL requests '{target}', "
                    f"but PostgreSQL contains '{actual}'. Change the final DATABASE_URL segment to /{actual}.",
                    file=sys.stderr,
                )
                return 2

            if check_only:
                print(
                    f"[FIX ] PostgreSQL database '{target}' does not exist. Run npm run db:migrate to create it.",
                    file=sys.stderr,
                )
                return 3

            connection.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target)))
            print(f"[PASS] Created PostgreSQL database: {target}")
            return 0
    except psycopg.Error as exc:
        print(
            f"[FAIL] Could not verify/create PostgreSQL database ({exc.__class__.__name__}). "
            "Check the PostgreSQL service, username, password, and CREATEDB permission.",
            file=sys.stderr,
        )
        return 1


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check-only", action="store_true")
    args = parser.parse_args()
    return ensure_database(args.check_only)


if __name__ == "__main__":
    raise SystemExit(main())
