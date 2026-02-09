"""Add lab_history_items table (Lab history in DB, no localStorage)

Revision ID: 006_lab_history_items
Revises: 005_approval_assigned_group_ids
Create Date: 2026-02-09

Stores Lab-generated items (API, document, image) per user so history
is reliable and consistent across devices (replaces localStorage).
"""
from alembic import op
import sqlalchemy as sa

revision = "006_lab_history_items"
down_revision = "005_approval_assigned_group_ids"
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists"""
    connection = op.get_bind()
    result = connection.execute(
        sa.text(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"
        ),
        {"t": table_name},
    )
    return result.scalar()


def upgrade() -> None:
    if table_exists("lab_history_items"):
        return
    op.create_table(
        "lab_history_items",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.String(36), nullable=False, index=True),
        sa.Column("type", sa.String(20), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("result", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    op.create_index(
        "ix_lab_history_items_user_created",
        "lab_history_items",
        ["user_id", "created_at"],
    )


def downgrade() -> None:
    if table_exists("lab_history_items"):
        op.drop_index("ix_lab_history_items_user_created", "lab_history_items")
        op.drop_table("lab_history_items")
