"""
Process Execution Results
Result types for node and process execution

Design Principles:
- Clear success/failure indication
- Rich error information for debugging
- Serializable for storage
- Type-safe with Pydantic
"""

from typing import Dict, Any, List, Optional, Union
from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum


class ExecutionStatus(str, Enum):
    """Execution outcome status"""
    SUCCESS = "success"
    FAILURE = "failure"
    SKIPPED = "skipped"
    WAITING = "waiting"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class ErrorCategory(str, Enum):
    """Categories of execution errors"""
    VALIDATION = "validation"        # Input validation failed
    CONFIGURATION = "configuration"  # Misconfiguration
    CONNECTION = "connection"        # Network/connection error
    AUTHENTICATION = "authentication"  # Auth failed
    AUTHORIZATION = "authorization"  # Permission denied
    TIMEOUT = "timeout"              # Operation timed out
    RATE_LIMIT = "rate_limit"        # Rate limited
    RESOURCE = "resource"            # Resource not found
    BUSINESS_LOGIC = "business_logic"  # Business rule violation
    INTERNAL = "internal"            # Internal error
    EXTERNAL = "external"            # External service error
    USER_CANCELLED = "user_cancelled"  # User cancelled


class ExecutionError(BaseModel):
    """
    Detailed error information
    
    Provides rich context for debugging and error handling.
    """
    category: ErrorCategory = Field(
        default=ErrorCategory.INTERNAL,
        description="Error category"
    )
    code: str = Field(
        default="UNKNOWN_ERROR",
        description="Error code for programmatic handling"
    )
    message: str = Field(..., description="Human-readable error message")
    details: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional error details"
    )
    
    # Business-friendly messaging
    business_message: Optional[str] = Field(
        default=None,
        description="Plain-language explanation for business users"
    )
    is_user_fixable: bool = Field(
        default=True,
        description="Whether the user can fix this (config issue) vs needs IT (bug)"
    )
    
    # For debugging
    stack_trace: Optional[str] = Field(default=None, description="Stack trace")
    
    # For retries
    is_retryable: bool = Field(
        default=False,
        description="Whether this error is retryable"
    )
    retry_after_seconds: Optional[int] = Field(
        default=None,
        description="Suggested retry delay"
    )
    
    # Source
    source_node_id: Optional[str] = Field(default=None)
    source_component: Optional[str] = Field(default=None)
    
    # Timestamp
    occurred_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_dict(self, for_user: bool = False) -> Dict[str, Any]:
        """
        Convert error to dictionary
        
        Args:
            for_user: If True, returns business-friendly message instead of technical details
        """
        if for_user:
            return {
                'title': self.get_user_title(),
                'message': self.get_user_message(),
                'can_retry': self.is_retryable,
                'is_user_fixable': self.is_user_fixable,
                'action_hint': self._get_action_hint(),
            }
        
        return {
            'category': self.category.value,
            'code': self.code,
            'message': self.message,
            'details': self.details,
            'business_message': self.business_message,
            'is_user_fixable': self.is_user_fixable,
            'is_retryable': self.is_retryable,
            'retry_after_seconds': self.retry_after_seconds,
            'source_node_id': self.source_node_id,
            'occurred_at': self.occurred_at.isoformat(),
        }
    
    def _get_action_hint(self) -> str:
        """Return a short hint telling the user what to do next."""
        if self.is_user_fixable:
            return "You may be able to fix this by updating the workflow configuration."
        return "This appears to be a technical issue. Please share the Technical view details with your IT team for investigation."
    
    def get_user_title(self) -> str:
        """Get business-friendly error title"""
        titles = {
            ErrorCategory.VALIDATION: "Validation Issue",
            ErrorCategory.TIMEOUT: "Taking Too Long",
            ErrorCategory.RESOURCE: "Limit Reached",
            ErrorCategory.CONNECTION: "Connection Problem",
            ErrorCategory.AUTHENTICATION: "Authentication Issue",
            ErrorCategory.AUTHORIZATION: "Permission Issue",
            ErrorCategory.CONFIGURATION: "Setup Problem",
            ErrorCategory.INTERNAL: "Something Went Wrong",
            ErrorCategory.EXTERNAL: "Service Error",
            ErrorCategory.USER_CANCELLED: "Cancelled",
        }
        return titles.get(self.category, "Error")
    
    def get_user_message(self) -> str:
        """Get business-friendly error message"""
        # Use explicit business_message if provided
        if self.business_message:
            return self.business_message

        # Map error codes to user-friendly messages
        user_messages = {
            # LLM/AI errors
            "NO_LLM": "The AI service is not configured. Please contact your administrator.",
            "LLM_ERROR": "The AI couldn't process your request. Please try again.",
            "INVALID_JSON": "The AI step could not produce structured data from the input. The extracted content may not match what was expected.",
            "AI_HALLUCINATION": "The AI generated data that doesn't match the actual input. The step has been stopped to prevent incorrect results.",
            
            # Tool errors
            "TOOL_ACCESS_DENIED": "You don't have permission to use this feature.",
            "TOOL_NOT_AVAILABLE": "This feature is not available for this workflow.",
            "TOOL_NOT_FOUND": "The selected tool was not found.",
            "TOOL_ERROR": "The tool encountered an error. Please try again.",
            
            # Connection errors
            "DB_CONNECTION_NOT_FOUND": "Database connection not found. Please check your settings.",
            "DB_ERROR": "Could not access the database. Please try again.",
            "HTTP_ERROR": "Could not connect to the service. Please check your connection.",
            "CONNECTION_ERROR": "Connection failed. Please check your network.",
            
            # Auth errors
            "AUTH_CONFIG_ERROR": "Authentication settings are incorrect.",
            "AUTHENTICATION_FAILED": "Login failed. Please check your credentials.",
            
            # Resource errors
            "MAX_NODES_EXCEEDED": "This workflow is too complex. Please simplify it.",
            "TIMEOUT": "The operation took too long. Please try again.",
            
            # Config errors
            "NO_EXECUTOR": "This step type is not supported.",
            "UNSUPPORTED_STORAGE": "This storage type is not supported.",
            "UNSUPPORTED_QUEUE": "This message queue type is not supported.",
            
            # File errors
            "FILE_ERROR": "Could not access the uploaded file. Please re-upload and try again.",
            "FILE_NOT_FOUND": "The uploaded file could not be found on the server. Please re-upload and try again.",
            "EXTRACTION_FAILED": "Could not read content from the uploaded file. The file may be corrupted or in an unsupported format.",
            
            # Notification errors
            "NO_RECIPIENTS": "The notification could not be sent because no valid recipient was configured.",
            "NOTIFICATION_FAILED": "The notification could not be delivered. Please check the recipient configuration.",
            
            # Queue errors
            "QUEUE_ERROR": "Could not send the message. Please try again.",
            
            # Validation
            "VALIDATION_FAILED": "The data didn't pass the required checks.",
            "VALIDATION_ERROR": "The step configuration is incomplete or incorrect.",
        }
        
        # Try to find a user-friendly message
        if self.code in user_messages:
            return user_messages[self.code]
        
        # If code starts with HTTP_, it's an HTTP status error
        if self.code.startswith("HTTP_"):
            status = self.code.replace("HTTP_", "")
            if status.startswith("4"):
                return "The service rejected the request. Please check your settings."
            elif status.startswith("5"):
                return "The service is temporarily unavailable. Please try again later."
        
        # Fallback: sanitize the technical message
        return "An error occurred. Please try again or contact support."
    
    @classmethod
    def validation_error(cls, message: str, details: Dict[str, Any] = None) -> 'ExecutionError':
        """Create a validation error"""
        return cls(
            category=ErrorCategory.VALIDATION,
            code="VALIDATION_ERROR",
            message=message,
            details=details,
            is_retryable=False
        )
    
    @classmethod
    def connection_error(cls, message: str, is_retryable: bool = True) -> 'ExecutionError':
        """Create a connection error"""
        return cls(
            category=ErrorCategory.CONNECTION,
            code="CONNECTION_ERROR",
            message=message,
            is_retryable=is_retryable,
            retry_after_seconds=5
        )
    
    @classmethod
    def timeout_error(cls, message: str, timeout_seconds: int) -> 'ExecutionError':
        """Create a timeout error"""
        return cls(
            category=ErrorCategory.TIMEOUT,
            code="TIMEOUT_ERROR",
            message=message,
            details={'timeout_seconds': timeout_seconds},
            is_retryable=True,
            retry_after_seconds=10
        )
    
    @classmethod
    def internal_error(cls, message: str, stack_trace: str = None) -> 'ExecutionError':
        """Create an internal error"""
        return cls(
            category=ErrorCategory.INTERNAL,
            code="INTERNAL_ERROR",
            message=message,
            stack_trace=stack_trace,
            is_retryable=False
        )


class NodeResult(BaseModel):
    """
    Result from executing a single node
    
    Every node executor returns this result type.
    """
    # Outcome
    status: ExecutionStatus = Field(..., description="Execution status")
    
    # Output data (if successful)
    output: Any = Field(default=None, description="Node output data")
    
    # For conditional nodes: which path was taken
    next_node_id: Optional[str] = Field(
        default=None,
        description="Next node to execute (for branching nodes)"
    )
    
    # For parallel nodes: multiple next nodes
    next_node_ids: Optional[List[str]] = Field(
        default=None,
        description="Next nodes for parallel execution"
    )
    
    # Variables to update
    variables_update: Dict[str, Any] = Field(
        default_factory=dict,
        description="Variables to update in state"
    )
    
    # Error (if failed)
    error: Optional[ExecutionError] = Field(
        default=None,
        description="Error information if failed"
    )
    
    # Metrics
    duration_ms: float = Field(default=0, description="Execution duration")
    tokens_used: int = Field(default=0, description="LLM tokens used")
    
    # Logging
    logs: List[str] = Field(default_factory=list, description="Execution logs")
    
    # For human tasks: waiting information
    waiting_for: Optional[str] = Field(
        default=None,
        description="What we're waiting for (approval, event, etc.)"
    )
    waiting_metadata: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Metadata for waiting state"
    )
    
    @property
    def is_success(self) -> bool:
        return self.status == ExecutionStatus.SUCCESS
    
    @property
    def is_failure(self) -> bool:
        return self.status == ExecutionStatus.FAILURE
    
    @property
    def is_waiting(self) -> bool:
        return self.status == ExecutionStatus.WAITING
    
    @property
    def should_continue(self) -> bool:
        """Whether execution should continue to next node"""
        return self.status in [ExecutionStatus.SUCCESS, ExecutionStatus.SKIPPED]
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'status': self.status.value,
            'output': self.output,
            'next_node_id': self.next_node_id,
            'next_node_ids': self.next_node_ids,
            'variables_update': self.variables_update,
            'error': self.error.to_dict() if self.error else None,
            'duration_ms': self.duration_ms,
            'tokens_used': self.tokens_used,
            'logs': self.logs,
            'waiting_for': self.waiting_for,
        }
    
    @classmethod
    def success(
        cls,
        output: Any = None,
        variables_update: Dict[str, Any] = None,
        next_node_id: str = None,
        next_node_ids: List[str] = None,
        duration_ms: float = 0,
        tokens_used: int = 0,
        logs: List[str] = None
    ) -> 'NodeResult':
        """Create a success result"""
        return cls(
            status=ExecutionStatus.SUCCESS,
            output=output,
            variables_update=variables_update or {},
            next_node_id=next_node_id,
            next_node_ids=next_node_ids,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            logs=logs or []
        )
    
    @classmethod
    def failure(
        cls,
        error: Union[ExecutionError, str],
        duration_ms: float = 0,
        logs: List[str] = None
    ) -> 'NodeResult':
        """Create a failure result"""
        if isinstance(error, str):
            error = ExecutionError(message=error)
        
        return cls(
            status=ExecutionStatus.FAILURE,
            error=error,
            duration_ms=duration_ms,
            logs=logs or []
        )
    
    @classmethod
    def skipped(cls, reason: str = None) -> 'NodeResult':
        """Create a skipped result"""
        return cls(
            status=ExecutionStatus.SKIPPED,
            logs=[f"Skipped: {reason}"] if reason else []
        )
    
    @classmethod
    def waiting(
        cls,
        waiting_for: str,
        waiting_metadata: Dict[str, Any] = None,
        output: Any = None,
        logs: List[str] = None,
    ) -> 'NodeResult':
        """Create a waiting result"""
        return cls(
            status=ExecutionStatus.WAITING,
            waiting_for=waiting_for,
            waiting_metadata=waiting_metadata,
            output=output,
            logs=logs or [],
        )


class ProcessResult(BaseModel):
    """
    Result from executing an entire process
    """
    # Outcome
    status: ExecutionStatus = Field(..., description="Final process status")
    
    # Final output
    output: Any = Field(default=None, description="Process output")
    
    # Final variables state
    final_variables: Dict[str, Any] = Field(
        default_factory=dict,
        description="Final variable values"
    )
    
    # Execution path
    nodes_executed: List[str] = Field(
        default_factory=list,
        description="List of executed node IDs in order"
    )
    nodes_skipped: List[str] = Field(
        default_factory=list,
        description="List of skipped node IDs"
    )
    
    # Error (if failed)
    error: Optional[ExecutionError] = Field(default=None)
    failed_node_id: Optional[str] = Field(
        default=None,
        description="Node that caused failure"
    )
    
    # Metrics
    total_duration_ms: float = Field(default=0)
    total_tokens_used: int = Field(default=0)
    node_count: int = Field(default=0)
    
    # For waiting processes
    can_resume: bool = Field(default=False)
    resume_node_id: Optional[str] = Field(default=None)
    waiting_for: Optional[str] = Field(default=None)
    waiting_metadata: Optional[Dict[str, Any]] = Field(default=None, description="Metadata for waiting state (e.g. approval request)")
    
    # Execution ID for reference
    execution_id: Optional[str] = Field(default=None)
    
    @property
    def is_success(self) -> bool:
        return self.status == ExecutionStatus.SUCCESS
    
    @property
    def is_failure(self) -> bool:
        return self.status == ExecutionStatus.FAILURE
    
    @property
    def is_waiting(self) -> bool:
        return self.status == ExecutionStatus.WAITING
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'status': self.status.value,
            'output': self.output,
            'final_variables': self.final_variables,
            'nodes_executed': self.nodes_executed,
            'nodes_skipped': self.nodes_skipped,
            'error': self.error.to_dict() if self.error else None,
            'failed_node_id': self.failed_node_id,
            'total_duration_ms': self.total_duration_ms,
            'total_tokens_used': self.total_tokens_used,
            'node_count': self.node_count,
            'can_resume': self.can_resume,
            'resume_node_id': self.resume_node_id,
            'waiting_for': self.waiting_for,
            'execution_id': self.execution_id,
        }
    
    @classmethod
    def success(
        cls,
        output: Any = None,
        final_variables: Dict[str, Any] = None,
        nodes_executed: List[str] = None,
        total_duration_ms: float = 0,
        execution_id: str = None
    ) -> 'ProcessResult':
        """Create a success result"""
        return cls(
            status=ExecutionStatus.SUCCESS,
            output=output,
            final_variables=final_variables or {},
            nodes_executed=nodes_executed or [],
            node_count=len(nodes_executed or []),
            total_duration_ms=total_duration_ms,
            execution_id=execution_id
        )
    
    @classmethod
    def failure(
        cls,
        error: Union[ExecutionError, str],
        failed_node_id: str = None,
        nodes_executed: List[str] = None,
        total_duration_ms: float = 0,
        execution_id: str = None
    ) -> 'ProcessResult':
        """Create a failure result"""
        if isinstance(error, str):
            error = ExecutionError(message=error)
        
        return cls(
            status=ExecutionStatus.FAILURE,
            error=error,
            failed_node_id=failed_node_id,
            nodes_executed=nodes_executed or [],
            node_count=len(nodes_executed or []),
            total_duration_ms=total_duration_ms,
            execution_id=execution_id
        )
    
    @classmethod
    def waiting(
        cls,
        waiting_for: str,
        resume_node_id: str,
        nodes_executed: List[str] = None,
        final_variables: Dict[str, Any] = None,
        execution_id: str = None,
        waiting_metadata: Dict[str, Any] = None
    ) -> 'ProcessResult':
        """Create a waiting result"""
        return cls(
            status=ExecutionStatus.WAITING,
            waiting_for=waiting_for,
            resume_node_id=resume_node_id,
            can_resume=True,
            nodes_executed=nodes_executed or [],
            node_count=len(nodes_executed or []),
            final_variables=final_variables or {},
            execution_id=execution_id,
            waiting_metadata=waiting_metadata
        )
