"""Add login auditing and last login tracking."""
from alembic import op
import sqlalchemy as sa

revision = "0004_login_audit"
down_revision = "0003_integrity_partial_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    user_cols = {c["name"] for c in inspector.get_columns("users")}
    if "last_login_at" not in user_cols:
        op.add_column("users", sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True))
    if "last_logout_at" not in user_cols:
        op.add_column("users", sa.Column("last_logout_at", sa.DateTime(timezone=True), nullable=True))

    tables = set(inspector.get_table_names())
    if "login_events" not in tables:
        op.create_table(
            "login_events",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=True),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("role", sa.String(length=20), nullable=True),
            sa.Column("auth_provider", sa.String(length=20), nullable=True),
            sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("ip_address", sa.String(length=64), nullable=True),
            sa.Column("user_agent", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_login_events_user_id", "login_events", ["user_id"])
        op.create_index("ix_login_events_created_at", "login_events", ["created_at"])
        op.create_index("ix_login_events_success", "login_events", ["success"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "login_events" in inspector.get_table_names():
        op.drop_index("ix_login_events_success", table_name="login_events")
        op.drop_index("ix_login_events_created_at", table_name="login_events")
        op.drop_index("ix_login_events_user_id", table_name="login_events")
        op.drop_table("login_events")
    user_cols = {c["name"] for c in inspector.get_columns("users")}
    if "last_logout_at" in user_cols:
        op.drop_column("users", "last_logout_at")
    if "last_login_at" in user_cols:
        op.drop_column("users", "last_login_at")
