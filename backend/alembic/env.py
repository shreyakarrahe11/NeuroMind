
from logging.config import fileConfig
import os
import sys

from alembic import context

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.core.config import settings
from app.core.database import Base
from app.models import entities
config = context.config

# Alembic's logging setup is optional. Older NeuroMind packages contained a
# minimal alembic.ini without the logging sections expected by fileConfig(),
# which raised KeyError: 'formatters' before a migration could even connect.
if config.config_file_name and config.file_config.has_section("formatters"):
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def run_migrations_offline():
    context.configure(
        url=settings.database_url,
        target_metadata=target_metadata,
        literal_binds=True,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    from sqlalchemy import engine_from_config, pool

    cfg = config.get_section(config.config_ini_section)
    cfg["sqlalchemy.url"] = settings.database_url
    connectable = engine_from_config(cfg, prefix="sqlalchemy.", poolclass=pool.NullPool)
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
