"""Add assessment telemetry and patient-doctor care workflows.

Revision ID: 0006_care_and_assessment_events
Revises: 0005_model_artifact_registry
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_care_and_assessment_events"
down_revision = "0005_model_artifact_registry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())

    if "assessment_events" not in tables:
        op.create_table(
            "assessment_events",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("session_id", sa.Uuid(), sa.ForeignKey("assessment_sessions.id", ondelete="CASCADE"), nullable=False),
            sa.Column("assessment_type", sa.String(40), nullable=False),
            sa.Column("event_type", sa.String(80), nullable=False),
            sa.Column("event_sequence", sa.Integer(), nullable=False),
            sa.Column("occurred_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("elapsed_ms", sa.Float(), nullable=True),
            sa.Column("payload_json", sa.JSON(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.UniqueConstraint("session_id", "assessment_type", "event_type", "event_sequence", name="uq_assessment_event_sequence"),
        )
        for column in ("session_id", "assessment_type", "event_type", "occurred_at"):
            op.create_index(f"ix_assessment_events_{column}", "assessment_events", [column])

    if "care_messages" not in tables:
        op.create_table(
            "care_messages",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("sender_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("recipient_user_id", sa.Uuid(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        )
        for column in ("patient_id", "doctor_id", "sender_user_id", "recipient_user_id", "read_at", "created_at"):
            op.create_index(f"ix_care_messages_{column}", "care_messages", [column])

    if "doctor_change_requests" not in tables:
        op.create_table(
            "doctor_change_requests",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("current_doctor_id", sa.Uuid(), sa.ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True),
            sa.Column("requested_doctor_id", sa.Uuid(), sa.ForeignKey("doctor_profiles.id", ondelete="SET NULL"), nullable=True),
            sa.Column("reason", sa.Text(), nullable=False),
            sa.Column("status", sa.String(30), nullable=False, server_default="PENDING"),
            sa.Column("resolution_note", sa.Text(), nullable=True),
            sa.Column("resolved_by", sa.Uuid(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        )
        for column in ("patient_id", "status", "created_at"):
            op.create_index(f"ix_doctor_change_requests_{column}", "doctor_change_requests", [column])

    if "doctor_ratings" not in tables:
        op.create_table(
            "doctor_ratings",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("patient_id", sa.Uuid(), sa.ForeignKey("patient_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("doctor_id", sa.Uuid(), sa.ForeignKey("doctor_profiles.id", ondelete="CASCADE"), nullable=False),
            sa.Column("report_id", sa.Uuid(), sa.ForeignKey("reports.id", ondelete="SET NULL"), nullable=True),
            sa.Column("rating", sa.Integer(), nullable=False),
            sa.Column("comment", sa.Text(), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
            sa.CheckConstraint("rating >= 1 AND rating <= 5", name="ck_doctor_rating_range"),
            sa.UniqueConstraint("patient_id", "doctor_id", "report_id", name="uq_doctor_rating_report"),
        )
        for column in ("patient_id", "doctor_id", "report_id"):
            op.create_index(f"ix_doctor_ratings_{column}", "doctor_ratings", [column])


def downgrade() -> None:
    bind = op.get_bind()
    tables = set(sa.inspect(bind).get_table_names())
    for table in ("doctor_ratings", "doctor_change_requests", "care_messages", "assessment_events"):
        if table in tables:
            op.drop_table(table)
