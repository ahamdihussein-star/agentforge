"""Add assigned_group_ids to process_approval_requests

Revision ID: 005_add_approval_assigned_group_ids
Revises: 004_add_process_settings_tables
Create Date: 2026-01-30

Supports approval step config: Approvers from Platform Group.
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '005_add_approval_assigned_group_ids'
down_revision = '004_add_process_settings_tables'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in the table"""
    conn = op.get_bind()
    r = conn.execute(sa.text("""
        SELECT 1 FROM information_schema.columns
        WHERE table_name = :t AND column_name = :c
    """), {"t": table_name, "c": column_name})
    return r.scalar() is not None


def upgrade() -> None:
    if not column_exists('process_approval_requests', 'assigned_group_ids'):
        op.add_column(
            'process_approval_requests',
            sa.Column('assigned_group_ids', sa.JSON(), nullable=True, server_default='[]')
        )


def downgrade() -> None:
    if column_exists('process_approval_requests', 'assigned_group_ids'):
        op.drop_column('process_approval_requests', 'assigned_group_ids')
