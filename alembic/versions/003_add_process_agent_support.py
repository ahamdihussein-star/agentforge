"""Add process agent support

Revision ID: 003_add_process_agent_support
Revises: 002_tool_access
Create Date: 2026-01-29

This migration adds:
1. agent_type column to agents table
2. process_definition and process_settings columns to agents
3. process_executions table
4. process_node_executions table
5. process_approval_requests table
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '003_add_process_agent_support'
down_revision = '002_tool_access'
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


def upgrade() -> None:
    connection = op.get_bind()
    
    # ==========================================================================
    # 1. ADD COLUMNS TO AGENTS TABLE
    # ==========================================================================
    print("📦 Adding columns to agents table...")
    
    # Add agent_type column with default 'conversational'
    if not column_exists('agents', 'agent_type'):
        connection.execute(sa.text("""
            ALTER TABLE agents 
            ADD COLUMN agent_type VARCHAR(20) NOT NULL DEFAULT 'conversational'
        """))
        print("  ✅ Added agent_type column")
    else:
        print("  ⏭️  agent_type column already exists")
    
    # Add process_definition column (JSON stored as TEXT)
    if not column_exists('agents', 'process_definition'):
        connection.execute(sa.text("""
            ALTER TABLE agents 
            ADD COLUMN process_definition TEXT DEFAULT NULL
        """))
        print("  ✅ Added process_definition column")
    else:
        print("  ⏭️  process_definition column already exists")
    
    # Add process_settings column (JSON stored as TEXT)
    if not column_exists('agents', 'process_settings'):
        connection.execute(sa.text("""
            ALTER TABLE agents 
            ADD COLUMN process_settings TEXT DEFAULT '{}'
        """))
        print("  ✅ Added process_settings column")
    else:
        print("  ⏭️  process_settings column already exists")
    
    # Create index on agent_type
    if not index_exists('idx_agent_org_type'):
        connection.execute(sa.text("""
            CREATE INDEX idx_agent_org_type ON agents (org_id, agent_type)
        """))
        print("  ✅ Created idx_agent_org_type index")
    else:
        print("  ⏭️  idx_agent_org_type index already exists")
    
    # ==========================================================================
    # 2. CREATE PROCESS_EXECUTIONS TABLE
    # ==========================================================================
    
    if not table_exists('process_executions'):
        print("📦 Creating process_executions table...")
        connection.execute(sa.text("""
            CREATE TABLE process_executions (
                id VARCHAR(36) PRIMARY KEY,
                org_id VARCHAR(36) NOT NULL,
                agent_id VARCHAR(36) NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
                conversation_id VARCHAR(36),
                execution_number INTEGER DEFAULT 1,
                correlation_id VARCHAR(100),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                current_node_id VARCHAR(100),
                completed_nodes TEXT,
                skipped_nodes TEXT,
                variables TEXT,
                trigger_input TEXT,
                trigger_type VARCHAR(30) DEFAULT 'manual',
                output TEXT,
                checkpoint_data TEXT,
                can_resume BOOLEAN DEFAULT TRUE,
                checkpoint_at TIMESTAMP,
                error_message TEXT,
                error_node_id VARCHAR(100),
                error_details TEXT,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                last_retry_at TIMESTAMP,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                total_duration_ms FLOAT,
                node_count_executed INTEGER DEFAULT 0,
                tool_calls_count INTEGER DEFAULT 0,
                ai_calls_count INTEGER DEFAULT 0,
                tokens_used INTEGER DEFAULT 0,
                parent_execution_id VARCHAR(36) REFERENCES process_executions(id),
                parent_node_id VARCHAR(100),
                execution_depth INTEGER DEFAULT 0,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                created_by VARCHAR(36) NOT NULL,
                updated_at TIMESTAMP,
                process_version INTEGER DEFAULT 1,
                process_definition_snapshot TEXT,
                extra_metadata TEXT
            )
        """))
        print("  ✅ Created process_executions table")
        
        # Create indexes
        connection.execute(sa.text("CREATE INDEX idx_proc_exec_org_id ON process_executions (org_id)"))
        connection.execute(sa.text("CREATE INDEX idx_proc_exec_agent_id ON process_executions (agent_id)"))
        connection.execute(sa.text("CREATE INDEX idx_proc_exec_status ON process_executions (status)"))
        connection.execute(sa.text("CREATE INDEX idx_proc_exec_org_status ON process_executions (org_id, status)"))
        connection.execute(sa.text("CREATE INDEX idx_proc_exec_agent_status ON process_executions (agent_id, status)"))
        print("  ✅ Created process_executions indexes")
    else:
        print("  ⏭️  process_executions table already exists")
    
    # ==========================================================================
    # 3. CREATE PROCESS_NODE_EXECUTIONS TABLE
    # ==========================================================================
    
    if not table_exists('process_node_executions'):
        print("📦 Creating process_node_executions table...")
        connection.execute(sa.text("""
            CREATE TABLE process_node_executions (
                id VARCHAR(36) PRIMARY KEY,
                process_execution_id VARCHAR(36) NOT NULL REFERENCES process_executions(id) ON DELETE CASCADE,
                node_id VARCHAR(100) NOT NULL,
                node_type VARCHAR(50) NOT NULL,
                node_name VARCHAR(255),
                execution_order INTEGER DEFAULT 0,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                input_data TEXT,
                output_data TEXT,
                variables_before TEXT,
                variables_after TEXT,
                branch_taken VARCHAR(100),
                loop_index INTEGER,
                loop_total INTEGER,
                tool_name VARCHAR(100),
                tool_arguments TEXT,
                tool_result TEXT,
                llm_model VARCHAR(100),
                llm_prompt TEXT,
                llm_response TEXT,
                llm_tokens_used INTEGER DEFAULT 0,
                http_method VARCHAR(10),
                http_url TEXT,
                http_status_code INTEGER,
                http_response_body TEXT,
                error_message TEXT,
                error_type VARCHAR(100),
                error_stack TEXT,
                retry_count INTEGER DEFAULT 0,
                started_at TIMESTAMP,
                completed_at TIMESTAMP,
                duration_ms FLOAT,
                wait_duration_ms FLOAT
            )
        """))
        print("  ✅ Created process_node_executions table")
        
        # Create indexes
        connection.execute(sa.text("CREATE INDEX idx_node_exec_process_id ON process_node_executions (process_execution_id)"))
        connection.execute(sa.text("CREATE INDEX idx_node_exec_node_id ON process_node_executions (node_id)"))
        connection.execute(sa.text("CREATE INDEX idx_node_exec_status ON process_node_executions (status)"))
        connection.execute(sa.text("CREATE INDEX idx_node_exec_process_order ON process_node_executions (process_execution_id, execution_order)"))
        print("  ✅ Created process_node_executions indexes")
    else:
        print("  ⏭️  process_node_executions table already exists")
    
    # ==========================================================================
    # 4. CREATE PROCESS_APPROVAL_REQUESTS TABLE
    # ==========================================================================
    
    if not table_exists('process_approval_requests'):
        print("📦 Creating process_approval_requests table...")
        connection.execute(sa.text("""
            CREATE TABLE process_approval_requests (
                id VARCHAR(36) PRIMARY KEY,
                org_id VARCHAR(36) NOT NULL,
                process_execution_id VARCHAR(36) NOT NULL REFERENCES process_executions(id) ON DELETE CASCADE,
                node_id VARCHAR(100) NOT NULL,
                node_name VARCHAR(255),
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                title VARCHAR(255) NOT NULL,
                description TEXT,
                review_data TEXT,
                priority VARCHAR(20) DEFAULT 'normal',
                assignee_type VARCHAR(20) DEFAULT 'user',
                assigned_user_ids TEXT,
                assigned_role_ids TEXT,
                min_approvals INTEGER DEFAULT 1,
                approval_count INTEGER DEFAULT 0,
                decided_by VARCHAR(36),
                decided_at TIMESTAMP,
                decision VARCHAR(20),
                decision_comments TEXT,
                decision_data TEXT,
                deadline_at TIMESTAMP,
                escalate_after_hours INTEGER,
                escalation_user_ids TEXT,
                escalated BOOLEAN DEFAULT FALSE,
                escalated_at TIMESTAMP,
                reminder_sent BOOLEAN DEFAULT FALSE,
                reminder_sent_at TIMESTAMP,
                created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP
            )
        """))
        print("  ✅ Created process_approval_requests table")
        
        # Create indexes
        connection.execute(sa.text("CREATE INDEX idx_approval_org_id ON process_approval_requests (org_id)"))
        connection.execute(sa.text("CREATE INDEX idx_approval_process_id ON process_approval_requests (process_execution_id)"))
        connection.execute(sa.text("CREATE INDEX idx_approval_status ON process_approval_requests (status)"))
        connection.execute(sa.text("CREATE INDEX idx_approval_org_status ON process_approval_requests (org_id, status)"))
        print("  ✅ Created process_approval_requests indexes")
    else:
        print("  ⏭️  process_approval_requests table already exists")
    
    print("✅ Migration 003 complete!")


def downgrade() -> None:
    connection = op.get_bind()
    
    # Drop tables in reverse order
    if table_exists('process_approval_requests'):
        connection.execute(sa.text("DROP TABLE process_approval_requests CASCADE"))
    
    if table_exists('process_node_executions'):
        connection.execute(sa.text("DROP TABLE process_node_executions CASCADE"))
    
    if table_exists('process_executions'):
        connection.execute(sa.text("DROP TABLE process_executions CASCADE"))
    
    # Drop agent columns
    if index_exists('idx_agent_org_type'):
        connection.execute(sa.text("DROP INDEX idx_agent_org_type"))
    
    if column_exists('agents', 'process_settings'):
        connection.execute(sa.text("ALTER TABLE agents DROP COLUMN process_settings"))
    
    if column_exists('agents', 'process_definition'):
        connection.execute(sa.text("ALTER TABLE agents DROP COLUMN process_definition"))
    
    if column_exists('agents', 'agent_type'):
        connection.execute(sa.text("ALTER TABLE agents DROP COLUMN agent_type"))
