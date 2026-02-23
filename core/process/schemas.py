"""
Process Definition Schemas
Pydantic models for process/workflow definitions

These schemas define the structure of process definitions that are stored
in the Agent.process_definition field as JSON.

Design Principles:
- All fields have sensible defaults
- Full validation with clear error messages
- Serializable to/from JSON
- Compatible with visual flow builder
"""

from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field, field_validator
from enum import Enum
from datetime import datetime


# =============================================================================
# ENUMS (for schema validation, stored as strings in DB)
# =============================================================================

class NodeType(str, Enum):
    """Types of nodes in a process flow"""
    # Flow Control
    START = "start"
    END = "end"
    
    # Logic Nodes
    CONDITION = "condition"
    SWITCH = "switch"
    LOOP = "loop"
    WHILE = "while"
    PARALLEL = "parallel"
    SUB_PROCESS = "sub_process"
    MERGE = "merge"
    
    # Task Nodes
    AI_TASK = "ai_task"
    TOOL_CALL = "tool_call"
    SCRIPT = "script"
    
    # Integration Nodes
    HTTP_REQUEST = "http_request"
    DATABASE_QUERY = "database_query"
    FILE_OPERATION = "file_operation"
    MESSAGE_QUEUE = "message_queue"
    
    # Human Nodes
    HUMAN_TASK = "human_task"
    APPROVAL = "approval"
    NOTIFICATION = "notification"
    
    # Data Nodes
    TRANSFORM = "transform"
    VALIDATE = "validate"
    AGGREGATE = "aggregate"
    FILTER = "filter"
    MAP = "map"
    
    # Timing Nodes
    DELAY = "delay"
    SCHEDULE = "schedule"
    EVENT_WAIT = "event_wait"
    
    # Error Handling
    TRY_CATCH = "try_catch"
    RETRY = "retry"


class TriggerType(str, Enum):
    """Types of triggers that can start a process"""
    MANUAL = "manual"
    HTTP_WEBHOOK = "http_webhook"
    SCHEDULE = "schedule"
    EVENT = "event"
    CONVERSATION = "conversation"
    SUBPROCESS = "subprocess"


class VariableType(str, Enum):
    """Variable data types"""
    STRING = "string"
    NUMBER = "number"
    BOOLEAN = "boolean"
    OBJECT = "object"
    ARRAY = "array"
    ANY = "any"


# =============================================================================
# VARIABLE DEFINITIONS
# =============================================================================

class ProcessVariable(BaseModel):
    """
    Variable definition for process-level state
    
    Variables are the working memory of a process execution.
    They can be set by triggers, nodes, or external inputs.
    """
    name: str = Field(..., description="Variable name (alphanumeric with underscores)")
    type: VariableType = Field(default=VariableType.ANY, description="Data type")
    default: Any = Field(default=None, description="Default value")
    description: Optional[str] = Field(default=None, description="Variable description")
    required: bool = Field(default=False, description="Must be set before process starts")
    sensitive: bool = Field(default=False, description="Contains sensitive data (masked in logs)")
    
    @field_validator('name')
    @classmethod
    def validate_name(cls, v):
        if not v or not v.replace('_', '').isalnum():
            raise ValueError('Variable name must be alphanumeric with underscores')
        return v


# =============================================================================
# TRIGGER CONFIGURATION
# =============================================================================

class WebhookTriggerConfig(BaseModel):
    """Configuration for HTTP webhook trigger"""
    path: Optional[str] = Field(default=None, description="Custom webhook path")
    method: str = Field(default="POST", description="HTTP method")
    auth_type: str = Field(default="api_key", description="Authentication type")
    validate_payload: bool = Field(default=True, description="Validate incoming payload")
    payload_schema: Optional[Dict[str, Any]] = Field(default=None, description="JSON Schema for payload")


class ScheduleTriggerConfig(BaseModel):
    """Configuration for scheduled trigger"""
    cron: str = Field(..., description="Cron expression")
    timezone: str = Field(default="UTC", description="Timezone for schedule")
    enabled: bool = Field(default=True, description="Whether schedule is active")


class EventTriggerConfig(BaseModel):
    """Configuration for event-based trigger"""
    event_type: str = Field(..., description="Event type to listen for")
    source: Optional[str] = Field(default=None, description="Event source filter")
    filter_expression: Optional[str] = Field(default=None, description="Filter expression")


class ProcessTrigger(BaseModel):
    """
    Process trigger definition
    
    Defines how and when a process can be started.
    """
    type: TriggerType = Field(default=TriggerType.MANUAL, description="Trigger type")
    config: Dict[str, Any] = Field(default_factory=dict, description="Trigger-specific configuration")
    
    # Input schema for trigger
    input_schema: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="JSON Schema for trigger input"
    )
    
    # Variables populated from trigger
    output_variables: List[str] = Field(
        default_factory=list,
        description="Variables populated from trigger input"
    )


# =============================================================================
# NODE CONFIGURATION
# =============================================================================

class Position(BaseModel):
    """Visual position for flow builder"""
    x: float = Field(default=0, description="X coordinate")
    y: float = Field(default=0, description="Y coordinate")


class RetryConfig(BaseModel):
    """Retry configuration for nodes"""
    enabled: bool = Field(default=False, description="Enable retry on failure")
    max_attempts: int = Field(default=3, description="Maximum retry attempts")
    delay_seconds: int = Field(default=5, description="Delay between retries")
    backoff_multiplier: float = Field(default=2.0, description="Exponential backoff multiplier")
    retry_on: List[str] = Field(
        default_factory=lambda: ["timeout", "connection_error"],
        description="Error types to retry on"
    )


class TimeoutConfig(BaseModel):
    """Timeout configuration for nodes"""
    enabled: bool = Field(default=True, description="Enable timeout")
    seconds: int = Field(default=300, description="Timeout in seconds")
    action: str = Field(default="fail", description="Action on timeout: fail, skip, retry")


class NodeConfig(BaseModel):
    """
    Base configuration for all node types
    
    Each node type extends this with specific fields.
    The 'type_config' field contains type-specific configuration.
    """
    # Display
    label: Optional[str] = Field(default=None, description="Display label")
    description: Optional[str] = Field(default=None, description="Node description")
    icon: Optional[str] = Field(default=None, description="Node icon")
    color: Optional[str] = Field(default=None, description="Node color for visual builder")
    
    # Behavior
    enabled: bool = Field(default=True, description="Whether node is enabled")
    skip_on_error: bool = Field(default=False, description="Skip instead of fail on error")
    
    # Retry & Timeout
    retry: RetryConfig = Field(default_factory=RetryConfig, description="Retry configuration")
    timeout: TimeoutConfig = Field(default_factory=TimeoutConfig, description="Timeout configuration")
    
    # Logging
    log_input: bool = Field(default=True, description="Log node input")
    log_output: bool = Field(default=True, description="Log node output")
    
    # Type-specific configuration (varies by node type)
    type_config: Dict[str, Any] = Field(default_factory=dict, description="Type-specific config")


# =============================================================================
# EDGE DEFINITION
# =============================================================================

class ProcessEdge(BaseModel):
    """
    Edge connecting two nodes
    
    Defines the flow between nodes, including conditions.
    """
    id: str = Field(..., description="Unique edge ID")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    
    # Conditional edges
    condition: Optional[str] = Field(
        default=None, 
        description="Condition expression (for conditional edges)"
    )
    label: Optional[str] = Field(default=None, description="Edge label for display")
    
    # Visual
    animated: bool = Field(default=False, description="Animate edge in visual builder")
    style: Optional[Dict[str, Any]] = Field(default=None, description="Edge styling")
    
    # Edge type
    edge_type: str = Field(default="default", description="Edge type: default, success, failure, conditional")


# =============================================================================
# NODE DEFINITION
# =============================================================================

class ProcessNode(BaseModel):
    """
    Process node definition
    
    A node is a single step in the process flow.
    """
    id: str = Field(..., description="Unique node ID")
    type: NodeType = Field(..., description="Node type")
    name: str = Field(..., description="Node name")
    
    # Configuration
    config: NodeConfig = Field(default_factory=NodeConfig, description="Node configuration")
    
    # Visual position
    position: Position = Field(default_factory=Position, description="Visual position")
    
    # Input/Output
    input_mapping: Dict[str, str] = Field(
        default_factory=dict,
        description="Map process variables to node inputs"
    )
    output_variable: Optional[str] = Field(
        default=None,
        description="Variable to store node output"
    )
    
    # Connections (simplified - edges define full connections)
    next: Optional[Union[str, List[str]]] = Field(
        default=None,
        description="Next node ID(s) - for simple flows without conditions"
    )
    
    # Error handling
    on_error: Optional[str] = Field(
        default=None,
        description="Node to jump to on error"
    )
    
    @field_validator('id', 'name')
    @classmethod
    def validate_not_empty(cls, v):
        if not v or not v.strip():
            raise ValueError('Cannot be empty')
        return v.strip()


# =============================================================================
# FULL PROCESS DEFINITION
# =============================================================================

class ProcessSettings(BaseModel):
    """
    Process-level settings
    """
    # Execution limits
    max_execution_time_seconds: int = Field(
        default=3600, 
        description="Maximum total execution time"
    )
    max_node_executions: int = Field(
        default=1000, 
        description="Maximum nodes to execute (prevents infinite loops)"
    )
    max_parallel_branches: int = Field(
        default=10,
        description="Maximum parallel branches"
    )
    
    # Retry policy
    default_retry: RetryConfig = Field(
        default_factory=RetryConfig,
        description="Default retry policy for nodes"
    )
    
    # Logging
    log_level: str = Field(default="info", description="Logging level")
    log_variables: bool = Field(default=True, description="Log variable changes")
    mask_sensitive: bool = Field(default=True, description="Mask sensitive variables in logs")
    
    # Checkpointing
    checkpoint_enabled: bool = Field(default=True, description="Enable checkpointing")
    checkpoint_interval_nodes: int = Field(
        default=5, 
        description="Checkpoint every N nodes"
    )


class ProcessDefinition(BaseModel):
    """
    Complete Process Definition
    
    This is the full schema stored in Agent.process_definition.
    Defines the entire workflow including nodes, edges, triggers, and settings.
    """
    # Version for schema migrations
    version: str = Field(default="1.0", description="Schema version")
    
    # Metadata
    name: str = Field(..., description="Process name")
    description: Optional[str] = Field(default=None, description="Process description")
    tags: List[str] = Field(default_factory=list, description="Process tags")
    
    # Trigger
    trigger: ProcessTrigger = Field(
        default_factory=ProcessTrigger,
        description="How the process is triggered"
    )
    
    # Variables
    variables: List[ProcessVariable] = Field(
        default_factory=list,
        description="Process-level variables"
    )
    
    # Flow definition
    nodes: List[ProcessNode] = Field(
        default_factory=list,
        description="Process nodes"
    )
    edges: List[ProcessEdge] = Field(
        default_factory=list,
        description="Connections between nodes"
    )
    
    # Settings
    settings: ProcessSettings = Field(
        default_factory=ProcessSettings,
        description="Process settings"
    )
    
    # Visual builder metadata
    viewport: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Viewport state for visual builder"
    )
    
    @field_validator('nodes')
    @classmethod
    def validate_has_start_and_end(cls, v):
        """Ensure process has start and end nodes"""
        if not v:
            return v
        
        types = [node.type for node in v]
        if NodeType.START not in types:
            raise ValueError('Process must have a START node')
        if NodeType.END not in types:
            raise ValueError('Process must have at least one END node')
        
        # Ensure only one start node
        if types.count(NodeType.START) > 1:
            raise ValueError('Process can only have one START node')
        
        return v
    
    @field_validator('nodes')
    @classmethod
    def validate_unique_ids(cls, v):
        """Ensure all node IDs are unique"""
        if not v:
            return v
        
        ids = [node.id for node in v]
        if len(ids) != len(set(ids)):
            raise ValueError('All node IDs must be unique')
        
        return v
    
    def get_node(self, node_id: str) -> Optional[ProcessNode]:
        """Get node by ID"""
        for node in self.nodes:
            if node.id == node_id:
                return node
        return None
    
    def get_start_node(self) -> Optional[ProcessNode]:
        """Get the start node"""
        for node in self.nodes:
            if node.type == NodeType.START:
                return node
        return None
    
    def get_outgoing_edges(self, node_id: str) -> List[ProcessEdge]:
        """Get edges going out from a node"""
        return [edge for edge in self.edges if edge.source == node_id]
    
    def get_incoming_edges(self, node_id: str) -> List[ProcessEdge]:
        """Get edges coming into a node"""
        return [edge for edge in self.edges if edge.target == node_id]
    
    def get_next_nodes(self, node_id: str) -> List[str]:
        """Get IDs of nodes that follow a given node"""
        edges = self.get_outgoing_edges(node_id)
        return [edge.target for edge in edges]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON storage"""
        return self.model_dump(mode='json')
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProcessDefinition':
        """Create from dictionary"""
        return cls.model_validate(data)


# =============================================================================
# NODE TYPE CONFIGURATIONS
# =============================================================================

class AITaskConfig(BaseModel):
    """Configuration for AI_TASK nodes"""
    prompt: str = Field(..., description="Prompt template with variable interpolation")
    model: Optional[str] = Field(default=None, description="Override model for this task")
    temperature: float = Field(default=0.7, description="LLM temperature")
    max_tokens: Optional[int] = Field(default=None, description="Max tokens for response")
    
    # Output handling
    output_format: str = Field(default="text", description="text, json, structured")
    output_schema: Optional[Dict[str, Any]] = Field(
        default=None, 
        description="JSON Schema for structured output"
    )
    
    # Context
    include_history: bool = Field(default=False, description="Include conversation history")
    system_prompt: Optional[str] = Field(default=None, description="Custom system prompt")


class HTTPRequestConfig(BaseModel):
    """Configuration for HTTP_REQUEST nodes"""
    method: str = Field(default="GET", description="HTTP method")
    url: str = Field(..., description="URL template with variable interpolation")
    headers: Dict[str, str] = Field(default_factory=dict, description="Request headers")
    body: Optional[Any] = Field(default=None, description="Request body")
    
    # Authentication
    auth_type: Optional[str] = Field(default=None, description="none, basic, bearer, api_key")
    auth_config: Dict[str, Any] = Field(default_factory=dict, description="Auth configuration")
    
    # Response handling
    response_type: str = Field(default="json", description="json, text, binary")
    success_codes: List[int] = Field(default_factory=lambda: [200, 201, 204])
    
    # TLS/Security
    verify_ssl: bool = Field(default=True, description="Verify SSL certificate")


class DatabaseQueryConfig(BaseModel):
    """Configuration for DATABASE_QUERY nodes"""
    connection_id: str = Field(..., description="Database connection ID (from tools)")
    operation: str = Field(default="query", description="query, insert, update, delete")
    query: Optional[str] = Field(default=None, description="SQL query template")
    
    # For structured operations
    table: Optional[str] = Field(default=None, description="Table name")
    data: Optional[Dict[str, Any]] = Field(default=None, description="Data for insert/update")
    where: Optional[Dict[str, Any]] = Field(default=None, description="Where conditions")
    
    # Options
    return_results: bool = Field(default=True, description="Return query results")
    max_rows: int = Field(default=1000, description="Maximum rows to return")


class ConditionRule(BaseModel):
    """A single condition rule"""
    field: str = Field(default="", description="Field to evaluate")
    operator: str = Field(default="equals", description="Comparison operator")
    value: Optional[Any] = Field(default="", description="Value to compare against")


class ConditionConfig(BaseModel):
    """Configuration for CONDITION nodes"""
    expression: str = Field(default="", description="Condition expression to evaluate (auto-built from rules)")
    true_branch: str = Field(default="", description="Node ID if condition is true")
    false_branch: str = Field(default="", description="Node ID if condition is false")
    rules: List[ConditionRule] = Field(default_factory=lambda: [ConditionRule()], description="Business rules to evaluate")
    connectors: List[str] = Field(default_factory=list, description="Connectors between rules (and/or). Length must be rules.length - 1")
    logic: str = Field(default="and", description="Backward compatible global logic (expanded into connectors when needed)")


class SwitchConfig(BaseModel):
    """Configuration for SWITCH nodes"""
    expression: str = Field(..., description="Expression to evaluate")
    cases: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of {condition, target} pairs"
    )
    default: Optional[str] = Field(default=None, description="Default node ID")


class LoopConfig(BaseModel):
    """Configuration for LOOP nodes"""
    items_expression: str = Field(..., description="Expression that returns array to iterate")
    item_variable: str = Field(default="item", description="Variable name for current item")
    index_variable: str = Field(default="index", description="Variable name for current index")
    body_nodes: List[str] = Field(..., description="Node IDs to execute for each item")
    max_iterations: int = Field(default=1000, description="Maximum iterations (safety limit)")


class ParallelConfig(BaseModel):
    """Configuration for PARALLEL nodes"""
    branches: List[List[str]] = Field(
        ..., 
        description="List of node ID lists, each list is a parallel branch"
    )
    merge_strategy: str = Field(
        default="wait_all", 
        description="wait_all, wait_any, wait_n"
    )
    wait_count: Optional[int] = Field(
        default=None, 
        description="For wait_n strategy, how many to wait for"
    )
    fail_fast: bool = Field(default=True, description="Fail if any branch fails")


class SubProcessConfig(BaseModel):
    """Configuration for SUB_PROCESS nodes — invoke another published process"""
    process_id: str = Field(..., description="ID of the published process to invoke")
    input_mapping: Dict[str, Any] = Field(
        default_factory=dict,
        description="Map current process variables to sub-process input fields"
    )
    wait_for_completion: bool = Field(
        default=True,
        description="Whether to wait for the sub-process to finish before continuing"
    )
    timeout_seconds: Optional[int] = Field(
        default=3600,
        description="Timeout for sub-process execution"
    )


class ApprovalConfig(BaseModel):
    """Configuration for APPROVAL nodes"""
    title: str = Field(..., description="Approval request title")
    description: Optional[str] = Field(default=None, description="Description for approver")
    
    # Assignees
    assignee_type: str = Field(default="user", description="user, role, group, department")
    assignee_ids: List[str] = Field(default_factory=list, description="Assignee IDs")
    
    # Requirements
    min_approvals: int = Field(default=1, description="Minimum approvals required")
    
    # Timeout
    timeout_hours: Optional[int] = Field(default=24, description="Hours before timeout")
    timeout_action: str = Field(default="fail", description="fail, approve, reject, escalate")
    
    # Escalation
    escalation_enabled: bool = Field(default=False)
    escalation_after_hours: Optional[int] = Field(default=None)
    escalation_assignee_ids: List[str] = Field(default_factory=list)
    
    # Form fields for approver input
    form_fields: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Additional fields for approver to fill"
    )


class TransformConfig(BaseModel):
    """Configuration for TRANSFORM nodes"""
    transform_type: str = Field(
        default="map", 
        description="map, filter, aggregate, script"
    )
    
    # For map transform
    mapping: Optional[Dict[str, str]] = Field(
        default=None,
        description="Field mapping: {target_field: source_expression}"
    )
    
    # For filter transform
    filter_expression: Optional[str] = Field(default=None)
    
    # For aggregate transform
    group_by: Optional[List[str]] = Field(default=None)
    aggregations: Optional[Dict[str, str]] = Field(default=None)
    
    # For script transform
    script_language: str = Field(default="python", description="python or javascript")
    script: Optional[str] = Field(default=None, description="Transform script")


class DelayConfig(BaseModel):
    """Configuration for DELAY nodes"""
    delay_type: str = Field(default="seconds", description="seconds, until_time, until_date")
    seconds: Optional[int] = Field(default=None, description="Delay in seconds")
    until_time: Optional[str] = Field(default=None, description="Wait until time (HH:MM)")
    until_datetime: Optional[str] = Field(default=None, description="Wait until datetime (ISO format)")


class ToolCallConfig(BaseModel):
    """Configuration for TOOL_CALL nodes (uses platform tools)"""
    tool_id: str = Field(..., description="Tool ID from platform tools")
    arguments: Dict[str, Any] = Field(
        default_factory=dict, 
        description="Arguments to pass to tool (supports variable interpolation)"
    )
    
    # Approval
    requires_approval: bool = Field(default=False)
    approval_config: Optional[ApprovalConfig] = Field(default=None)
