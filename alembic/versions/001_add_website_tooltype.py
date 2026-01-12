"""Add website to tooltype enum

Revision ID: 001_add_website_tooltype
Revises: 
Create Date: 2026-01-12 06:15:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '001_add_website_tooltype'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """
    Add 'website' value to tooltype enum in PostgreSQL
    
    Note: PostgreSQL doesn't allow adding enum values in a transaction,
    so we need to use execute with specific connection settings.
    """
    # Check if 'website' already exists in enum
    connection = op.get_bind()
    result = connection.execute(sa.text("""
        SELECT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = 'website' 
            AND enumtypid = (
                SELECT oid FROM pg_type WHERE typname = 'tooltype'
            )
        );
    """))
    
    exists = result.scalar()
    
    if not exists:
        # Add 'website' to tooltype enum
        # Note: This must be done outside a transaction block
        op.execute("COMMIT")  # End current transaction
        op.execute("ALTER TYPE tooltype ADD VALUE 'website'")
        print("✅ Added 'website' to tooltype enum")
    else:
        print("⏭️  'website' already exists in tooltype enum")


def downgrade() -> None:
    """
    Remove 'website' value from tooltype enum
    
    Note: PostgreSQL doesn't support removing enum values directly.
    We would need to:
    1. Create new enum type without 'website'
    2. Migrate all data
    3. Drop old enum type
    4. Rename new enum type
    
    For now, we'll leave it (safe to have extra enum values)
    """
    print("⚠️  Downgrade not implemented - removing enum values is complex in PostgreSQL")
    print("   'website' value will remain in tooltype enum (safe to ignore)")
    pass

