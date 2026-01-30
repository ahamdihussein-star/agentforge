"""
Process Execution Models - Workflow Execution Tracking
Enterprise-grade process execution with full audit trail

This module tracks the execution of Process-type agents, including:
- Process execution instances
- Node execution history
- Variables and state
- Checkpoints for resume capability
- Approval requests

All enums stored as String for database-agnostic design.
"""
import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Index, ForeignKey, Float
from sqlalchemy.orm import relationship
from ..column_types import UUID, JSON, JSONArray
JSONB = JSON  # Alias for backwards compatibility

from ..base import Base


class ProcessExecution(Base):
    """
    Process Execution Instance
    
    Tracks a single execution of a process-type agent.
    Supports pause/resume, checkpoints, and full audit trail.
    
    Status values (String, not native enum):
    - pending, running, waiting, paused, completed, failed, cancelled, timed_out
    """
    __tablename__ = "process_executions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # References
    agent_id = Column(UUID, ForeignKey('agents.id', ondelete='CASCADE'), nullable=False, index=True)
    conversation_id = Column(UUID, index=True)  # Optional link to conversation
    
    # Execution Identity
    execution_number = Column(Integer, default=1)  # Sequential number for this agent
    correlation_id = Column(String(100), index=True)  # For tracking across systems
    
    # ==========================================================================
    # EXECUTION STATE
    # ==========================================================================
    
    # Status: pending, running, waiting, paused, completed, failed, cancelled, timed_out
    status = Column(String(20), default="pending", nullable=False, index=True)
    
    # Current position in the workflow
    current_node_id = Column(String(100))
    
    # List of completed node IDs
    completed_nodes = Column(JSONArray, default=[])
    
    # List of skipped node IDs (conditions not met)
    skipped_nodes = Column(JSONArray, default=[])
    
    # ==========================================================================
    # VARIABLES & CONTEXT
    # ==========================================================================
    
    # Process-level variables (the working data)
    variables = Column(JSON, default={})
    
    # Initial input that triggered the process
    trigger_input = Column(JSON, default={})
    
    # Trigger type: manual, http_webhook, schedule, event, conversation, subprocess
    trigger_type = Column(String(30), default="manual")
    
    # Final output of the process
    output = Column(JSON, default=None)
    
    # ==========================================================================
    # CHECKPOINT & RESUME
    # ==========================================================================
    
    # Checkpoint data for resuming execution
    checkpoint_data = Column(JSON, default=None)
    
    # Whether this execution can be resumed
    can_resume = Column(Boolean, default=True)
    
    # Last checkpoint timestamp
    checkpoint_at = Column(DateTime)
    
    # ==========================================================================
    # ERROR HANDLING
    # ==========================================================================
    
    # Error information if failed
    error_message = Column(Text)
    error_node_id = Column(String(100))
    error_details = Column(JSON, default=None)  # Stack trace, etc.
    
    # Retry information
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    last_retry_at = Column(DateTime)
    
    # ==========================================================================
    # TIMING & METRICS
    # ==========================================================================
    
    # Timing
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    
    # Execution metrics
    total_duration_ms = Column(Float)  # Total execution time
    node_count_executed = Column(Integer, default=0)
    tool_calls_count = Column(Integer, default=0)
    ai_calls_count = Column(Integer, default=0)
    tokens_used = Column(Integer, default=0)
    
    # ==========================================================================
    # PARENT/CHILD RELATIONSHIPS (for sub-processes)
    # ==========================================================================
    
    parent_execution_id = Column(UUID, ForeignKey('process_executions.id'), index=True)
    parent_node_id = Column(String(100))  # Node in parent that called this
    
    # Depth in the execution tree (0 = root)
    execution_depth = Column(Integer, default=0)
    
    # ==========================================================================
    # AUDIT TRAIL
    # ==========================================================================
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    created_by = Column(UUID, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Version of the process definition used (snapshot)
    process_version = Column(Integer, default=1)
    process_definition_snapshot = Column(JSON)  # Full snapshot of process at execution time
    
    # Additional metadata
    extra_metadata = Column(JSON, default={})
    
    # ==========================================================================
    # RELATIONSHIPS
    # ==========================================================================
    
    # Node executions
    node_executions = relationship(
        "ProcessNodeExecution",
        back_populates="process_execution",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    # Approval requests
    approval_requests = relationship(
        "ProcessApprovalRequest",
        back_populates="process_execution",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )
    
    # Child executions (sub-processes)
    child_executions = relationship(
        "ProcessExecution",
        back_populates="parent_execution",
        foreign_keys=[parent_execution_id],
        lazy="select"
    )
    
    # Parent execution (for sub-processes)
    parent_execution = relationship(
        "ProcessExecution",
        back_populates="child_executions",
        remote_side=[id],
        foreign_keys=[parent_execution_id],
        lazy="select"
    )
    
    def __repr__(self):
        return f"<ProcessExecution {self.id} agent={self.agent_id} status={self.status}>"
    
    @property
    def is_terminal(self) -> bool:
        """Check if execution has reached a terminal state"""
        return self.status in ['completed', 'failed', 'cancelled', 'timed_out']
    
    @property
    def is_active(self) -> bool:
        """Check if execution is still active"""
        return self.status in ['pending', 'running', 'waiting', 'paused']
    
    @property
    def duration_seconds(self) -> float:
        """Get execution duration in seconds"""
        if self.total_duration_ms:
            return self.total_duration_ms / 1000
        if self.started_at:
            end = self.completed_at or datetime.utcnow()
            return (end - self.started_at).total_seconds()
        return 0
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'agent_id': str(self.agent_id),
            'conversation_id': str(self.conversation_id) if self.conversation_id else None,
            'execution_number': self.execution_number,
            'correlation_id': self.correlation_id,
            'status': self.status,
            'current_node_id': self.current_node_id,
            'completed_nodes': self.completed_nodes,
            'skipped_nodes': self.skipped_nodes,
            'variables': self.variables,
            'trigger_type': self.trigger_type,
            'trigger_input': self.trigger_input,
            'output': self.output,
            'can_resume': self.can_resume,
            'error_message': self.error_message,
            'error_node_id': self.error_node_id,
            'retry_count': self.retry_count,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_seconds': self.duration_seconds,
            'node_count_executed': self.node_count_executed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'created_by': str(self.created_by),
        }


class ProcessNodeExecution(Base):
    """
    Individual Node Execution Record
    
    Tracks the execution of each node in a process.
    Provides detailed audit trail and debugging information.
    
    Status values (String):
    - pending, running, waiting, completed, failed, skipped, retrying
    """
    __tablename__ = "process_node_executions"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Reference to process execution
    process_execution_id = Column(
        UUID, 
        ForeignKey('process_executions.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    # Node identification
    node_id = Column(String(100), nullable=False, index=True)
    node_type = Column(String(50), nullable=False)  # From ProcessNodeType enum
    node_name = Column(String(255))
    
    # Execution order
    execution_order = Column(Integer, default=0)
    
    # Status: pending, running, waiting, completed, failed, skipped, retrying
    status = Column(String(20), default="pending", nullable=False, index=True)
    
    # ==========================================================================
    # INPUT / OUTPUT
    # ==========================================================================
    
    # Input data for this node
    input_data = Column(JSON, default={})
    
    # Output data from this node
    output_data = Column(JSON, default=None)
    
    # Variables state before execution
    variables_before = Column(JSON, default={})
    
    # Variables state after execution
    variables_after = Column(JSON, default={})
    
    # ==========================================================================
    # EXECUTION DETAILS
    # ==========================================================================
    
    # For conditional nodes: which branch was taken
    branch_taken = Column(String(100))
    
    # For loop nodes: current iteration
    loop_index = Column(Integer)
    loop_total = Column(Integer)
    
    # For tool calls: tool information
    tool_name = Column(String(100))
    tool_arguments = Column(JSON)
    tool_result = Column(JSON)
    
    # For AI nodes: LLM information
    llm_model = Column(String(100))
    llm_prompt = Column(Text)
    llm_response = Column(Text)
    llm_tokens_used = Column(Integer, default=0)
    
    # For HTTP requests: request/response
    http_method = Column(String(10))
    http_url = Column(Text)
    http_status_code = Column(Integer)
    http_response_body = Column(JSON)
    
    # ==========================================================================
    # ERROR HANDLING
    # ==========================================================================
    
    error_message = Column(Text)
    error_type = Column(String(100))
    error_stack = Column(Text)
    
    retry_count = Column(Integer, default=0)
    
    # ==========================================================================
    # TIMING
    # ==========================================================================
    
    started_at = Column(DateTime)
    completed_at = Column(DateTime)
    duration_ms = Column(Float)
    
    # Queue/wait time before execution started
    wait_duration_ms = Column(Float)
    
    # ==========================================================================
    # RELATIONSHIPS
    # ==========================================================================
    
    process_execution = relationship("ProcessExecution", back_populates="node_executions")
    
    def __repr__(self):
        return f"<ProcessNodeExecution {self.node_id} status={self.status}>"
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'process_execution_id': str(self.process_execution_id),
            'node_id': self.node_id,
            'node_type': self.node_type,
            'node_name': self.node_name,
            'execution_order': self.execution_order,
            'status': self.status,
            'input_data': self.input_data,
            'output_data': self.output_data,
            'branch_taken': self.branch_taken,
            'error_message': self.error_message,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'duration_ms': self.duration_ms,
        }


class ProcessApprovalRequest(Base):
    """
    Human Approval Request
    
    Tracks approval requests for human-in-the-loop nodes.
    Supports multiple approvers, escalation, and deadlines.
    
    Status values (String):
    - pending, approved, rejected, expired, escalated
    """
    __tablename__ = "process_approval_requests"
    
    # Primary Key
    id = Column(UUID, primary_key=True, default=uuid.uuid4)
    
    # Multi-tenancy
    org_id = Column(UUID, nullable=False, index=True)
    
    # Reference to process execution
    process_execution_id = Column(
        UUID, 
        ForeignKey('process_executions.id', ondelete='CASCADE'), 
        nullable=False, 
        index=True
    )
    
    # Node that requested approval
    node_id = Column(String(100), nullable=False)
    node_name = Column(String(255))
    
    # Status: pending, approved, rejected, expired, escalated
    status = Column(String(20), default="pending", nullable=False, index=True)
    
    # ==========================================================================
    # APPROVAL DETAILS
    # ==========================================================================
    
    # Title and description shown to approver
    title = Column(String(255), nullable=False)
    description = Column(Text)
    
    # Data to review (summary of what's being approved)
    review_data = Column(JSON, default={})
    
    # Priority: low, normal, high, urgent
    priority = Column(String(20), default="normal")
    
    # ==========================================================================
    # APPROVERS
    # ==========================================================================
    
    # Type of assignee: user, role, group, department
    assignee_type = Column(String(20), default="user")
    
    # Assigned user IDs (JSON array of UUIDs)
    assigned_user_ids = Column(JSONArray, default=[])
    
    # Assigned role IDs
    assigned_role_ids = Column(JSONArray, default=[])
    
    # Assigned group IDs (for assignee_type == 'group')
    assigned_group_ids = Column(JSONArray, default=[])
    
    # Minimum approvals required
    min_approvals = Column(Integer, default=1)
    
    # Current approval count
    approval_count = Column(Integer, default=0)
    
    # ==========================================================================
    # DECISION
    # ==========================================================================
    
    # Who made the decision
    decided_by = Column(UUID)
    decided_at = Column(DateTime)
    
    # Decision: approved, rejected
    decision = Column(String(20))
    
    # Comments from approver
    decision_comments = Column(Text)
    
    # Additional data provided during approval
    decision_data = Column(JSON, default={})
    
    # ==========================================================================
    # ESCALATION & TIMEOUT
    # ==========================================================================
    
    # Deadline for decision
    deadline_at = Column(DateTime)
    
    # Escalation settings
    escalate_after_hours = Column(Integer)
    escalation_user_ids = Column(JSONArray, default=[])
    escalated = Column(Boolean, default=False)
    escalated_at = Column(DateTime)
    
    # Reminder settings
    reminder_sent = Column(Boolean, default=False)
    reminder_sent_at = Column(DateTime)
    
    # ==========================================================================
    # AUDIT TRAIL
    # ==========================================================================
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # ==========================================================================
    # RELATIONSHIPS
    # ==========================================================================
    
    process_execution = relationship("ProcessExecution", back_populates="approval_requests")
    
    def __repr__(self):
        return f"<ProcessApprovalRequest {self.id} status={self.status}>"
    
    @property
    def is_pending(self) -> bool:
        return self.status == "pending"
    
    @property
    def is_expired(self) -> bool:
        if self.deadline_at and self.status == "pending":
            return datetime.utcnow() > self.deadline_at
        return False
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API response"""
        return {
            'id': str(self.id),
            'org_id': str(self.org_id),
            'process_execution_id': str(self.process_execution_id),
            'node_id': self.node_id,
            'node_name': self.node_name,
            'status': self.status,
            'title': self.title,
            'description': self.description,
            'review_data': self.review_data,
            'priority': self.priority,
            'assignee_type': self.assignee_type,
            'assigned_user_ids': self.assigned_user_ids,
            'assigned_role_ids': getattr(self, 'assigned_role_ids', None) or [],
            'assigned_group_ids': getattr(self, 'assigned_group_ids', None) or [],
            'min_approvals': self.min_approvals,
            'approval_count': self.approval_count,
            'decided_by': str(self.decided_by) if self.decided_by else None,
            'decided_at': self.decided_at.isoformat() if self.decided_at else None,
            'decision': self.decision,
            'decision_comments': self.decision_comments,
            'deadline_at': self.deadline_at.isoformat() if self.deadline_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


# =============================================================================
# COMPOSITE INDEXES
# =============================================================================

# Process Execution indexes
Index('idx_proc_exec_org_status', ProcessExecution.org_id, ProcessExecution.status)
Index('idx_proc_exec_agent_status', ProcessExecution.agent_id, ProcessExecution.status)
Index('idx_proc_exec_created', ProcessExecution.org_id, ProcessExecution.created_at.desc())

# Node Execution indexes
Index('idx_node_exec_process_order', ProcessNodeExecution.process_execution_id, ProcessNodeExecution.execution_order)
Index('idx_node_exec_process_status', ProcessNodeExecution.process_execution_id, ProcessNodeExecution.status)

# Approval Request indexes
Index('idx_approval_org_status', ProcessApprovalRequest.org_id, ProcessApprovalRequest.status)
Index('idx_approval_pending_deadline', ProcessApprovalRequest.status, ProcessApprovalRequest.deadline_at)
