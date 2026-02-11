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


def upgrade():
    """
    Add identity management columns:
    - users.manager_id: Direct reporting manager (User ID)
    - users.employee_id: HR system employee identifier
    - organizations.directory_source: Identity directory source
    - organizations.hr_api_config: HR API configuration
    """
    # --- USERS TABLE ---
    # Add manager_id column (UUID, nullable, indexed)
    try:
        op.add_column('users', sa.Column('manager_id', sa.String(36), nullable=True))
        op.create_index('ix_users_manager_id', 'users', ['manager_id'])
    except Exception as e:
        print(f"Note: manager_id column may already exist: {e}")
    
    # Add employee_id column (String(100), nullable, indexed)
    try:
        op.add_column('users', sa.Column('employee_id', sa.String(100), nullable=True))
        op.create_index('ix_users_employee_id', 'users', ['employee_id'])
    except Exception as e:
        print(f"Note: employee_id column may already exist: {e}")
    
    # --- ORGANIZATIONS TABLE ---
    # Add directory_source column
    try:
        op.add_column('organizations', sa.Column('directory_source', sa.String(20), server_default='internal'))
    except Exception as e:
        print(f"Note: directory_source column may already exist: {e}")
    
    # Add hr_api_config column (JSON/JSONB)
    try:
        op.add_column('organizations', sa.Column('hr_api_config', sa.Text(), nullable=True))
    except Exception as e:
        print(f"Note: hr_api_config column may already exist: {e}")


def downgrade():
    """Remove identity management columns"""
    # --- ORGANIZATIONS TABLE ---
    try:
        op.drop_column('organizations', 'hr_api_config')
    except Exception:
        pass
    
    try:
        op.drop_column('organizations', 'directory_source')
    except Exception:
        pass
    
    # --- USERS TABLE ---
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
