"""Persist safe speech processing failure codes.

Revision ID: 0008_speech_error_code
Revises: 0007_token_revocation
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_speech_error_code"
down_revision = "0007_token_revocation"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("speech_assessments")}
    if "processing_error_code" not in columns:
        op.add_column("speech_assessments", sa.Column("processing_error_code", sa.String(length=80), nullable=True))
    op.execute(
        sa.text("UPDATE speech_assessments SET transcription_status = 'NOT_REQUIRED' WHERE transcription_status = 'PENDING'")
    )


def downgrade():
    bind = op.get_bind()
    columns = {column["name"] for column in sa.inspect(bind).get_columns("speech_assessments")}
    if "processing_error_code" in columns:
        op.drop_column("speech_assessments", "processing_error_code")
