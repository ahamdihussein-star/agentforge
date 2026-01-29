"""Add process agent support

Revision ID: 003_add_process_agent_support
Revises: 002_add_tool_access_control
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
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_process_agent_support'
down_revision = '002_add_tool_access_control'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ==========================================================================
    # 1. ADD COLUMNS TO AGENTS TABLE
    # ==========================================================================
    
    # Add agent_type column with default 'conversational'
    op.add_column(
        'agents',
        sa.Column('agent_type', sa.String(20), nullable=False, server_default='conversational')
    )
    
    # Add process_definition column (JSON)
    op.add_column(
        'agents',
        sa.Column('process_definition', sa.Text(), nullable=True)
    )
    
    # Add process_settings column (JSON)
    op.add_column(
        'agents',
        sa.Column('process_settings', sa.Text(), nullable=True)
    )
    
    # Create index on agent_type
    op.create_index(
        'idx_agent_org_type',
        'agents',
        ['org_id', 'agent_type']
    )
    
    # ==========================================================================
    # 2. CREATE PROCESS_EXECUTIONS TABLE
    # ==========================================================================
    
    op.create_table(
        'process_executions',
        # Primary Key
        sa.Column('id', sa.String(36), primary_key=True),
        
        # Multi-tenancy
        sa.Column('org_id', sa.String(36), nullable=False, index=True),
        
        # References
        sa.Column('agent_id', sa.String(36), sa.ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('conversation_id', sa.String(36), nullable=True, index=True),
        
        # Execution Identity
        sa.Column('execution_number', sa.Integer(), default=1),
        sa.Column('correlation_id', sa.String(100), nullable=True, index=True),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        sa.Column('current_node_id', sa.String(100), nullable=True),
        
        # State (JSON stored as TEXT for database-agnostic)
        sa.Column('completed_nodes', sa.Text(), nullable=True),  # JSON array
        sa.Column('skipped_nodes', sa.Text(), nullable=True),  # JSON array
        sa.Column('variables', sa.Text(), nullable=True),  # JSON object
        sa.Column('trigger_input', sa.Text(), nullable=True),  # JSON object
        sa.Column('trigger_type', sa.String(30), default='manual'),
        sa.Column('output', sa.Text(), nullable=True),  # JSON
        
        # Checkpoint
        sa.Column('checkpoint_data', sa.Text(), nullable=True),  # JSON
        sa.Column('can_resume', sa.Boolean(), default=True),
        sa.Column('checkpoint_at', sa.DateTime(), nullable=True),
        
        # Error handling
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_node_id', sa.String(100), nullable=True),
        sa.Column('error_details', sa.Text(), nullable=True),  # JSON
        sa.Column('retry_count', sa.Integer(), default=0),
        sa.Column('max_retries', sa.Integer(), default=3),
        sa.Column('last_retry_at', sa.DateTime(), nullable=True),
        
        # Timing
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('total_duration_ms', sa.Float(), nullable=True),
        
        # Metrics
        sa.Column('node_count_executed', sa.Integer(), default=0),
        sa.Column('tool_calls_count', sa.Integer(), default=0),
        sa.Column('ai_calls_count', sa.Integer(), default=0),
        sa.Column('tokens_used', sa.Integer(), default=0),
        
        # Parent/Child
        sa.Column('parent_execution_id', sa.String(36), sa.ForeignKey('process_executions.id'), nullable=True, index=True),
        sa.Column('parent_node_id', sa.String(100), nullable=True),
        sa.Column('execution_depth', sa.Integer(), default=0),
        
        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('created_by', sa.String(36), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        
        # Snapshot
        sa.Column('process_version', sa.Integer(), default=1),
        sa.Column('process_definition_snapshot', sa.Text(), nullable=True),  # JSON
        
        # Metadata
        sa.Column('extra_metadata', sa.Text(), nullable=True),  # JSON
    )
    
    # Create composite indexes
    op.create_index('idx_proc_exec_org_status', 'process_executions', ['org_id', 'status'])
    op.create_index('idx_proc_exec_agent_status', 'process_executions', ['agent_id', 'status'])
    
    # ==========================================================================
    # 3. CREATE PROCESS_NODE_EXECUTIONS TABLE
    # ==========================================================================
    
    op.create_table(
        'process_node_executions',
        # Primary Key
        sa.Column('id', sa.String(36), primary_key=True),
        
        # Reference
        sa.Column('process_execution_id', sa.String(36), sa.ForeignKey('process_executions.id', ondelete='CASCADE'), nullable=False, index=True),
        
        # Node identification
        sa.Column('node_id', sa.String(100), nullable=False, index=True),
        sa.Column('node_type', sa.String(50), nullable=False),
        sa.Column('node_name', sa.String(255), nullable=True),
        
        # Execution
        sa.Column('execution_order', sa.Integer(), default=0),
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        
        # Input/Output (JSON as TEXT)
        sa.Column('input_data', sa.Text(), nullable=True),
        sa.Column('output_data', sa.Text(), nullable=True),
        sa.Column('variables_before', sa.Text(), nullable=True),
        sa.Column('variables_after', sa.Text(), nullable=True),
        
        # Execution details
        sa.Column('branch_taken', sa.String(100), nullable=True),
        sa.Column('loop_index', sa.Integer(), nullable=True),
        sa.Column('loop_total', sa.Integer(), nullable=True),
        
        # Tool execution
        sa.Column('tool_name', sa.String(100), nullable=True),
        sa.Column('tool_arguments', sa.Text(), nullable=True),
        sa.Column('tool_result', sa.Text(), nullable=True),
        
        # AI execution
        sa.Column('llm_model', sa.String(100), nullable=True),
        sa.Column('llm_prompt', sa.Text(), nullable=True),
        sa.Column('llm_response', sa.Text(), nullable=True),
        sa.Column('llm_tokens_used', sa.Integer(), default=0),
        
        # HTTP execution
        sa.Column('http_method', sa.String(10), nullable=True),
        sa.Column('http_url', sa.Text(), nullable=True),
        sa.Column('http_status_code', sa.Integer(), nullable=True),
        sa.Column('http_response_body', sa.Text(), nullable=True),
        
        # Error handling
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(100), nullable=True),
        sa.Column('error_stack', sa.Text(), nullable=True),
        sa.Column('retry_count', sa.Integer(), default=0),
        
        # Timing
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('duration_ms', sa.Float(), nullable=True),
        sa.Column('wait_duration_ms', sa.Float(), nullable=True),
    )
    
    # Create indexes
    op.create_index('idx_node_exec_process_order', 'process_node_executions', ['process_execution_id', 'execution_order'])
    op.create_index('idx_node_exec_process_status', 'process_node_executions', ['process_execution_id', 'status'])
    
    # ==========================================================================
    # 4. CREATE PROCESS_APPROVAL_REQUESTS TABLE
    # ==========================================================================
    
    op.create_table(
        'process_approval_requests',
        # Primary Key
        sa.Column('id', sa.String(36), primary_key=True),
        
        # Multi-tenancy
        sa.Column('org_id', sa.String(36), nullable=False, index=True),
        
        # Reference
        sa.Column('process_execution_id', sa.String(36), sa.ForeignKey('process_executions.id', ondelete='CASCADE'), nullable=False, index=True),
        
        # Node
        sa.Column('node_id', sa.String(100), nullable=False),
        sa.Column('node_name', sa.String(255), nullable=True),
        
        # Status
        sa.Column('status', sa.String(20), nullable=False, default='pending', index=True),
        
        # Approval details
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('review_data', sa.Text(), nullable=True),  # JSON
        sa.Column('priority', sa.String(20), default='normal'),
        
        # Assignees (JSON arrays as TEXT)
        sa.Column('assignee_type', sa.String(20), default='user'),
        sa.Column('assigned_user_ids', sa.Text(), nullable=True),
        sa.Column('assigned_role_ids', sa.Text(), nullable=True),
        sa.Column('min_approvals', sa.Integer(), default=1),
        sa.Column('approval_count', sa.Integer(), default=0),
        
        # Decision
        sa.Column('decided_by', sa.String(36), nullable=True),
        sa.Column('decided_at', sa.DateTime(), nullable=True),
        sa.Column('decision', sa.String(20), nullable=True),
        sa.Column('decision_comments', sa.Text(), nullable=True),
        sa.Column('decision_data', sa.Text(), nullable=True),  # JSON
        
        # Timeout & Escalation
        sa.Column('deadline_at', sa.DateTime(), nullable=True),
        sa.Column('escalate_after_hours', sa.Integer(), nullable=True),
        sa.Column('escalation_user_ids', sa.Text(), nullable=True),  # JSON array
        sa.Column('escalated', sa.Boolean(), default=False),
        sa.Column('escalated_at', sa.DateTime(), nullable=True),
        
        # Reminder
        sa.Column('reminder_sent', sa.Boolean(), default=False),
        sa.Column('reminder_sent_at', sa.DateTime(), nullable=True),
        
        # Audit
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
    )
    
    # Create indexes
    op.create_index('idx_approval_org_status', 'process_approval_requests', ['org_id', 'status'])
    op.create_index('idx_approval_pending_deadline', 'process_approval_requests', ['status', 'deadline_at'])


def downgrade() -> None:
    # Drop tables in reverse order
    op.drop_table('process_approval_requests')
    op.drop_table('process_node_executions')
    op.drop_table('process_executions')
    
    # Drop agent columns
    op.drop_index('idx_agent_org_type', 'agents')
    op.drop_column('agents', 'process_settings')
    op.drop_column('agents', 'process_definition')
    op.drop_column('agents', 'agent_type')
