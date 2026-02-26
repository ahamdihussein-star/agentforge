"""
Process API Schemas
Pydantic models for API request/response

All user-facing fields use business-friendly names and descriptions.
Technical details are hidden from end users.
"""

from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from datetime import datetime


# =============================================================================
# WORKFLOW EXECUTION SCHEMAS (User-facing name: "Workflow")
# =============================================================================

class ProcessExecutionCreate(BaseModel):
    """Request to start a new workflow run"""
    agent_id: str = Field(..., description="Which workflow to run")
    trigger_input: Dict[str, Any] = Field(
        default_factory=dict,
        description="Starting data for the workflow"
    )
    correlation_id: Optional[str] = Field(
        default=None,
        description="Reference ID for tracking"
    )
    conversation_id: Optional[str] = Field(
        default=None,
        description="Related conversation"
    )


class StatusInfo(BaseModel):
    """User-friendly status information"""
    label: str
    description: str
    color: str


class ErrorInfo(BaseModel):
    """User-friendly error information"""
    title: str
    message: str
    can_retry: bool = False


class ProcessExecutionResponse(BaseModel):
    """Workflow run details"""
    id: str
    workflow_id: str = Field(alias="agent_id")
    org_id: str
    run_number: int = Field(alias="execution_number")
    reference_id: Optional[str] = Field(default=None, alias="correlation_id")
    
    # Status - user-friendly format
    status: str
    status_info: Optional[StatusInfo] = None
    current_step: Optional[str] = None  # Display name, not ID
    completed_steps: List[str] = []  # Display names
    
    # Input/Output
    input_data: Dict[str, Any] = Field(default_factory=dict, alias="trigger_input")
    result: Optional[Any] = Field(default=None, alias="output")
    
    # Error - user-friendly
    error: Optional[ErrorInfo] = None
    
    can_resume: bool = False
    
    # Timing
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_display: Optional[str] = None  # "5 seconds", "2 minutes"
    
    steps_completed: int = Field(default=0, alias="node_count_executed")
    
    created_at: datetime
    started_by: str = Field(alias="created_by")
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ProcessExecutionListResponse(BaseModel):
    """List of process executions with pagination"""
    items: List[ProcessExecutionResponse]
    total: int
    limit: int
    offset: int


class StepExecutionResponse(BaseModel):
    """Step execution details (user-friendly version of node execution)"""
    id: str
    run_id: str = Field(alias="process_execution_id")
    step_name: str  # User-friendly name
    step_type: str  # User-friendly type name
    order: int = Field(alias="execution_order")
    status: StatusInfo
    
    path_taken: Optional[str] = Field(default=None, alias="branch_taken")
    error: Optional[str] = None  # Sanitized for users
    
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_display: Optional[str] = None  # "2 seconds"
    
    class Config:
        from_attributes = True
        populate_by_name = True


# Keep old name for backwards compatibility
NodeExecutionResponse = StepExecutionResponse


# =============================================================================
# APPROVAL SCHEMAS
# =============================================================================

class ApprovalRequestResponse(BaseModel):
    """Approval request details"""
    id: str
    run_id: str = Field(alias="process_execution_id")
    step_name: Optional[str] = Field(default=None, alias="node_name")
    
    status: str
    title: str
    description: Optional[str] = None
    details_to_review: Dict[str, Any] = Field(default_factory=dict, alias="review_data")
    urgency: str = Field(default="normal", alias="priority")
    
    # Who should approve (from process builder config: platform user / role / group)
    approvers_needed: int = Field(default=1, alias="min_approvals")
    approvals_received: int = Field(default=0, alias="approval_count")
    assignee_type: Optional[str] = Field(default=None, description="user, role, group")
    assigned_user_ids: List[str] = Field(default_factory=list)
    assigned_role_ids: List[str] = Field(default_factory=list)
    assigned_group_ids: List[str] = Field(default_factory=list)
    
    # Decision info
    decided_by: Optional[str] = None
    decided_at: Optional[datetime] = None
    decision: Optional[str] = None
    comments: Optional[str] = Field(default=None, alias="decision_comments")
    
    due_by: Optional[datetime] = Field(default=None, alias="deadline_at")
    
    created_at: datetime
    
    class Config:
        from_attributes = True
        populate_by_name = True


class ApprovalDecisionRequest(BaseModel):
    """Submit your approval decision"""
    decision: str = Field(..., description="Your decision: approve or reject")
    comments: Optional[str] = Field(default=None, description="Your comments (optional)")
    decision_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Any additional information"
    )


class ApprovalListResponse(BaseModel):
    """List of approval requests"""
    items: List[ApprovalRequestResponse]
    total: int


# =============================================================================
# REQUEST TRACKING: WHO IS IT WAITING WITH?
# =============================================================================

class ApprovalAssigneeDisplay(BaseModel):
    """User-facing assignee display"""
    kind: str = Field(..., description="person or group")
    label: str = Field(..., description="Role/group meaning, e.g. Direct manager")
    name: Optional[str] = Field(default=None, description="Person name (if available)")
    email: Optional[str] = Field(default=None, description="Person email (if available)")


class PendingApprovalDisplay(BaseModel):
    """Pending approval summary for request tracking"""
    approval_id: str
    step_name: Optional[str] = None
    assignees: List[ApprovalAssigneeDisplay] = Field(default_factory=list)


class PendingApprovalDisplayResponse(BaseModel):
    """List of pending approvals for an execution"""
    items: List[PendingApprovalDisplay] = Field(default_factory=list)


# =============================================================================
# PROCESS CONTROL SCHEMAS
# =============================================================================

class ProcessResumeRequest(BaseModel):
    """Continue a paused workflow"""
    resume_input: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional data for continuing"
    )


class ProcessCancelRequest(BaseModel):
    """Stop a running workflow"""
    reason: Optional[str] = Field(default=None, description="Why are you stopping this?")


# =============================================================================
# STATISTICS SCHEMAS
# =============================================================================

class ProcessStatsResponse(BaseModel):
    """Workflow statistics summary"""
    total_runs: int = Field(alias="total_executions")
    by_status: Dict[str, int]
    success_rate_percent: float = Field(alias="success_rate")
    average_duration_display: str = ""  # "5 seconds", "2 minutes"
    time_period: str = ""  # "Last 30 days"
    
    class Config:
        populate_by_name = True


# =============================================================================
# STREAMING EVENT SCHEMAS
# =============================================================================

class ProcessEventResponse(BaseModel):
    """Event from process execution stream"""
    type: str
    data: Dict[str, Any] = {}
    node_id: Optional[str] = None
    timestamp: datetime


# =============================================================================
# ENRICH FORM FIELDS (LLM-generated labels for run form)
# =============================================================================

class EnrichFormFieldsRequest(BaseModel):
    """Request to get LLM-enriched form field labels for a process run form"""
    agent_id: Optional[str] = Field(default=None, description="Agent ID to load process context from")
    process_definition: Optional[Dict[str, Any]] = Field(default=None, description="Process definition (if not using agent_id)")
    goal: Optional[str] = Field(default=None, description="Process/workflow goal for context")
    name: Optional[str] = Field(default=None, description="Process/workflow name for context")


class EnrichedFormField(BaseModel):
    """Single form field with LLM-generated professional label and placeholder"""
    id: str = Field(..., description="Field key (from process definition)")
    label: str = Field(..., description="Professional, business-friendly label")
    placeholder: Optional[str] = Field(default=None, description="Placeholder text")
    type: str = Field(default="text", description="Field type: text, textarea, number, date, email, select")
    required: bool = Field(default=False, description="Whether the field is required")
    options: Optional[List[str]] = Field(default=None, description="Options for select type")
    description: Optional[str] = Field(default=None, description="Optional short help text")


class EnrichFormFieldsResponse(BaseModel):
    """Enriched form fields for the process run form"""
    fields: List[EnrichedFormField] = Field(default_factory=list, description="Fields with professional labels")


# =============================================================================
# PROCESS SUMMARY (business-friendly subtitle for published workflows)
# =============================================================================

class SummarizeProcessRequest(BaseModel):
    """Request a business-friendly summary for a workflow/process"""
    agent_id: Optional[str] = Field(default=None, description="Agent ID to load process context from")
    process_definition: Optional[Dict[str, Any]] = Field(default=None, description="Process definition (if not using agent_id)")
    goal: Optional[str] = Field(default=None, description="Original goal/prompt for context")
    name: Optional[str] = Field(default=None, description="Workflow name for context")


class SummarizeProcessResponse(BaseModel):
    """Business-friendly one-paragraph summary"""
    summary: str = Field(..., description="Short non-technical summary of what the workflow does")


# =============================================================================
# SCHEDULE UPDATE (for scheduled Process AI Agents)
# =============================================================================

class UpdateProcessScheduleRequest(BaseModel):
    """Update schedule configuration for a scheduled process agent"""
    cron: str = Field(..., description="Cron string (server validates and stores)")
    timezone: str = Field(default="UTC", description="IANA timezone name")
    enabled: bool = Field(default=True, description="Whether the schedule is enabled")


class UpdateProcessScheduleResponse(BaseModel):
    """Schedule update result"""
    ok: bool = Field(default=True, description="Whether the update succeeded")
