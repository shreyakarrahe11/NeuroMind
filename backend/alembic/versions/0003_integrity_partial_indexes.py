"""Ensure PostgreSQL partial uniqueness for assignments/shares."""
from alembic import op
import sqlalchemy as sa

revision = "0003_integrity_partial_indexes"
down_revision = "0002_auth_provider_and_clerk"
branch_labels = None
depends_on = None


def _index_names(bind, table):
    return {idx["name"] for idx in sa.inspect(bind).get_indexes(table)}


def upgrade() -> None:
    bind = op.get_bind()
    if "uq_active_patient_assignment" not in _index_names(bind, "doctor_patient_assignments"):
        op.create_index(
            "uq_active_patient_assignment",
            "doctor_patient_assignments",
            ["patient_id"],
            unique=True,
            postgresql_where=sa.text("status = 'ACTIVE'"),
        )
    if "uq_active_report_doctor_share" not in _index_names(bind, "report_shares"):
        op.create_index(
            "uq_active_report_doctor_share",
            "report_shares",
            ["report_id", "doctor_id"],
            unique=True,
            postgresql_where=sa.text("revoked_at IS NULL"),
        )


def downgrade() -> None:
    bind = op.get_bind()
    names = _index_names(bind, "report_shares")
    if "uq_active_report_doctor_share" in names:
        op.drop_index("uq_active_report_doctor_share", table_name="report_shares")
    names = _index_names(bind, "doctor_patient_assignments")
    if "uq_active_patient_assignment" in names:
        op.drop_index("uq_active_patient_assignment", table_name="doctor_patient_assignments")
