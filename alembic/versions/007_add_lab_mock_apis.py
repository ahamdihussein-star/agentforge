"""Add lab_mock_apis table (store mock API metadata + data in DB)

Revision ID: 007_lab_mock_apis
Revises: 006_lab_history_items
Create Date: 2026-02-09

Stores all mock API info so GET /api/lab/mock/{id_or_slug} can read from DB.
"""
from alembic import op
import sqlalchemy as sa

revision = "007_lab_mock_apis"
down_revision = "006_lab_history_items"
branch_labels = None
depends_on = None


def table_exists(table_name):
    conn = op.get_bind()
    r = conn.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"
        ),
        {"t": table_name},
    )
    return r.scalar()


def upgrade() -> None:
    if table_exists("lab_mock_apis"):
        return
    op.create_table(
        "lab_mock_apis",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=True, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(120), nullable=False, index=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("endpoint", sa.String(512), nullable=False),
        sa.Column("agent_description", sa.Text(), nullable=True),
        sa.Column("parameters", sa.JSON(), nullable=True),
        sa.Column("response_schema", sa.JSON(), nullable=True),
        sa.Column("data", sa.JSON(), nullable=True),
        sa.Column("record_count", sa.Integer(), nullable=True, server_default="0"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_lab_mock_apis_user_created",
        "lab_mock_apis",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    if table_exists("lab_mock_apis"):
        op.drop_index("ix_lab_mock_apis_user_created", "lab_mock_apis")
        op.drop_table("lab_mock_apis")
