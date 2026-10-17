"""Record the speech artifact used for each extracted recording.

Revision ID: 0009_speech_model_lineage
Revises: 0008_speech_error_code
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_speech_model_lineage"
down_revision = "0008_speech_error_code"
branch_labels = None
depends_on = None


def upgrade():
    if "speech_artifact_sha256" not in {c["name"] for c in sa.inspect(op.get_bind()).get_columns("speech_assessments")}:
        op.add_column("speech_assessments", sa.Column("speech_artifact_sha256", sa.String(length=64), nullable=True))


def downgrade():
    if "speech_artifact_sha256" in {c["name"] for c in sa.inspect(op.get_bind()).get_columns("speech_assessments")}:
        op.drop_column("speech_assessments", "speech_artifact_sha256")
