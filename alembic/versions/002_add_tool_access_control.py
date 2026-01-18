"""Add tool access control fields

Revision ID: 002_tool_access
Revises: 001_add_website_tooltype
Create Date: 2026-01-18

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '002_tool_access'
down_revision = '001_add_website_tooltype'
branch_labels = None
depends_on = None


def upgrade():
    """Add access control columns to tools table"""
    # Add access_type column with default 'owner_only'
    op.add_column('tools', sa.Column('access_type', sa.String(30), nullable=True, server_default='owner_only'))
    
    # Add permission arrays as JSON
    op.add_column('tools', sa.Column('allowed_user_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('tools', sa.Column('allowed_group_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('tools', sa.Column('can_edit_user_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('tools', sa.Column('can_delete_user_ids', sa.JSON(), nullable=True, server_default='[]'))
    op.add_column('tools', sa.Column('can_execute_user_ids', sa.JSON(), nullable=True, server_default='[]'))
    
    # Update existing rows to have default access_type
    op.execute("UPDATE tools SET access_type = 'owner_only' WHERE access_type IS NULL")
    
    # Now make access_type NOT NULL
    op.alter_column('tools', 'access_type', nullable=False)
    
    # Add index for access_type
    op.create_index('idx_tool_access_type', 'tools', ['access_type'])


def downgrade():
    """Remove access control columns"""
    op.drop_index('idx_tool_access_type', table_name='tools')
    op.drop_column('tools', 'can_execute_user_ids')
    op.drop_column('tools', 'can_delete_user_ids')
    op.drop_column('tools', 'can_edit_user_ids')
    op.drop_column('tools', 'allowed_group_ids')
    op.drop_column('tools', 'allowed_user_ids')
    op.drop_column('tools', 'access_type')
