"""Doctor discovery, patient assistance requests, and original speech bytes.

Revision ID: 0010_doctor_choice_audio
Revises: 0009_speech_model_lineage
"""
from alembic import op
import sqlalchemy as sa

revision = "0010_doctor_choice_audio"
down_revision = "0009_speech_model_lineage"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    patient_columns = {c["name"] for c in inspector.get_columns("patient_profiles")}
    doctor_columns = {c["name"] for c in inspector.get_columns("doctor_profiles")}
    speech_columns = {c["name"] for c in inspector.get_columns("speech_assessments")}
    if "doctor_assignment_requested_at" not in patient_columns:
        op.add_column("patient_profiles", sa.Column("doctor_assignment_requested_at", sa.DateTime(timezone=True), nullable=True))
    if "ix_patient_profiles_doctor_assignment_requested_at" not in {i["name"] for i in inspector.get_indexes("patient_profiles")}:
        op.create_index("ix_patient_profiles_doctor_assignment_requested_at", "patient_profiles", ["doctor_assignment_requested_at"])
    if "city" not in doctor_columns:
        op.add_column("doctor_profiles", sa.Column("city", sa.String(length=120), nullable=True))
    if "area" not in doctor_columns:
        op.add_column("doctor_profiles", sa.Column("area", sa.String(length=120), nullable=True))
    if "ix_doctor_profiles_city" not in {i["name"] for i in inspector.get_indexes("doctor_profiles")}:
        op.create_index("ix_doctor_profiles_city", "doctor_profiles", ["city"])
    if "prompt_id" not in speech_columns:
        op.add_column("speech_assessments", sa.Column("prompt_id", sa.String(length=120), nullable=True))
    if "prompt_type" not in speech_columns:
        op.add_column("speech_assessments", sa.Column("prompt_type", sa.String(length=40), nullable=True))
    if "speech_audio_blobs" not in inspector.get_table_names():
        op.create_table("speech_audio_blobs",
        sa.Column("speech_assessment_id", sa.Uuid(), sa.ForeignKey("speech_assessments.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("content", sa.LargeBinary(), nullable=False),
        sa.Column("content_type", sa.String(length=120), nullable=False),
        sa.Column("byte_size", sa.Integer(), nullable=False),
        sa.Column("sha256", sa.String(length=64), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )


def downgrade():
    op.drop_table("speech_audio_blobs")
    op.drop_column("speech_assessments", "prompt_type")
    op.drop_column("speech_assessments", "prompt_id")
    op.drop_index("ix_doctor_profiles_city", table_name="doctor_profiles")
    op.drop_column("doctor_profiles", "area")
    op.drop_column("doctor_profiles", "city")
    op.drop_index("ix_patient_profiles_doctor_assignment_requested_at", table_name="patient_profiles")
    op.drop_column("patient_profiles", "doctor_assignment_requested_at")
