"""
Business-Friendly Messages
User-facing messages that non-technical users can understand

This module provides:
1. Error messages - Clear, actionable messages without technical jargon
2. Success messages - Confirmation messages
3. Status descriptions - Human-readable status explanations
4. Help text - Guidance for users

Guidelines followed:
- No technical terms (node, executor, exception, etc.)
- Actionable - tells user what to do
- Friendly tone
- No internal IDs exposed
"""

from typing import Dict, Any, Optional
from enum import Enum


# =============================================================================
# TERMINOLOGY MAPPING (Technical → Business)
# =============================================================================

TERMINOLOGY = {
    # Core terms
    "node": "step",
    "nodes": "steps",
    "executor": "action",
    "process": "workflow",
    "agent": "assistant",
    "execution": "run",
    "trigger": "start",
    "checkpoint": "save point",
    
    # Node types
    "start": "Start",
    "end": "Finish",
    "ai_task": "AI Task",
    "http_request": "Web Request",
    "database_query": "Database",
    "approval": "Approval",
    "notification": "Notification",
    "condition": "Decision",
    "switch": "Multiple Choice",
    "loop": "Repeat",
    "parallel": "Run Together",
    "transform": "Transform Data",
    "validate": "Check Data",
    "filter": "Filter",
    "delay": "Wait",
    "schedule": "Schedule",
    "human_task": "Task Assignment",
    "tool_call": "Use Tool",
    "script": "Custom Code",
    "file_operation": "File",
    "message_queue": "Send Message",
    
    # Status
    "pending": "Waiting to start",
    "running": "In progress",
    "waiting": "Waiting for input",
    "paused": "Paused",
    "completed": "Completed",
    "failed": "Error occurred",
    "cancelled": "Cancelled",
    "timed_out": "Took too long",
}


def get_business_term(technical_term: str) -> str:
    """Convert technical term to business-friendly term"""
    return TERMINOLOGY.get(technical_term.lower(), technical_term)


def get_node_type_display(node_type: str) -> str:
    """Get display name for a node type"""
    return TERMINOLOGY.get(node_type, node_type.replace('_', ' ').title())


# =============================================================================
# ERROR MESSAGES
# =============================================================================

class ErrorCode(str, Enum):
    """Error codes for programmatic handling (not shown to users)"""
    # Process errors
    PROCESS_NOT_FOUND = "PROCESS_NOT_FOUND"
    PROCESS_NOT_CONFIGURED = "PROCESS_NOT_CONFIGURED"
    PROCESS_INVALID = "PROCESS_INVALID"
    PROCESS_TOO_COMPLEX = "PROCESS_TOO_COMPLEX"
    PROCESS_TIMEOUT = "PROCESS_TIMEOUT"
    
    # Execution errors
    EXECUTION_NOT_FOUND = "EXECUTION_NOT_FOUND"
    EXECUTION_CANNOT_RESUME = "EXECUTION_CANNOT_RESUME"
    EXECUTION_CANNOT_CANCEL = "EXECUTION_CANNOT_CANCEL"
    EXECUTION_FAILED = "EXECUTION_FAILED"
    
    # Permission errors
    ACCESS_DENIED = "ACCESS_DENIED"
    PERMISSION_DENIED = "PERMISSION_DENIED"
    
    # Step errors
    STEP_NOT_SUPPORTED = "STEP_NOT_SUPPORTED"
    STEP_CONFIG_ERROR = "STEP_CONFIG_ERROR"
    STEP_FAILED = "STEP_FAILED"
    
    # Connection errors
    CONNECTION_FAILED = "CONNECTION_FAILED"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    
    # Data errors
    VALIDATION_FAILED = "VALIDATION_FAILED"
    DATA_ERROR = "DATA_ERROR"
    
    # Approval errors
    APPROVAL_NOT_FOUND = "APPROVAL_NOT_FOUND"
    APPROVAL_EXPIRED = "APPROVAL_EXPIRED"
    
    # General
    GENERAL_ERROR = "GENERAL_ERROR"


# User-friendly messages for each error code
ERROR_MESSAGES: Dict[ErrorCode, Dict[str, str]] = {
    ErrorCode.PROCESS_NOT_FOUND: {
        "title": "Workflow Not Found",
        "message": "We couldn't find the workflow you're looking for. It may have been deleted or you may not have access to it.",
        "action": "Please check your workflow list or contact the owner."
    },
    ErrorCode.PROCESS_NOT_CONFIGURED: {
        "title": "Workflow Not Ready",
        "message": "This workflow hasn't been set up yet.",
        "action": "Please configure the workflow before running it."
    },
    ErrorCode.PROCESS_INVALID: {
        "title": "Workflow Configuration Issue",
        "message": "There's a problem with how this workflow is configured.",
        "action": "Please review the workflow design and fix any highlighted issues."
    },
    ErrorCode.PROCESS_TOO_COMPLEX: {
        "title": "Workflow Too Complex",
        "message": "This workflow has too many steps to run safely.",
        "action": "Please simplify the workflow or break it into smaller workflows."
    },
    ErrorCode.PROCESS_TIMEOUT: {
        "title": "Workflow Took Too Long",
        "message": "The workflow didn't complete in the allowed time.",
        "action": "Please check if any steps are taking too long and try again."
    },
    ErrorCode.EXECUTION_NOT_FOUND: {
        "title": "Run Not Found",
        "message": "We couldn't find this workflow run.",
        "action": "Please check your run history."
    },
    ErrorCode.EXECUTION_CANNOT_RESUME: {
        "title": "Cannot Continue",
        "message": "This workflow run cannot be continued. It may have already completed or been cancelled.",
        "action": "Please start a new run if needed."
    },
    ErrorCode.EXECUTION_CANNOT_CANCEL: {
        "title": "Cannot Cancel",
        "message": "This workflow run cannot be cancelled. It may have already finished.",
        "action": "No action needed."
    },
    ErrorCode.EXECUTION_FAILED: {
        "title": "Workflow Error",
        "message": "Something went wrong while running the workflow.",
        "action": "Please try again. If the problem continues, contact support."
    },
    ErrorCode.ACCESS_DENIED: {
        "title": "Access Denied",
        "message": "You don't have permission to access this workflow.",
        "action": "Please contact the workflow owner to request access."
    },
    ErrorCode.PERMISSION_DENIED: {
        "title": "Permission Denied",
        "message": "You don't have permission to perform this action.",
        "action": "Please contact your administrator if you need this permission."
    },
    ErrorCode.STEP_NOT_SUPPORTED: {
        "title": "Step Not Available",
        "message": "This type of step is not available.",
        "action": "Please use a different step type."
    },
    ErrorCode.STEP_CONFIG_ERROR: {
        "title": "Step Configuration Issue",
        "message": "There's a problem with how this step is configured.",
        "action": "Please review the step settings."
    },
    ErrorCode.STEP_FAILED: {
        "title": "Step Failed",
        "message": "This step encountered an error.",
        "action": "Please check the step configuration and try again."
    },
    ErrorCode.CONNECTION_FAILED: {
        "title": "Connection Failed",
        "message": "We couldn't connect to the external service.",
        "action": "Please check your connection settings and try again."
    },
    ErrorCode.SERVICE_UNAVAILABLE: {
        "title": "Service Unavailable",
        "message": "The service is temporarily unavailable.",
        "action": "Please try again in a few minutes."
    },
    ErrorCode.VALIDATION_FAILED: {
        "title": "Validation Failed",
        "message": "The data didn't pass the required checks.",
        "action": "Please review the data and make sure it meets the requirements."
    },
    ErrorCode.DATA_ERROR: {
        "title": "Data Error",
        "message": "There was a problem with the data.",
        "action": "Please check your input and try again."
    },
    ErrorCode.APPROVAL_NOT_FOUND: {
        "title": "Approval Not Found",
        "message": "We couldn't find this approval request.",
        "action": "It may have been already processed or cancelled."
    },
    ErrorCode.APPROVAL_EXPIRED: {
        "title": "Approval Expired",
        "message": "This approval request has expired.",
        "action": "Please request a new approval if needed."
    },
    ErrorCode.GENERAL_ERROR: {
        "title": "Something Went Wrong",
        "message": "An unexpected error occurred.",
        "action": "Please try again. If the problem continues, contact support."
    },
}


def get_error_message(
    code: ErrorCode, 
    context: Dict[str, Any] = None
) -> Dict[str, str]:
    """
    Get user-friendly error message
    
    Args:
        code: Error code
        context: Optional context for customization
        
    Returns:
        Dict with title, message, and action
    """
    base_message = ERROR_MESSAGES.get(code, ERROR_MESSAGES[ErrorCode.GENERAL_ERROR])
    
    # Make a copy to avoid modifying the original
    result = base_message.copy()
    
    # Add context-specific details if provided
    if context:
        if 'step_name' in context:
            result['message'] = result['message'].replace(
                "This step", 
                f"The '{context['step_name']}' step"
            )
    
    return result


def format_error_for_user(
    code: ErrorCode,
    context: Dict[str, Any] = None,
    include_action: bool = True
) -> str:
    """
    Format error message as a single string for display
    """
    msg = get_error_message(code, context)
    
    if include_action:
        return f"{msg['message']} {msg['action']}"
    return msg['message']


def problem_details_rfc9457(
    status: int,
    code: ErrorCode,
    context: Dict[str, Any] = None,
    instance: Optional[str] = None,
    request_id: Optional[str] = None,
    detail_override: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Build RFC 9457 Problem Details object for API error responses.
    Ensures consistent, machine-readable errors across all process API endpoints.
    """
    msg = get_error_message(code, context)
    detail = detail_override if detail_override is not None else (
        f"{msg['message']} {msg['action']}" if msg.get('action') else msg['message']
    )
    out = {
        "type": f"https://api.agentforge.app/errors/{code.value}",
        "status": status,
        "title": msg.get("title", "Error"),
        "detail": detail,
        "code": code.value,
    }
    if instance:
        out["instance"] = instance
    if request_id:
        out["request_id"] = request_id
    return out


# =============================================================================
# SUCCESS MESSAGES
# =============================================================================

SUCCESS_MESSAGES = {
    "workflow_started": "Workflow started successfully!",
    "workflow_completed": "Workflow completed successfully!",
    "workflow_cancelled": "Workflow has been cancelled.",
    "workflow_resumed": "Workflow has been resumed.",
    "workflow_saved": "Workflow saved successfully!",
    "approval_submitted": "Your decision has been recorded.",
    "approval_approved": "Request has been approved.",
    "approval_rejected": "Request has been rejected.",
    "settings_saved": "Settings saved successfully!",
    "template_created": "Template created successfully!",
}


def get_success_message(key: str) -> str:
    """Get success message by key"""
    return SUCCESS_MESSAGES.get(key, "Action completed successfully!")


# =============================================================================
# STATUS DESCRIPTIONS
# =============================================================================

STATUS_DESCRIPTIONS = {
    "pending": {
        "label": "Waiting",
        "description": "Waiting to start",
        "color": "gray"
    },
    "running": {
        "label": "Running",
        "description": "Currently in progress",
        "color": "blue"
    },
    "waiting": {
        "label": "Waiting for Input",
        "description": "Waiting for approval or external input",
        "color": "yellow"
    },
    "paused": {
        "label": "Paused",
        "description": "Paused by user",
        "color": "orange"
    },
    "completed": {
        "label": "Completed",
        "description": "Finished successfully",
        "color": "green"
    },
    "failed": {
        "label": "Error",
        "description": "An error occurred",
        "color": "red"
    },
    "cancelled": {
        "label": "Cancelled",
        "description": "Cancelled by user",
        "color": "gray"
    },
    "timed_out": {
        "label": "Timed Out",
        "description": "Took too long to complete",
        "color": "red"
    },
}


def get_status_info(status: str) -> Dict[str, str]:
    """Get user-friendly status information"""
    return STATUS_DESCRIPTIONS.get(status, {
        "label": status.replace('_', ' ').title(),
        "description": "",
        "color": "gray"
    })


# =============================================================================
# HELP TEXT
# =============================================================================

HELP_TEXT = {
    # Step types
    "ai_task": "Use AI to analyze, generate, or transform content based on your instructions.",
    "http_request": "Connect to external services or APIs to send or receive data.",
    "database_query": "Read or write data from your connected databases.",
    "approval": "Pause the workflow and wait for someone to approve before continuing.",
    "notification": "Send an email, message, or alert to specified recipients.",
    "condition": "Make a decision based on conditions and take different paths.",
    "loop": "Repeat a set of steps for each item in a list.",
    "delay": "Pause the workflow for a specified amount of time.",
    "human_task": "Assign a task to a person and wait for them to complete it.",
    
    # Configuration fields
    "prompt": "Write instructions for the AI. Use {{variable}} to include data from previous steps.",
    "url": "Enter the web address to connect to. Use {{variable}} to include dynamic values.",
    "condition_expression": "Define when to take the 'Yes' path. Example: amount > 1000",
    "recipients": "Select who should receive this notification.",
    "timeout": "How long to wait before taking automatic action.",
}


def get_help_text(key: str) -> str:
    """Get help text for a field or step type"""
    return HELP_TEXT.get(key, "")


# =============================================================================
# VALIDATION MESSAGES
# =============================================================================

VALIDATION_MESSAGES = {
    "required": "This field is required.",
    "invalid_email": "Please enter a valid email address.",
    "invalid_url": "Please enter a valid web address.",
    "too_short": "Please enter at least {min} characters.",
    "too_long": "Please enter no more than {max} characters.",
    "invalid_number": "Please enter a valid number.",
    "out_of_range": "Please enter a value between {min} and {max}.",
    "unique_name": "This name is already used. Please choose a different name.",
    "no_start_step": "Your workflow needs a Start step.",
    "no_end_step": "Your workflow needs at least one Finish step.",
    "disconnected_steps": "{count} step(s) are not connected to the workflow.",
    "invalid_expression": "The expression is not valid. Please check the syntax.",
}


def get_validation_message(key: str, **kwargs) -> str:
    """Get validation message with optional formatting"""
    message = VALIDATION_MESSAGES.get(key, "Please check this field.")
    
    try:
        return message.format(**kwargs)
    except KeyError:
        return message


# =============================================================================
# LOG MESSAGE SANITIZER
# =============================================================================

def sanitize_for_user(message: str) -> str:
    """
    Sanitize a potentially technical message for user display
    
    Removes or replaces:
    - Exception traces
    - Internal IDs
    - Technical jargon
    """
    import re
    
    # Remove stack traces
    if "Traceback" in message or "Error:" in message:
        return "An error occurred. Please try again."
    
    # Remove UUIDs
    message = re.sub(
        r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
        '',
        message,
        flags=re.IGNORECASE
    )
    
    # Replace technical terms
    for tech_term, business_term in TERMINOLOGY.items():
        message = re.sub(
            rf'\b{tech_term}\b', 
            business_term, 
            message, 
            flags=re.IGNORECASE
        )
    
    # Clean up extra spaces
    message = ' '.join(message.split())
    
    return message if message else "An error occurred. Please try again."
