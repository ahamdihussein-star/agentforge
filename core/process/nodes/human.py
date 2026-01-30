"""
Human Node Executors
Approval gates, human tasks, and notifications

These nodes involve human interaction:
- APPROVAL: Wait for approval before continuing
- HUMAN_TASK: Assign task to human
- NOTIFICATION: Send notification without waiting
"""

import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ErrorCategory
from .base import BaseNodeExecutor, register_executor


def _to_assignee_id_list(value: Any) -> List[str]:
    """Normalize approvers/assignees to a list of string IDs. Handles list of IDs, list of objects with id/value, or single ID."""
    if value is None:
        return []
    if isinstance(value, list):
        if not value:
            return []
        out = []
        for item in value:
            if isinstance(item, (str, int)):
                out.append(str(item))
            elif isinstance(item, dict):
                out.append(str(item.get('id') or item.get('value') or item.get('user_id') or ''))
            else:
                out.append(str(item))
        return [x for x in out if x]
    if isinstance(value, (str, int)) and str(value).strip():
        return [str(value)]
    return []


@register_executor(NodeType.APPROVAL)
class ApprovalNodeExecutor(BaseNodeExecutor):
    """
    Approval node executor
    
    Pauses process execution and waits for human approval.
    Creates an approval request that can be approved/rejected.
    
    Config:
        title: Approval request title
        description: Description for approver
        assignee_type: user, role, group, department
        assignee_ids: List of assignee IDs
        min_approvals: Minimum approvals required
        timeout_hours: Hours before timeout
        timeout_action: fail, approve, reject, escalate
        escalation_enabled: Whether to escalate on timeout
        escalation_after_hours: Hours before escalation
        escalation_assignee_ids: Who to escalate to
        review_data_expression: Expression to get data for review
        form_fields: Additional fields for approver to fill
    """
    
    display_name = "Approval"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute approval node - creates approval request and waits"""
        
        # Get configuration (Process Builder uses 'approvers'; engine uses 'assignee_ids')
        title = self.get_config_value(node, 'title', f'Approval Required: {node.name}')
        description = self.get_config_value(node, 'description', '')
        assignee_type = self.get_config_value(node, 'assignee_type', 'user')
        assignee_ids = self.get_config_value(node, 'assignee_ids', [])
        if not assignee_ids:
            assignee_ids = _to_assignee_id_list(self.get_config_value(node, 'approvers', []))
        else:
            assignee_ids = _to_assignee_id_list(assignee_ids)  # normalize list of objects to list of IDs
        min_approvals = self.get_config_value(node, 'min_approvals', 1)
        timeout_hours = self.get_config_value(node, 'timeout_hours', 24)
        timeout_action = self.get_config_value(node, 'timeout_action', 'fail')
        escalation_enabled = self.get_config_value(node, 'escalation_enabled', False)
        escalation_after_hours = self.get_config_value(node, 'escalation_after_hours')
        escalation_assignee_ids = self.get_config_value(node, 'escalation_assignee_ids', [])
        review_data_expr = self.get_config_value(node, 'review_data_expression')
        form_fields = self.get_config_value(node, 'form_fields', [])
        priority = self.get_config_value(node, 'priority', 'normal')
        
        logs = [f"Creating approval request: {title}"]
        
        # Interpolate text fields
        title = state.interpolate_string(title)
        description = state.interpolate_string(description)
        
        # Get review data
        review_data = {}
        if review_data_expr:
            try:
                review_data = state.evaluate(review_data_expr)
                if not isinstance(review_data, dict):
                    review_data = {'data': review_data}
            except Exception as e:
                logs.append(f"Warning: Failed to get review data: {e}")
                review_data = {}
        else:
            # Default: include relevant variables
            review_data = state.get_all()
        
        # Calculate deadline
        deadline = datetime.utcnow() + timedelta(hours=timeout_hours) if timeout_hours else None
        
        # Build approval request metadata
        approval_request = {
            'node_id': node.id,
            'node_name': node.name,
            'title': title,
            'description': description,
            'assignee_type': assignee_type,
            'assignee_ids': assignee_ids,
            'min_approvals': min_approvals,
            'review_data': review_data,
            'form_fields': form_fields,
            'priority': priority,
            'deadline': deadline.isoformat() if deadline else None,
            'timeout_action': timeout_action,
            'escalation': {
                'enabled': escalation_enabled,
                'after_hours': escalation_after_hours,
                'assignee_ids': escalation_assignee_ids
            } if escalation_enabled else None,
            'created_at': datetime.utcnow().isoformat(),
            'execution_id': context.execution_id,
            'org_id': context.org_id,
        }
        
        logs.append(f"Assignees ({assignee_type}): {assignee_ids}")
        logs.append(f"Deadline: {deadline}")
        
        # Return waiting result - the engine will create the DB record
        return NodeResult.waiting(
            waiting_for='approval',
            waiting_metadata=approval_request
        )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate approval node. Empty assignees are allowed (treated as 'any' - visible to all)."""
        base_error = super().validate(node)
        if base_error:
            return base_error
        return None


@register_executor(NodeType.HUMAN_TASK)
class HumanTaskNodeExecutor(BaseNodeExecutor):
    """
    Human Task node executor
    
    Creates a task for a human to complete.
    Similar to approval but allows for more complex input.
    
    Config:
        title: Task title
        description: Task description
        instructions: Detailed instructions
        assignee_type: user, role, group, department
        assignee_ids: Who to assign to
        form_schema: Schema for the form to fill
        required_fields: Fields that must be completed
        due_date_hours: Hours until due
        priority: low, normal, high, urgent
    """
    
    display_name = "Human Task"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute human task node"""
        
        title = self.get_config_value(node, 'title', node.name)
        description = self.get_config_value(node, 'description', '')
        instructions = self.get_config_value(node, 'instructions', '')
        assignee_type = self.get_config_value(node, 'assignee_type', 'user')
        assignee_ids = self.get_config_value(node, 'assignee_ids', [])
        if not assignee_ids:
            assignee_ids = _to_assignee_id_list(self.get_config_value(node, 'approvers', []))
        form_schema = self.get_config_value(node, 'form_schema', {})
        required_fields = self.get_config_value(node, 'required_fields', [])
        due_date_hours = self.get_config_value(node, 'due_date_hours')
        priority = self.get_config_value(node, 'priority', 'normal')
        context_data_expr = self.get_config_value(node, 'context_data_expression')
        
        logs = [f"Creating human task: {title}"]
        
        # Interpolate fields
        title = state.interpolate_string(title)
        description = state.interpolate_string(description)
        instructions = state.interpolate_string(instructions)
        
        # Get context data for the task
        context_data = {}
        if context_data_expr:
            try:
                context_data = state.evaluate(context_data_expr)
            except Exception as e:
                logs.append(f"Warning: Failed to get context data: {e}")
        
        # Calculate due date
        due_date = None
        if due_date_hours:
            due_date = datetime.utcnow() + timedelta(hours=due_date_hours)
        
        # Build task metadata
        task_data = {
            'type': 'human_task',
            'node_id': node.id,
            'node_name': node.name,
            'title': title,
            'description': description,
            'instructions': instructions,
            'assignee_type': assignee_type,
            'assignee_ids': assignee_ids,
            'form_schema': form_schema,
            'required_fields': required_fields,
            'context_data': context_data,
            'priority': priority,
            'due_date': due_date.isoformat() if due_date else None,
            'created_at': datetime.utcnow().isoformat(),
            'execution_id': context.execution_id,
            'org_id': context.org_id,
        }
        
        logs.append(f"Assigned to ({assignee_type}): {assignee_ids}")
        
        return NodeResult.waiting(
            waiting_for='human_task',
            waiting_metadata=task_data
        )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate human task node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        assignee_ids = self.get_config_value(node, 'assignee_ids', [])
        if not assignee_ids:
            assignee_ids = _to_assignee_id_list(self.get_config_value(node, 'approvers', []))
        if not assignee_ids:
            return ExecutionError.validation_error(
                "At least one assignee is required for human task"
            )
        
        return None


@register_executor(NodeType.NOTIFICATION)
class NotificationNodeExecutor(BaseNodeExecutor):
    """
    Notification node executor
    
    Sends notifications without waiting for response.
    Supports multiple channels (email, Slack, webhook, etc.)
    
    Config:
        channel: email, slack, webhook, sms, in_app
        recipients: List of recipients
        title: Notification title
        message: Notification message
        template: Template ID (optional)
        template_data: Data for template
        priority: low, normal, high, urgent
        channel_config: Channel-specific configuration
    """
    
    display_name = "Notification"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute notification node"""
        
        channel = self.get_config_value(node, 'channel', 'email')
        recipients = self.get_config_value(node, 'recipients', [])
        if not recipients:
            single = self.get_config_value(node, 'recipient')
            if single:
                recipients = [single]
        title = self.get_config_value(node, 'title', '')
        message = self.get_config_value(node, 'message', '')
        template_id = self.get_config_value(node, 'template')
        template_data = self.get_config_value(node, 'template_data', {})
        priority = self.get_config_value(node, 'priority', 'normal')
        channel_config = self.get_config_value(node, 'channel_config', {})
        
        logs = [f"Sending {channel} notification"]
        
        # Interpolate fields
        title = state.interpolate_string(title)
        message = state.interpolate_string(message)
        template_data = state.interpolate_object(template_data)
        # SendGrid (and other providers) require a non-empty subject; default to node name or "Notification"
        if not (title and str(title).strip()):
            title = (node.name or 'Notification').strip() or 'Notification'
        
        # Interpolate recipients if they contain variables
        interpolated_recipients = []
        for recipient in recipients:
            if isinstance(recipient, str) and '{{' in recipient:
                interpolated_recipients.append(state.interpolate_string(recipient))
            else:
                interpolated_recipients.append(recipient)
        
        logs.append(f"Recipients: {interpolated_recipients}")
        logs.append(f"Title: {title}")
        
        # Check for notification service
        if not self.deps.notification_service:
            # Log warning but don't fail - notification is best-effort
            logs.append("Warning: No notification service configured - notification not sent")
            return NodeResult.success(
                output={
                    'sent': False,
                    'reason': 'No notification service configured'
                },
                logs=logs
            )
        
        # Send notification
        try:
            result = await self.deps.notification_service.send(
                channel=channel,
                recipients=interpolated_recipients,
                title=title,
                message=message,
                template_id=template_id,
                template_data=template_data,
                priority=priority,
                config=channel_config
            )
            
            logs.append(f"Notification sent successfully")
            
            return NodeResult.success(
                output={
                    'sent': True,
                    'channel': channel,
                    'recipients_count': len(interpolated_recipients),
                    'result': result
                },
                logs=logs
            )
            
        except Exception as e:
            logs.append(f"Failed to send notification: {e}")
            
            # Notifications are non-critical - don't fail the process
            return NodeResult.success(
                output={
                    'sent': False,
                    'error': str(e)
                },
                logs=logs
            )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate notification node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        channel = self.get_config_value(node, 'channel')
        if not channel:
            return ExecutionError.validation_error("Notification channel is required")
        
        recipients = self.get_config_value(node, 'recipients', [])
        if not recipients:
            single = self.get_config_value(node, 'recipient')
            if single:
                recipients = [single]
        message = self.get_config_value(node, 'message')
        template = self.get_config_value(node, 'template')
        # Treat empty string as missing
        has_message = message is not None and str(message).strip()
        has_template = template is not None and str(template).strip()
        
        if not recipients:
            return ExecutionError.validation_error("At least one recipient is required")
        
        if not has_message and not has_template:
            return ExecutionError.validation_error("Either message or template is required")
        
        return None
