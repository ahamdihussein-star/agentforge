"""Add process settings tables

Revision ID: 004_add_process_settings_tables
Revises: 003_add_process_agent_support
Create Date: 2026-01-29

This migration adds the missing process-related tables:
1. process_org_settings - Organization-level process configuration
2. process_node_types - Dynamic node type definitions
3. process_templates - Reusable workflow templates
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '004_add_process_settings_tables'
down_revision = '003_add_process_agent_support'
branch_labels = None
depends_on = None


def table_exists(table_name):
    """Check if a table exists"""
    connection = op.get_bind()
    result = connection.execute(sa.text(f"""
        SELECT EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = '{table_name}'
        );
    """))
    return result.scalar()


def upgrade() -> None:
    connection = op.get_bind()
    
    # ==========================================================================
    # 1. CREATE PROCESS_ORG_SETTINGS TABLE
    # ==========================================================================
    
    if not table_exists('process_org_settings'):
        print("📦 Creating process_org_settings table...")
        connection.execute(sa.text("""
            CREATE TABLE process_org_settings (
                id VARCHAR(36) PRIMARY KEY,
                org_id VARCHAR(36) NOT NULL UNIQUE,
                
                -- Execution limits
                max_execution_time_seconds INTEGER DEFAULT 3600,
                max_node_executions INTEGER DEFAULT 1000,
                max_parallel_branches INTEGER DEFAULT 10,
                max_loop_iterations INTEGER DEFAULT 1000,
                checkpoint_interval_nodes INTEGER DEFAULT 5,
                
                -- Retry policy
                default_retry_attempts INTEGER DEFAULT 3,
                default_retry_delay_seconds INTEGER DEFAULT 5,
                default_retry_backoff_multiplier FLOAT DEFAULT 2.0,
                retry_on_errors TEXT DEFAULT '["timeout", "connection_error", "rate_limit"]',
                
                -- Timeouts
                default_node_timeout_seconds INTEGER DEFAULT 300,
                default_http_timeout_seconds INTEGER DEFAULT 30,
                default_database_timeout_seconds INTEGER DEFAULT 60,
                
                -- AI defaults
                default_ai_temperature FLOAT DEFAULT 0.7,
                default_ai_max_tokens INTEGER DEFAULT 4096,
                default_conversation_history_limit INTEGER DEFAULT 10,
                
                -- Approval defaults
                default_approval_timeout_hours INTEGER DEFAULT 24,
                default_approval_timeout_action VARCHAR(20) DEFAULT 'fail',
                default_min_approvals INTEGER DEFAULT 1,
                escalation_enabled BOOLEAN DEFAULT TRUE,
                escalation_after_hours INTEGER DEFAULT 12,
                
                -- Notification defaults
                default_notification_channel VARCHAR(20) DEFAULT 'email',
                from_email_address VARCHAR(255),
                notification_priority VARCHAR(20) DEFAULT 'normal',
                
                -- Business hours
                business_hours_start INTEGER DEFAULT 9,
                business_hours_end INTEGER DEFAULT 17,
                business_days TEXT DEFAULT '[0, 1, 2, 3, 4]',
                timezone VARCHAR(50) DEFAULT 'UTC',
                holidays TEXT DEFAULT '[]',
                
                -- HTTP defaults
                default_http_success_codes TEXT DEFAULT '[200, 201, 202, 204]',
                default_http_auth_type VARCHAR(20) DEFAULT 'none',
                default_api_key_header VARCHAR(100) DEFAULT 'X-API-Key',
                
                -- Database defaults
                default_database_max_rows INTEGER DEFAULT 1000,
                
                -- File defaults
                default_file_encoding VARCHAR(20) DEFAULT 'utf-8',
                default_aws_region VARCHAR(50) DEFAULT 'us-east-1',
                
                -- Logging
                log_level VARCHAR(20) DEFAULT 'info',
                log_sensitive_data BOOLEAN DEFAULT FALSE,
                audit_enabled BOOLEAN DEFAULT TRUE,
                
                -- Metadata
                created_at VARCHAR(50),
                updated_at VARCHAR(50),
                updated_by VARCHAR(36)
            )
        """))
        print("  ✅ Created process_org_settings table")
        connection.execute(sa.text("CREATE INDEX idx_proc_org_settings_org ON process_org_settings (org_id)"))
    else:
        print("  ⏭️  process_org_settings table already exists")
    
    # ==========================================================================
    # 2. CREATE PROCESS_NODE_TYPES TABLE
    # ==========================================================================
    
    if not table_exists('process_node_types'):
        print("📦 Creating process_node_types table...")
        connection.execute(sa.text("""
            CREATE TABLE process_node_types (
                id VARCHAR(50) PRIMARY KEY,
                display_name VARCHAR(100) NOT NULL,
                description TEXT,
                category VARCHAR(50) NOT NULL,
                icon VARCHAR(50) DEFAULT 'cube',
                color VARCHAR(20) DEFAULT '#666666',
                config_schema TEXT,
                default_config TEXT DEFAULT '{}',
                has_inputs BOOLEAN DEFAULT TRUE,
                has_outputs BOOLEAN DEFAULT TRUE,
                max_inputs INTEGER DEFAULT -1,
                max_outputs INTEGER DEFAULT -1,
                is_enabled BOOLEAN DEFAULT TRUE,
                is_beta BOOLEAN DEFAULT FALSE,
                requires_feature_flag VARCHAR(100),
                sort_order INTEGER DEFAULT 0,
                created_at VARCHAR(50)
            )
        """))
        print("  ✅ Created process_node_types table")
        connection.execute(sa.text("CREATE INDEX idx_proc_node_types_cat ON process_node_types (category)"))
    else:
        print("  ⏭️  process_node_types table already exists")
    
    # ==========================================================================
    # 3. CREATE PROCESS_TEMPLATES TABLE
    # ==========================================================================
    
    if not table_exists('process_templates'):
        print("📦 Creating process_templates table...")
        connection.execute(sa.text("""
            CREATE TABLE process_templates (
                id VARCHAR(36) PRIMARY KEY,
                name VARCHAR(200) NOT NULL,
                description TEXT,
                category VARCHAR(100) DEFAULT 'general',
                icon VARCHAR(50) DEFAULT 'template',
                process_definition TEXT NOT NULL,
                default_settings TEXT DEFAULT '{}',
                is_public BOOLEAN DEFAULT FALSE,
                org_id VARCHAR(36),
                use_count INTEGER DEFAULT 0,
                created_by VARCHAR(36),
                created_at VARCHAR(50),
                updated_at VARCHAR(50)
            )
        """))
        print("  ✅ Created process_templates table")
        connection.execute(sa.text("CREATE INDEX idx_proc_templates_cat ON process_templates (category)"))
        connection.execute(sa.text("CREATE INDEX idx_proc_templates_org ON process_templates (org_id)"))
    else:
        print("  ⏭️  process_templates table already exists")
    
    print("✅ Migration 004 complete!")


def downgrade() -> None:
    connection = op.get_bind()
    
    if table_exists('process_templates'):
        connection.execute(sa.text("DROP TABLE process_templates CASCADE"))
    
    if table_exists('process_node_types'):
        connection.execute(sa.text("DROP TABLE process_node_types CASCADE"))
    
    if table_exists('process_org_settings'):
        connection.execute(sa.text("DROP TABLE process_org_settings CASCADE"))
