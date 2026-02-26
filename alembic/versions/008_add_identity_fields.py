"""Add identity and org chart fields

Add manager_id and employee_id to users table for organizational hierarchy.
Add directory_source and hr_api_config to organizations table for identity provider configuration.

Revision ID: 008
Revises: 007
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers
revision = '008_identity_fields'
down_revision = '007_lab_mock_apis'
branch_labels = None
depends_on = None


def _col_exists(conn, table, column):
    """Check if a column already exists (PostgreSQL)."""
    result = conn.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column})
    return result.fetchone() is not None


def _idx_exists(conn, index_name):
    """Check if an index already exists (PostgreSQL)."""
    result = conn.execute(text(
        "SELECT 1 FROM pg_indexes WHERE indexname = :i"
    ), {"i": index_name})
    return result.fetchone() is not None


def upgrade():
    """
    Add identity management columns:
    - users.manager_id: Direct reporting manager (User ID) — UUID
    - users.employee_id: HR system employee identifier
    - organizations.directory_source: Identity directory source
    - organizations.hr_api_config: HR API configuration
    """
    conn = op.get_bind()
    dialect = conn.dialect.name

    # --- USERS TABLE ---

    # manager_id
    if dialect == 'postgresql':
        if not _col_exists(conn, 'users', 'manager_id'):
            op.execute(text("ALTER TABLE users ADD COLUMN manager_id UUID"))
        else:
            # If it exists as VARCHAR, convert to UUID
            result = conn.execute(text(
                "SELECT data_type FROM information_schema.columns "
                "WHERE table_name = 'users' AND column_name = 'manager_id'"
            ))
            row = result.fetchone()
            if row and row[0] == 'character varying':
                print("  Fixing manager_id: converting VARCHAR -> UUID ...")
                try:
                    op.execute(text("ALTER TABLE users ALTER COLUMN manager_id DROP DEFAULT"))
                except Exception:
                    pass
                op.execute(text(
                    "ALTER TABLE users ALTER COLUMN manager_id "
                    "TYPE UUID USING NULLIF(manager_id, '')::uuid"
                ))
                print("  ✅ manager_id converted to UUID")

        if not _idx_exists(conn, 'ix_users_manager_id'):
            op.execute(text("CREATE INDEX ix_users_manager_id ON users (manager_id)"))
    else:
        op.add_column('users', sa.Column('manager_id', sa.String(36), nullable=True))

    # employee_id
    if dialect == 'postgresql':
        if not _col_exists(conn, 'users', 'employee_id'):
            op.execute(text("ALTER TABLE users ADD COLUMN employee_id VARCHAR(100)"))
        if not _idx_exists(conn, 'ix_users_employee_id'):
            op.execute(text("CREATE INDEX ix_users_employee_id ON users (employee_id)"))
    else:
        op.add_column('users', sa.Column('employee_id', sa.String(100), nullable=True))

    # --- ORGANIZATIONS TABLE ---

    # directory_source
    if dialect == 'postgresql':
        if not _col_exists(conn, 'organizations', 'directory_source'):
            op.execute(text(
                "ALTER TABLE organizations ADD COLUMN directory_source VARCHAR(20) DEFAULT 'internal'"
            ))
    else:
        op.add_column('organizations', sa.Column('directory_source', sa.String(20), server_default='internal'))

    # hr_api_config
    if dialect == 'postgresql':
        if not _col_exists(conn, 'organizations', 'hr_api_config'):
            op.execute(text("ALTER TABLE organizations ADD COLUMN hr_api_config TEXT"))
    else:
        op.add_column('organizations', sa.Column('hr_api_config', sa.Text(), nullable=True))


def downgrade():
    """Remove identity management columns"""
    try:
        op.drop_column('organizations', 'hr_api_config')
    except Exception:
        pass

    try:
        op.drop_column('organizations', 'directory_source')
    except Exception:
        pass

    try:
        op.drop_index('ix_users_employee_id', table_name='users')
        op.drop_column('users', 'employee_id')
    except Exception:
        pass

    try:
        op.drop_index('ix_users_manager_id', table_name='users')
        op.drop_column('users', 'manager_id')
    except Exception:
        pass
