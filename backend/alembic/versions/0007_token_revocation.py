"""Add per-user token version for logout revocation.

Revision ID: 0007_token_revocation
Revises: 0006_care_and_assessment_events
"""

from alembic import op
import sqlalchemy as sa


revision = "0007_token_revocation"
down_revision = "0006_care_and_assessment_events"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "token_version" not in columns:
        op.add_column("users", sa.Column("token_version", sa.Integer(), nullable=False, server_default="0"))


def downgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("users")}
    if "token_version" in columns:
        op.drop_column("users", "token_version")
