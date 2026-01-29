"""
Centralized Enum Definitions for AgentForge
Enterprise-grade enum management with validation and mapping
"""
from enum import Enum
from typing import Dict, List, Optional


# =============================================================================
# AGENT TYPE ENUMS
# =============================================================================

class AgentType(str, Enum):
    """
    Agent Type Enumeration
    
    Defines the fundamental operating mode of an agent.
    - CONVERSATIONAL: Free-form chat with tasks (current default behavior)
    - PROCESS: Workflow/Integration process with defined steps and flow
    """
    CONVERSATIONAL = "conversational"  # Free-form conversation with tasks
    PROCESS = "process"                # Workflow/Integration process agent
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]
    
    @classmethod
    def from_legacy(cls, value: str) -> 'AgentType':
        """Convert legacy values - default to conversational"""
        if not value:
            return cls.CONVERSATIONAL
        normalized = value.lower().strip()
        try:
            return cls(normalized)
        except ValueError:
            return cls.CONVERSATIONAL


# =============================================================================
# PROCESS/WORKFLOW ENUMS
# =============================================================================

class ProcessStatus(str, Enum):
    """Process definition lifecycle status"""
    DRAFT = "draft"              # Being designed
    ACTIVE = "active"            # Published and available
    PAUSED = "paused"            # Temporarily disabled
    ARCHIVED = "archived"        # No longer in use
    DEPRECATED = "deprecated"    # Marked for removal
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class ProcessExecutionStatus(str, Enum):
    """Status of a process execution instance"""
    PENDING = "pending"          # Queued, not started
    RUNNING = "running"          # Currently executing
    WAITING = "waiting"          # Waiting for external input (approval, webhook, etc.)
    PAUSED = "paused"            # Manually paused
    COMPLETED = "completed"      # Successfully finished
    FAILED = "failed"            # Execution failed
    CANCELLED = "cancelled"      # Manually cancelled
    TIMED_OUT = "timed_out"      # Exceeded time limit
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]
    
    @classmethod
    def terminal_states(cls) -> List['ProcessExecutionStatus']:
        """States that indicate the execution has ended"""
        return [cls.COMPLETED, cls.FAILED, cls.CANCELLED, cls.TIMED_OUT]
    
    @classmethod
    def active_states(cls) -> List['ProcessExecutionStatus']:
        """States that indicate the execution is still active"""
        return [cls.PENDING, cls.RUNNING, cls.WAITING, cls.PAUSED]


class ProcessNodeType(str, Enum):
    """Types of nodes in a process flow"""
    # Flow Control
    START = "start"              # Entry point
    END = "end"                  # Exit point
    
    # Logic Nodes
    CONDITION = "condition"      # If/Else branching
    SWITCH = "switch"            # Multi-way branching
    LOOP = "loop"                # For each iteration
    WHILE = "while"              # While loop
    PARALLEL = "parallel"        # Parallel execution
    MERGE = "merge"              # Merge parallel branches
    
    # Task Nodes
    AI_TASK = "ai_task"          # LLM-powered task
    TOOL_CALL = "tool_call"      # Execute a platform tool
    SCRIPT = "script"            # Custom script execution
    
    # Integration Nodes
    HTTP_REQUEST = "http_request"    # REST API call
    DATABASE_QUERY = "database_query" # Database operation
    FILE_OPERATION = "file_operation" # File read/write
    MESSAGE_QUEUE = "message_queue"   # Pub/sub messaging
    
    # Human Nodes
    HUMAN_TASK = "human_task"        # Requires human input
    APPROVAL = "approval"            # Approval gate
    NOTIFICATION = "notification"    # Send notification
    
    # Data Nodes
    TRANSFORM = "transform"      # Data transformation
    VALIDATE = "validate"        # Data validation
    AGGREGATE = "aggregate"      # Aggregate data
    FILTER = "filter"            # Filter data
    MAP = "map"                  # Map/project data
    
    # Timing Nodes
    DELAY = "delay"              # Wait for duration
    SCHEDULE = "schedule"        # Wait until time
    EVENT_WAIT = "event_wait"    # Wait for event
    
    # Error Handling
    TRY_CATCH = "try_catch"      # Error handling block
    RETRY = "retry"              # Retry logic
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]
    
    @classmethod
    def integration_nodes(cls) -> List['ProcessNodeType']:
        """Nodes that integrate with external systems"""
        return [cls.HTTP_REQUEST, cls.DATABASE_QUERY, cls.FILE_OPERATION, cls.MESSAGE_QUEUE]
    
    @classmethod
    def logic_nodes(cls) -> List['ProcessNodeType']:
        """Nodes that control flow logic"""
        return [cls.CONDITION, cls.SWITCH, cls.LOOP, cls.WHILE, cls.PARALLEL, cls.MERGE]
    
    @classmethod
    def human_nodes(cls) -> List['ProcessNodeType']:
        """Nodes that require human interaction"""
        return [cls.HUMAN_TASK, cls.APPROVAL, cls.NOTIFICATION]


class ProcessTriggerType(str, Enum):
    """Types of triggers that can start a process"""
    MANUAL = "manual"            # User-initiated
    HTTP_WEBHOOK = "http_webhook" # External HTTP call
    SCHEDULE = "schedule"        # Cron-based schedule
    EVENT = "event"              # Internal event
    CONVERSATION = "conversation" # Started from conversation
    SUBPROCESS = "subprocess"    # Called by another process
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class ProcessNodeStatus(str, Enum):
    """Status of an individual node execution"""
    PENDING = "pending"          # Not yet executed
    RUNNING = "running"          # Currently executing
    WAITING = "waiting"          # Waiting for input/approval
    COMPLETED = "completed"      # Successfully finished
    FAILED = "failed"            # Execution failed
    SKIPPED = "skipped"          # Skipped (condition not met)
    RETRYING = "retrying"        # Retrying after failure
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class ToolType(str, Enum):
    """
    Tool Type Enumeration
    
    Supported tool categories for external integrations.
    This is the single source of truth for tool types.
    """
    # Core Integration Types
    API = "api"
    DATABASE = "database"
    
    # Knowledge & Search
    RAG = "rag"
    WEB_SEARCH = "web_search"
    WEB_SCRAPING = "web_scraping"
    WEBSITE = "website"  # Website monitoring/scraping
    
    # Communication
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    
    # Productivity
    SPREADSHEET = "spreadsheet"
    CALENDAR = "calendar"
    
    # Business
    CRM = "crm"
    
    # Extensibility
    CUSTOM = "custom"
    
    @classmethod
    def values(cls) -> List[str]:
        """Get all valid enum values"""
        return [e.value for e in cls]
    
    @classmethod
    def normalize(cls, value: str) -> Optional['ToolType']:
        """
        Normalize and validate a tool type value.
        Returns None if invalid.
        """
        if not value:
            return None
        
        # Normalize to lowercase
        normalized = value.lower().strip()
        
        # Direct match
        try:
            return cls(normalized)
        except ValueError:
            pass
        
        # Try legacy mapping
        mapped = TOOL_TYPE_LEGACY_MAPPING.get(normalized)
        if mapped:
            return mapped
        
        return None
    
    @classmethod
    def from_legacy(cls, legacy_value: str) -> 'ToolType':
        """
        Convert legacy tool type value to current enum.
        Falls back to CUSTOM if unknown.
        """
        normalized = cls.normalize(legacy_value)
        if normalized:
            return normalized
        
        # Unknown type - use CUSTOM
        return cls.CUSTOM


class AgentStatus(str, Enum):
    """Agent lifecycle status - values match PostgreSQL enum (UPPERCASE)"""
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"  # Agent is live and available
    ACTIVE = "ACTIVE"  # Alias for published (backwards compatibility)
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"
    DELETED = "DELETED"  # Soft delete
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class ConversationStatus(str, Enum):
    """Conversation lifecycle status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class KBStatus(str, Enum):
    """Knowledge Base status"""
    DRAFT = "draft"
    INDEXING = "indexing"
    ACTIVE = "active"
    ERROR = "error"
    ARCHIVED = "archived"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class DocumentStatus(str, Enum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


# =============================================================================
# LEGACY VALUE MAPPINGS
# =============================================================================

TOOL_TYPE_LEGACY_MAPPING: Dict[str, ToolType] = {
    # Legacy names → Current enum
    "web": ToolType.WEB_SCRAPING,
    "scraper": ToolType.WEB_SCRAPING,
    "scraping": ToolType.WEB_SCRAPING,
    "search": ToolType.WEB_SEARCH,
    "google": ToolType.WEB_SEARCH,
    "bing": ToolType.WEB_SEARCH,
    "site": ToolType.WEBSITE,
    "webpage": ToolType.WEBSITE,
    "http": ToolType.API,
    "rest": ToolType.API,
    "rest_api": ToolType.API,
    "graphql": ToolType.API,
    "sql": ToolType.DATABASE,
    "postgres": ToolType.DATABASE,
    "mysql": ToolType.DATABASE,
    "mongodb": ToolType.DATABASE,
    "vector": ToolType.RAG,
    "embedding": ToolType.RAG,
    "gmail": ToolType.EMAIL,
    "smtp": ToolType.EMAIL,
    "mail": ToolType.EMAIL,
    "sheets": ToolType.SPREADSHEET,
    "excel": ToolType.SPREADSHEET,
    "gcal": ToolType.CALENDAR,
    "salesforce": ToolType.CRM,
    "hubspot": ToolType.CRM,
}


# =============================================================================
# VALIDATION UTILITIES
# =============================================================================

def validate_enum_value(enum_class: type, value: str, field_name: str) -> None:
    """
    Validate that a value is valid for given enum.
    Raises ValueError if invalid.
    
    Args:
        enum_class: The enum class to validate against
        value: The value to validate
        field_name: Name of field (for error message)
    
    Raises:
        ValueError: If value is not valid for enum
    """
    if not value:
        raise ValueError(f"{field_name} cannot be empty")
    
    valid_values = [e.value for e in enum_class]
    if value not in valid_values:
        raise ValueError(
            f"Invalid {field_name}: '{value}'. "
            f"Valid values: {', '.join(valid_values)}"
        )


def get_all_enum_values(enum_class: type) -> List[str]:
    """Get all valid values for an enum class"""
    return [e.value for e in enum_class]


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    # Agent Types
    'AgentType',
    
    # Process/Workflow
    'ProcessStatus',
    'ProcessExecutionStatus',
    'ProcessNodeType',
    'ProcessTriggerType',
    'ProcessNodeStatus',
    
    # Existing
    'ToolType',
    'AgentStatus',
    'ConversationStatus',
    'KBStatus',
    'DocumentStatus',
    'TOOL_TYPE_LEGACY_MAPPING',
    'validate_enum_value',
    'get_all_enum_values',
]

