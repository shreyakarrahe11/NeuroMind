from alembic import op
import sqlalchemy as sa

revision = "0002_auth_provider_and_clerk"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("users")}
    if "auth_provider" not in cols:
        op.add_column("users", sa.Column("auth_provider", sa.String(length=20), nullable=True, server_default="local"))
        op.alter_column("users", "auth_provider", server_default=None)
    if "clerk_user_id" not in cols:
        op.add_column("users", sa.Column("clerk_user_id", sa.String(length=255), nullable=True))
        op.create_index("ix_users_clerk_user_id", "users", ["clerk_user_id"], unique=True)
    if "account_status" not in cols:
        op.add_column("users", sa.Column("account_status", sa.String(length=30), nullable=True, server_default="ACTIVE"))
        op.alter_column("users", "account_status", server_default=None)

    # password_hash must be nullable for Clerk patients.
    op.alter_column("users", "password_hash", existing_type=sa.Text(), nullable=True)


def downgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    cols = {c["name"] for c in inspector.get_columns("users")}
    if "account_status" in cols:
        op.drop_column("users", "account_status")
    if "clerk_user_id" in cols:
        try:
            op.drop_index("ix_users_clerk_user_id", table_name="users")
        except Exception:
            pass
        op.drop_column("users", "clerk_user_id")
    if "auth_provider" in cols:
        op.drop_column("users", "auth_provider")
    op.alter_column("users", "password_hash", existing_type=sa.Text(), nullable=False)
