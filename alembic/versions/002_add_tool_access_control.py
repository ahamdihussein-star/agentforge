"""Add tool access control fields

Revision ID: 002_tool_access
Revises: 001_add_website_tooltype
Create Date: 2026-01-18

Note: This migration is now a NO-OP because columns are already added
via create_missing_tables.py startup script.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002_tool_access'
down_revision = '001_add_website_tooltype'
branch_labels = None
depends_on = None


def column_exists(table_name, column_name):
    """Check if a column exists in a table"""
    connection = op.get_bind()
    result = connection.execute(sa.text(f"""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = '{table_name}' AND column_name = '{column_name}'
        );
    """))
    return result.scalar()


def index_exists(index_name):
    """Check if an index exists"""
    connection = op.get_bind()
    result = connection.execute(sa.text(f"""
        SELECT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE indexname = '{index_name}'
        );
    """))
    return result.scalar()


def upgrade():
    """Add access control columns to tools table (if not already present)"""
    
    # Add access_type column with default 'owner_only'
    if not column_exists('tools', 'access_type'):
        op.add_column('tools', sa.Column('access_type', sa.String(30), nullable=True, server_default='owner_only'))
        print("✅ Added access_type column")
    else:
        print("⏭️  access_type column already exists")
    
    # Add permission arrays as JSON
    columns = [
        ('allowed_user_ids', sa.JSON()),
        ('allowed_group_ids', sa.JSON()),
        ('can_edit_user_ids', sa.JSON()),
        ('can_delete_user_ids', sa.JSON()),
        ('can_execute_user_ids', sa.JSON()),
    ]
    
    for col_name, col_type in columns:
        if not column_exists('tools', col_name):
            op.add_column('tools', sa.Column(col_name, col_type, nullable=True, server_default='[]'))
            print(f"✅ Added {col_name} column")
        else:
            print(f"⏭️  {col_name} column already exists")
    
    # Update existing rows to have default access_type
    op.execute("UPDATE tools SET access_type = 'owner_only' WHERE access_type IS NULL")
    
    # Add index for access_type if it doesn't exist
    if not index_exists('idx_tool_access_type'):
        try:
            op.create_index('idx_tool_access_type', 'tools', ['access_type'])
            print("✅ Created idx_tool_access_type index")
        except Exception as e:
            print(f"⚠️  Could not create index: {e}")
    else:
        print("⏭️  idx_tool_access_type index already exists")


def downgrade():
    """Remove access control columns (if they exist)"""
    if index_exists('idx_tool_access_type'):
        op.drop_index('idx_tool_access_type', table_name='tools')
    
    for col_name in ['can_execute_user_ids', 'can_delete_user_ids', 'can_edit_user_ids', 
                     'allowed_group_ids', 'allowed_user_ids', 'access_type']:
        if column_exists('tools', col_name):
            op.drop_column('tools', col_name)
