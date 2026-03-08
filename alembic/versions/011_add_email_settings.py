"""Add email_settings table

Centralized email notification configuration per organization.
Supports SMTP, SendGrid, and AWS SES providers.

Revision ID: 011_add_email_settings
Revises: 010_add_username_login
Create Date: 2024-01-15

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '011_add_email_settings'
down_revision = '010_add_username_login'
branch_labels = None
depends_on = None


def upgrade():
    # Check if table already exists (created by init_db create_all)
    conn = op.get_bind()
    result = conn.execute(sa.text(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'email_settings')"
    ))
    if result.scalar():
        return
    
    op.create_table(
        'email_settings',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('org_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('sendgrid_api_key', sa.Text(), nullable=True),
        sa.Column('smtp_host', sa.String(length=255), nullable=True),
        sa.Column('smtp_port', sa.Integer(), nullable=True),
        sa.Column('smtp_user', sa.String(length=255), nullable=True),
        sa.Column('smtp_password', sa.Text(), nullable=True),
        sa.Column('smtp_use_tls', sa.Boolean(), nullable=True),
        sa.Column('smtp_use_ssl', sa.Boolean(), nullable=True),
        sa.Column('ses_region', sa.String(length=50), nullable=True),
        sa.Column('ses_access_key', sa.Text(), nullable=True),
        sa.Column('ses_secret_key', sa.Text(), nullable=True),
        sa.Column('from_email', sa.String(length=255), nullable=False),
        sa.Column('from_name', sa.String(length=255), nullable=True),
        sa.Column('reply_to_email', sa.String(length=255), nullable=True),
        sa.Column('rate_limit_per_minute', sa.Integer(), nullable=True),
        sa.Column('rate_limit_per_hour', sa.Integer(), nullable=True),
        sa.Column('rate_limit_per_day', sa.Integer(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('is_verified', sa.Boolean(), nullable=True),
        sa.Column('last_test_sent_at', sa.DateTime(), nullable=True),
        sa.Column('last_test_success', sa.Boolean(), nullable=True),
        sa.Column('last_error', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.Column('updated_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_email_settings_org_id'), 'email_settings', ['org_id'], unique=True)


def downgrade():
    op.drop_index(op.f('ix_email_settings_org_id'), table_name='email_settings')
    op.drop_table('email_settings')
