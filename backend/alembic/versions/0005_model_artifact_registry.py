"""Register versioned AI artifacts and link inference runs.

Revision ID: 0005_model_artifact_registry
Revises: 0004_login_audit
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_model_artifact_registry"
down_revision = "0004_login_audit"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    tables = set(inspector.get_table_names())
    if "model_artifacts" not in tables:
        op.create_table(
            "model_artifacts",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(length=160), nullable=False),
            sa.Column("version", sa.String(length=80), nullable=False),
            sa.Column("task", sa.String(length=160), nullable=False),
            sa.Column("framework", sa.String(length=80), nullable=False),
            sa.Column("artifact_path", sa.Text(), nullable=False),
            sa.Column("checksum_sha256", sa.String(length=64), nullable=False),
            sa.Column("input_features_json", sa.JSON(), nullable=False),
            sa.Column("class_labels_json", sa.JSON(), nullable=False),
            sa.Column("metrics_json", sa.JSON(), nullable=False),
            sa.Column("manifest_json", sa.JSON(), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("registered_at", sa.DateTime(timezone=True), nullable=False),
        )
        op.create_index("ix_model_artifacts_name", "model_artifacts", ["name"])
        op.create_index("ix_model_artifacts_version", "model_artifacts", ["version"])
        op.create_index("ix_model_artifacts_task", "model_artifacts", ["task"])
        op.create_index("ix_model_artifacts_checksum_sha256", "model_artifacts", ["checksum_sha256"], unique=True)
        op.create_index("ix_model_artifacts_is_active", "model_artifacts", ["is_active"])

    run_columns = {column["name"] for column in inspector.get_columns("model_runs")}
    if "model_artifact_id" not in run_columns:
        op.add_column("model_runs", sa.Column("model_artifact_id", sa.Uuid(), nullable=True))
        op.create_foreign_key(
            "fk_model_runs_model_artifact_id",
            "model_runs",
            "model_artifacts",
            ["model_artifact_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_index("ix_model_runs_model_artifact_id", "model_runs", ["model_artifact_id"])


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    if "model_runs" in inspector.get_table_names():
        run_columns = {column["name"] for column in inspector.get_columns("model_runs")}
        if "model_artifact_id" in run_columns:
            op.drop_index("ix_model_runs_model_artifact_id", table_name="model_runs")
            op.drop_constraint("fk_model_runs_model_artifact_id", "model_runs", type_="foreignkey")
            op.drop_column("model_runs", "model_artifact_id")
    if "model_artifacts" in inspector.get_table_names():
        op.drop_table("model_artifacts")
