"""
Human Node Executors
Approval gates, human tasks, and notifications

These nodes involve human interaction:
- APPROVAL: Wait for approval before continuing
- HUMAN_TASK: Assign task to human
- NOTIFICATION: Send notification without waiting
"""

import json
import logging
import re
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ErrorCategory
from .base import BaseNodeExecutor, register_executor

logger = logging.getLogger(__name__)

_UUID_RE = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$', re.IGNORECASE)


def _looks_like_uuid(value: str) -> bool:
    """Return True if the string looks like a UUID (template ID) rather than message body text."""
    return bool(_UUID_RE.match((value or "").strip()))


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
        assignee_source = self.get_config_value(node, 'assignee_source') or 'platform_user'
        assignee_type = self.get_config_value(node, 'assignee_type', 'user')
        assignee_ids_raw = self.get_config_value(node, 'assignee_ids', [])
        if not assignee_ids_raw:
            assignee_ids_raw = self.get_config_value(node, 'approvers', [])

        # Initialize logs early so all resolution branches can append to it
        logs = [f"Creating approval request: {title}"]

        # Resolve assignees: from User Directory, tool, or platform (user/role/group)
        if assignee_source == 'user_directory' and self.deps and self.deps.user_directory:
            # Use User Directory Service for dynamic assignee resolution
            # This enables: dynamic_manager, department_manager, management_chain, role, group
            logs.append(f"Resolving assignees via User Directory")
            try:
                directory_config = {
                    "type": self.get_config_value(node, 'directory_assignee_type', 'dynamic_manager'),
                    "user_ids": assignee_ids_raw if isinstance(assignee_ids_raw, list) else [],
                    "role_ids": self.get_config_value(node, 'assignee_role_ids', []),
                    "group_ids": self.get_config_value(node, 'assignee_group_ids', []),
                    # Backward-compatible department routing keys:
                    # - visual builder historically used assignee_department_id
                    # - some generators may output department_id / departmentId
                    # - we also support department_name so the LLM can route without knowing IDs
                    "department_id": (
                        self.get_config_value(node, 'assignee_department_id')
                        or self.get_config_value(node, 'department_id')
                        or self.get_config_value(node, 'departmentId')
                    ),
                    "department_name": (
                        self.get_config_value(node, 'assignee_department_name')
                        or self.get_config_value(node, 'department_name')
                        or self.get_config_value(node, 'departmentName')
                    ),
                    "level": self.get_config_value(node, 'management_level', 1),
                    "expression": self.get_config_value(node, 'assignee_expression', ''),
                }
                process_context = {
                    "user_id": context.user_id,
                    "trigger_input": state.trigger_input or {},
                    "variables": state.get_all(),
                }
                assignee_ids = self.deps.user_directory.resolve_process_assignee(
                    directory_config, process_context, context.org_id
                )
                if assignee_ids:
                    assignee_type = 'user'
                    logs.append(f"Resolved {len(assignee_ids)} assignees from User Directory")
                else:
                    dir_type = directory_config.get("type", "dynamic_manager")
                    _trigger_input = getattr(context, 'trigger_input', None) or {}
                    _id_warnings = _trigger_input.get("_identity_warnings", [])
                    detail_msg = (
                        f"The User Directory resolved 0 assignees for type '{dir_type}'. "
                    )
                    if dir_type == "dynamic_manager":
                        detail_msg += (
                            "This means the user who submitted the process does not have a manager assigned "
                            "in the Identity Directory. Go to Settings > Identity Directory and assign a manager."
                        )
                    elif "department" in dir_type:
                        detail_msg += (
                            "This means no users were found in the target department, "
                            "or the user's department is not set."
                        )
                    if _id_warnings:
                        detail_msg += " Identity warnings: " + "; ".join(_id_warnings)
                    logs.append(f"⚠️ {detail_msg}")
                    logs.append("Falling back to 'any' assignee type")
                    assignee_type = 'any'
            except Exception as e:
                logs.append(f"⚠️ User Directory resolution failed: {e}, falling back to static assignees")
                assignee_ids = _to_assignee_id_list(assignee_ids_raw)
        elif assignee_source == 'tool':
            tool_id = self.get_config_value(node, 'assignee_tool_id') or ''
            if not tool_id:
                logs_early = [f"Creating approval request: {title}"]
                return NodeResult.failure(
                    error=ExecutionError.validation_error("Approvers from Tool requires a selected tool (assignee_tool_id)"),
                    logs=logs_early
                )
            if context.denied_tool_ids and tool_id in context.denied_tool_ids:
                return NodeResult.failure(
                    error=ExecutionError(
                        category=ErrorCategory.AUTHORIZATION,
                        code="TOOL_ACCESS_DENIED",
                        message="Access denied to the approver tool",
                        is_retryable=False
                    ),
                    logs=[f"Creating approval request: {title}"]
                )
            if not context.is_tool_allowed(tool_id):
                return NodeResult.failure(
                    error=ExecutionError(
                        category=ErrorCategory.AUTHORIZATION,
                        code="TOOL_NOT_AVAILABLE",
                        message="Approver tool is not available in this execution context",
                        is_retryable=False
                    ),
                    logs=[f"Creating approval request: {title}"]
                )
            tool = self.deps.get_tool(tool_id) if self.deps else None
            if not tool:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Approver tool not found: {tool_id}"),
                    logs=[f"Creating approval request: {title}"]
                )
            tool_input = self.get_config_value(node, 'assignee_tool_input') or {}
            if not isinstance(tool_input, dict):
                tool_input = {}
            # Default input: user_id and trigger_input so tool can resolve manager/approvers
            interpolated_input = state.interpolate_object({
                "user_id": context.user_id,
                **state.trigger_input,
                **tool_input
            })
            try:
                result = await tool.execute(**interpolated_input)
                if getattr(result, 'success', True) is False:
                    return NodeResult.failure(
                        error=ExecutionError.validation_error(getattr(result, 'error', 'Approver tool failed') or 'Approver tool failed'),
                        logs=[f"Creating approval request: {title}"]
                    )
                data = getattr(result, 'data', result)
                if isinstance(data, dict):
                    ids = data.get('approver_ids')
                    if not ids and data.get('manager_id'):
                        ids = [data['manager_id']]
                    if not ids and data.get('assignee_id'):
                        ids = [data['assignee_id']]
                    ids = ids or []
                elif isinstance(data, list):
                    ids = [str(x) for x in data]
                elif isinstance(data, (str, int)):
                    ids = [str(data)] if data else []
                else:
                    ids = []
                assignee_ids = [str(x) for x in ids if x]
                assignee_type = 'user'
            except Exception as e:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Approver tool failed: {e}"),
                    logs=[f"Creating approval request: {title}", str(e)]
                )
        elif assignee_source in ('platform_group', 'platform_role') and self.deps and self.deps.user_directory:
            # Expand group/role IDs to concrete user IDs via User Directory
            directory_config = {
                "type": "role" if assignee_source == "platform_role" else "group",
                "role_ids": assignee_ids_raw if assignee_source == "platform_role" and isinstance(assignee_ids_raw, list) else [],
                "group_ids": assignee_ids_raw if assignee_source == "platform_group" and isinstance(assignee_ids_raw, list) else [],
            }
            process_context = {
                "user_id": context.user_id,
                "trigger_input": state.trigger_input or {},
                "variables": state.get_all(),
            }
            try:
                assignee_ids = [
                    str(x) for x in (
                        self.deps.user_directory.resolve_process_assignee(
                            directory_config, process_context, context.org_id
                        ) or []
                    ) if x
                ]
                if assignee_ids:
                    assignee_type = 'user'
                    logs.append(f"Resolved {len(assignee_ids)} assignees from {assignee_source}")
                else:
                    logs.append(f"⚠️ {assignee_source} resolved 0 assignees — group/role may be empty")
                    assignee_type = 'any'
            except Exception as e:
                logs.append(f"⚠️ {assignee_source} resolution failed: {e}")
                assignee_ids = _to_assignee_id_list(assignee_ids_raw)
        else:
            # Platform user or dynamic expression (e.g. {{ trigger_input.manager_id }})
            assignee_ids_resolved = state.interpolate_object(assignee_ids_raw) if assignee_ids_raw else []
            assignee_ids = _to_assignee_id_list(assignee_ids_resolved)

        # FALLBACK: If no assignees resolved from ANY source, try dynamic_manager
        # from the User Directory. This covers AI-generated processes that set the
        # approval node name (e.g. "Manager Approval") but don't configure
        # assignee_source='user_directory' explicitly.
        if not assignee_ids and self.deps and self.deps.user_directory:
            import logging as _logging
            _fb_logger = _logging.getLogger(__name__)
            _fb_logger.info(
                "[ApprovalFallback] No assignees after all sources — attempting dynamic_manager fallback. "
                "user_id=%s org_id=%s assignee_source=%s",
                context.user_id, context.org_id, assignee_source,
            )
            try:
                fallback_config = {
                    "type": "dynamic_manager",
                }
                fallback_ctx = {
                    "user_id": context.user_id,
                    "trigger_input": state.trigger_input or {},
                    "variables": state.get_all(),
                }
                fallback_ids = self.deps.user_directory.resolve_process_assignee(
                    fallback_config, fallback_ctx, context.org_id
                )
                _fb_logger.info(
                    "[ApprovalFallback] resolve_process_assignee returned: %s",
                    fallback_ids,
                )
                if fallback_ids:
                    assignee_ids = fallback_ids
                    assignee_type = 'user'
                    logs.append(f"No assignees configured — resolved {len(assignee_ids)} via requester's direct manager (fallback)")
                    _fb_logger.info(
                        "[ApprovalFallback] SUCCESS — assignee_ids=%s assignee_type=%s",
                        assignee_ids, assignee_type,
                    )
                else:
                    logs.append("No assignees configured and dynamic_manager fallback returned empty")
                    _fb_logger.warning("[ApprovalFallback] dynamic_manager returned empty list")
            except Exception as e:
                logs.append(f"⚠️ Dynamic manager fallback failed: {e}")
                _fb_logger.exception("[ApprovalFallback] EXCEPTION: %s", e)

        min_approvals = self.get_config_value(node, 'min_approvals', 1)
        timeout_hours = self.get_config_value(node, 'timeout_hours', 24)
        timeout_action = self.get_config_value(node, 'timeout_action', 'fail')
        escalation_enabled = self.get_config_value(node, 'escalation_enabled', False)
        escalation_after_hours = self.get_config_value(node, 'escalation_after_hours')
        if escalation_after_hours is None:
            try:
                val = self.get_config_value(node, 'escalation_after_value')
                unit = self.get_config_value(node, 'escalation_after_unit') or 'hours'
                if val is not None:
                    v = max(0, int(val))
                    u = str(unit).lower().strip()
                    if u in ('minutes', 'minute'):
                        escalation_after_hours = max(1, int((v + 59) / 60)) if v else None
                    elif u in ('days', 'day'):
                        escalation_after_hours = v * 24
                    elif u in ('weeks', 'week'):
                        escalation_after_hours = v * 24 * 7
                    else:
                        escalation_after_hours = v
            except Exception:
                escalation_after_hours = None

        escalation_assignee_ids_raw = self.get_config_value(node, 'escalation_assignee_ids', [])
        escalation_assignee_source = self.get_config_value(node, 'escalation_assignee_source') or ''
        escalation_assignee_ids: List[str] = []
        if escalation_enabled:
            # Escalation recipients are always stored as concrete user IDs in the DB model.
            # We resolve role/group/department/dynamic patterns here into user IDs.
            try:
                if escalation_assignee_source == 'user_directory' and self.deps and self.deps.user_directory:
                    directory_config = {
                        "type": self.get_config_value(node, 'escalation_directory_assignee_type', 'dynamic_manager'),
                        "user_ids": escalation_assignee_ids_raw if isinstance(escalation_assignee_ids_raw, list) else [],
                        "role_ids": self.get_config_value(node, 'escalation_assignee_role_ids', []),
                        "group_ids": self.get_config_value(node, 'escalation_assignee_group_ids', []),
                        "department_id": (
                            self.get_config_value(node, 'escalation_department_id')
                            or self.get_config_value(node, 'escalation_departmentId')
                        ),
                        "department_name": (
                            self.get_config_value(node, 'escalation_department_name')
                            or self.get_config_value(node, 'escalation_departmentName')
                        ),
                        "level": self.get_config_value(node, 'escalation_management_level', 1),
                        "expression": self.get_config_value(node, 'escalation_assignee_expression', ''),
                    }
                    process_context = {
                        "user_id": context.user_id,
                        "trigger_input": state.trigger_input or {},
                        "variables": state.get_all(),
                    }
                    escalation_assignee_ids = [
                        str(x) for x in (self.deps.user_directory.resolve_process_assignee(directory_config, process_context, context.org_id) or [])
                        if x
                    ]
                elif escalation_assignee_source in ('platform_role', 'platform_group') and self.deps and self.deps.user_directory:
                    # Expand role/group to concrete users for escalation (DB stores only user IDs).
                    directory_config = {
                        "type": "role" if escalation_assignee_source == "platform_role" else "group",
                        "role_ids": escalation_assignee_ids_raw if escalation_assignee_source == "platform_role" else [],
                        "group_ids": escalation_assignee_ids_raw if escalation_assignee_source == "platform_group" else [],
                    }
                    process_context = {
                        "user_id": context.user_id,
                        "trigger_input": state.trigger_input or {},
                        "variables": state.get_all(),
                    }
                    escalation_assignee_ids = [
                        str(x) for x in (self.deps.user_directory.resolve_process_assignee(directory_config, process_context, context.org_id) or [])
                        if x
                    ]
                else:
                    # Platform users or raw IDs/expressions
                    resolved = state.interpolate_object(escalation_assignee_ids_raw) if escalation_assignee_ids_raw else []
                    escalation_assignee_ids = _to_assignee_id_list(resolved)
            except Exception as e:
                logs.append(f"⚠️ Escalation recipient resolution failed: {e}")
                resolved = state.interpolate_object(escalation_assignee_ids_raw) if escalation_assignee_ids_raw else []
                escalation_assignee_ids = _to_assignee_id_list(resolved)
        review_data_expr = self.get_config_value(node, 'review_data_expression')
        form_fields = self.get_config_value(node, 'form_fields', [])
        priority = self.get_config_value(node, 'priority', 'normal')
        
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
        
        # ── Embedded notification: optionally email the approver(s) ──
        notify_approver = (
            self.get_config_value(node, 'notifyApprover', False)
            or self.get_config_value(node, 'notify_approver', False)
        )
        logger.info(
            "[ApprovalNode] notifyApprover=%s, assignee_type=%s, assignee_ids=%s, "
            "has_notification_svc=%s",
            notify_approver, assignee_type, assignee_ids,
            bool(self.deps and getattr(self.deps, 'notification_service', None)),
        )
        if notify_approver and self.deps and getattr(self.deps, 'notification_service', None):
            notif_msg = (
                self.get_config_value(node, 'notificationMessage', '')
                or self.get_config_value(node, 'notification_message', '')
                or description
                or f"You have a pending approval task: {title}"
            )
            notif_channel = (
                self.get_config_value(node, 'notificationChannel', 'email')
                or self.get_config_value(node, 'notification_channel', 'email')
                or 'email'
            )
            notif_msg = state.interpolate_string(notif_msg)
            notif_title = state.interpolate_string(f"Action Required: {title}")

            approver_emails = self._resolve_assignee_emails(
                assignee_ids, assignee_type, state, context, logs
            )
            logger.info(
                "[ApprovalNode] Resolved approver emails: %s", approver_emails
            )
            if approver_emails:
                try:
                    send_result = await self.deps.notification_service.send(
                        channel=notif_channel,
                        recipients=approver_emails,
                        title=notif_title,
                        message=notif_msg,
                        priority=priority,
                    )
                    logger.info(
                        "[ApprovalNode] Notification send result: %s", send_result
                    )
                    logs.append(
                        f"📧 Sent {notif_channel} notification to "
                        f"{len(approver_emails)} approver(s)"
                    )
                except Exception as e:
                    logger.error(
                        "[ApprovalNode] Notification send exception: %s", e, exc_info=True
                    )
                    logs.append(
                        f"⚠️ Approver notification failed (non-blocking): {e}"
                    )
            else:
                logs.append(
                    "⚠️ Embedded notification enabled but no approver "
                    "emails could be resolved"
                )
        
        # Return waiting result - the engine will create the DB record
        return NodeResult.waiting(
            waiting_for='approval',
            waiting_metadata=approval_request
        )
    
    def _resolve_assignee_emails(
        self,
        assignee_ids: List[str],
        assignee_type: str,
        state: ProcessState,
        context: ProcessContext,
        logs: list,
    ) -> List[str]:
        """Resolve assignee IDs / shortcuts to email addresses for notification."""
        emails: List[str] = []
        _trigger_input = getattr(context, 'trigger_input', None) or {}
        user_ctx = _trigger_input.get("_user_context", {})

        logger.info(
            "[_resolve_assignee_emails] assignee_ids=%s assignee_type=%s org=%s",
            assignee_ids, assignee_type, context.org_id,
        )

        for aid in assignee_ids:
            aid_str = str(aid).strip() if aid else ""
            if not aid_str:
                continue
            aid_lower = aid_str.lower()

            if aid_lower in ("manager", "supervisor", "direct_manager"):
                email = user_ctx.get("manager_email") or ""
                if not email and self.deps and getattr(self.deps, 'user_directory', None):
                    try:
                        req_id = user_ctx.get("user_id") or context.user_id
                        if req_id:
                            req_attrs = self.deps.user_directory.get_user(req_id, context.org_id)
                            if req_attrs and req_attrs.manager_id:
                                mgr = self.deps.user_directory.get_user(req_attrs.manager_id, context.org_id)
                                if mgr and mgr.email:
                                    email = mgr.email
                    except Exception as e:
                        logger.warning("[_resolve_assignee_emails] manager lookup failed: %s", e)
                if email:
                    emails.append(email)
                continue

            if aid_lower in ("requester", "submitter", "initiator", "self"):
                email = user_ctx.get("email") or getattr(context, 'user_email', None) or ""
                if email:
                    emails.append(email)
                continue

            if "@" in aid_str:
                emails.append(aid_str)
                continue

            if self.deps and getattr(self.deps, 'user_directory', None) and len(aid_str) >= 20 and "-" in aid_str:
                try:
                    user_attrs = self.deps.user_directory.get_user(aid_str, context.org_id)
                    if user_attrs and user_attrs.email:
                        emails.append(user_attrs.email)
                        logger.info("[_resolve_assignee_emails] Resolved %s → %s", aid_str[:12], user_attrs.email)
                        continue
                    else:
                        logger.warning(
                            "[_resolve_assignee_emails] get_user(%s) returned attrs=%s email=%s",
                            aid_str[:12], bool(user_attrs), getattr(user_attrs, 'email', None) if user_attrs else None,
                        )
                except Exception as e:
                    logger.warning("[_resolve_assignee_emails] get_user(%s) raised: %s", aid_str[:12], e)

            logs.append(f"⚠️ Could not resolve approver '{aid_str[:12]}…' to email")

        # Fallback: if no emails resolved and assignees were expected, try dynamic_manager
        if not emails and assignee_type in ('any', 'user') and self.deps and getattr(self.deps, 'user_directory', None):
            logger.info("[_resolve_assignee_emails] No emails resolved, trying dynamic_manager fallback")
            try:
                req_id = user_ctx.get("user_id") or context.user_id
                if req_id:
                    mgr = self.deps.user_directory.get_manager(str(req_id), context.org_id)
                    if mgr and mgr.email:
                        emails.append(mgr.email)
                        logger.info("[_resolve_assignee_emails] Fallback resolved manager → %s", mgr.email)
                        logs.append(f"ℹ️ Resolved approver via manager fallback → {mgr.email}")
            except Exception as e:
                logger.warning("[_resolve_assignee_emails] manager fallback failed: %s", e)

        logger.info("[_resolve_assignee_emails] Final emails: %s", emails)
        return [e for e in emails if e and e.strip()]

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
        # The visual builder uses "template" for the message body text,
        # while the engine uses "message". If message is empty but template
        # contains body text (not a template ID/UUID), use template as message.
        if not message and template_id and not _looks_like_uuid(template_id):
            message = template_id
            template_id = None
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
        
        # SMART RECIPIENT RESOLUTION:
        # 1. Resolve shortcuts ("requester", "manager", "department_head", etc.) to actual emails
        # 2. Resolve user IDs (UUIDs) to email addresses via User Directory
        # 3. Pass through anything that looks like an email as-is
        resolved_recipients = []
        _trigger_input = getattr(context, 'trigger_input', None) or {}
        user_context = _trigger_input.get("_user_context", {})
        identity_warnings = _trigger_input.get("_identity_warnings", [])
        
        # === DIAGNOSTIC: print what we see so it shows in server console ===
        print(f"📧 [Notification:{node.name}] recipients={recipients}")
        print(f"📧 [Notification:{node.name}] _user_context.email={user_context.get('email', '(MISSING)')}")
        print(f"📧 [Notification:{node.name}] _user_context keys={list(user_context.keys())}")
        print(f"📧 [Notification:{node.name}] context.user_email={getattr(context, 'user_email', '(NOT SET)')}")
        print(f"📧 [Notification:{node.name}] _identity_warnings={identity_warnings}")
        
        # Log identity state for diagnostics
        if not user_context:
            logs.append("⚠️ _user_context is empty — identity directory may not be configured or user not found")
        elif identity_warnings:
            for iw in identity_warnings:
                logs.append(f"⚠️ Identity: {iw}")
        
        for r in interpolated_recipients:
            r_str = str(r).strip() if r else ""
            if not r_str:
                continue
            r_lower = r_str.lower()
            
            # Shortcut: "requester" → the user who started the process
            if r_lower in ("requester", "submitter", "initiator", "self"):
                email = user_context.get("email") or ""
                # Fallback chain: _user_context.email → context.user_email (from auth token)
                if not email:
                    email = getattr(context, 'user_email', None) or ""
                    if email:
                        logs.append(f"ℹ️ Used auth token email as fallback for '{r_str}'")
                if email:
                    resolved_recipients.append(email)
                    logs.append(f"Resolved '{r_str}' → {email}")
                else:
                    logs.append(
                        f"⚠️ Could not resolve '{r_str}' — no email in user context AND no email in auth token. "
                        f"_user_context keys: {list(user_context.keys())}. "
                        f"context.user_email: {getattr(context, 'user_email', '(not set)')}. "
                        "Check: Is the user's email set in their profile? Is the Identity Directory configured?"
                    )
                continue
            
            # Shortcut: "manager" → the requester's manager
            if r_lower in ("manager", "supervisor", "direct_manager"):
                email = user_context.get("manager_email") or ""
                # Fallback: resolve manager via user_directory if _user_context is empty
                if not email and self.deps and self.deps.user_directory:
                    try:
                        requester_id = user_context.get("user_id") or context.user_id
                        if requester_id:
                            requester_attrs = self.deps.user_directory.get_user(requester_id, context.org_id)
                            if requester_attrs and requester_attrs.manager_id:
                                mgr_attrs = self.deps.user_directory.get_user(requester_attrs.manager_id, context.org_id)
                                if mgr_attrs and mgr_attrs.email:
                                    email = mgr_attrs.email
                                    logs.append(f"Resolved '{r_str}' via user directory fallback → {email}")
                    except Exception as e:
                        logs.append(f"⚠️ User directory fallback for '{r_str}' failed: {e}")
                if email:
                    resolved_recipients.append(email)
                    if f"Resolved '{r_str}'" not in (logs[-1] if logs else ""):
                        logs.append(f"Resolved '{r_str}' → {email}")
                else:
                    logs.append(
                        f"⚠️ Could not resolve '{r_str}' — no manager email found. "
                        "Check: Does this user have a manager assigned in the Identity Directory? "
                        "Go to Settings > Identity Directory > Users and verify the manager field."
                    )
                continue

            # Shortcut: department head (requester's department)
            if r_lower in ("department_head", "dept_head", "departmenthead", "department_manager", "dept_manager"):
                email = user_context.get("department_head_email") or user_context.get("departmentHeadEmail") or ""
                if not email and self.deps and self.deps.user_directory:
                    try:
                        requester_id = user_context.get("user_id") or context.user_id
                        dept_id = user_context.get("department_id") or user_context.get("departmentId")
                        if not dept_id and requester_id:
                            req_attrs = self.deps.user_directory.get_user(str(requester_id), context.org_id)
                            dept_id = getattr(req_attrs, "department_id", None) if req_attrs else None
                        if dept_id:
                            dept = self.deps.user_directory.get_department_info(str(dept_id), context.org_id)
                            mgr_id = getattr(dept, "manager_id", None) if dept else None
                            if mgr_id:
                                mgr_attrs = self.deps.user_directory.get_user(str(mgr_id), context.org_id)
                                if mgr_attrs and mgr_attrs.email:
                                    email = mgr_attrs.email
                                    logs.append(f"Resolved '{r_str}' via department manager → {email}")
                    except Exception as e:
                        logs.append(f"⚠️ Failed to resolve '{r_str}' via department head: {e}")
                if email:
                    resolved_recipients.append(email)
                    continue
                logs.append(
                    f"⚠️ Could not resolve '{r_str}' — no department head email found. "
                    "Check: does the user have a department assigned, and does that department have a manager?"
                )
                continue

            # Shortcut: department members (requester's department) → expands to multiple recipients
            if r_lower in ("department_members", "dept_members", "departmentmembers"):
                if self.deps and self.deps.user_directory:
                    try:
                        requester_id = user_context.get("user_id") or context.user_id
                        dept_id = user_context.get("department_id") or user_context.get("departmentId")
                        if not dept_id and requester_id:
                            req_attrs = self.deps.user_directory.get_user(str(requester_id), context.org_id)
                            dept_id = getattr(req_attrs, "department_id", None) if req_attrs else None
                        if dept_id:
                            members = self.deps.user_directory.get_department_members(str(dept_id), context.org_id) or []
                            for m in members:
                                em = getattr(m, "email", None)
                                if em:
                                    resolved_recipients.append(em)
                            if members:
                                logs.append(f"Resolved '{r_str}' → {len(members)} department member(s)")
                            continue
                    except Exception as e:
                        logs.append(f"⚠️ Failed to resolve '{r_str}' via department members: {e}")
                logs.append(
                    f"⚠️ Could not resolve '{r_str}' — department members not available. "
                    "Check: does the user have a department assigned?"
                )
                continue

            # Explicit department routing patterns from the visual builder:
            # - dept_manager:<department_id>
            # - dept_members:<department_id>
            if r_lower.startswith("dept_manager:") or r_lower.startswith("dept_head:"):
                dept_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                if dept_id and self.deps and self.deps.user_directory:
                    try:
                        dept = self.deps.user_directory.get_department_info(str(dept_id), context.org_id)
                        mgr_id = getattr(dept, "manager_id", None) if dept else None
                        if mgr_id:
                            mgr_attrs = self.deps.user_directory.get_user(str(mgr_id), context.org_id)
                            if mgr_attrs and mgr_attrs.email:
                                resolved_recipients.append(mgr_attrs.email)
                                logs.append(f"Resolved '{r_str}' → {mgr_attrs.email}")
                                continue
                    except Exception as e:
                        logs.append(f"⚠️ Failed to resolve '{r_str}': {e}")
                logs.append(f"⚠️ Could not resolve '{r_str}' — department manager not found")
                continue

            if r_lower.startswith("dept_members:"):
                dept_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                if dept_id and self.deps and self.deps.user_directory:
                    try:
                        members = self.deps.user_directory.get_department_members(str(dept_id), context.org_id) or []
                        count = 0
                        for m in members:
                            em = getattr(m, "email", None)
                            if em:
                                resolved_recipients.append(em)
                                count += 1
                        logs.append(f"Resolved '{r_str}' → {count} department member(s)")
                        continue
                    except Exception as e:
                        logs.append(f"⚠️ Failed to resolve '{r_str}': {e}")
                logs.append(f"⚠️ Could not resolve '{r_str}' — department members not found")
                continue

            # Group/team shortcut: "group:<group_id>" → all members of a specific group
            if r_lower.startswith("group:") or r_lower.startswith("team:"):
                group_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                logger.info("[NotifNode] Resolving group recipient: group_id=%s org=%s", group_id, context.org_id)
                if group_id and self.deps and self.deps.user_directory:
                    try:
                        group_members = self.deps.user_directory.get_group_members(
                            str(group_id), context.org_id
                        ) or []
                        logger.info("[NotifNode] get_group_members returned %d members", len(group_members))
                        count = 0
                        for m in group_members:
                            em = getattr(m, "email", None)
                            if em:
                                resolved_recipients.append(em)
                                count += 1
                                logger.info("[NotifNode] Group member email: %s", em)
                            else:
                                logger.warning("[NotifNode] Group member %s has no email", getattr(m, 'user_id', '?'))
                        if count > 0:
                            logs.append(f"Resolved '{r_str}' → {count} group member(s)")
                            continue
                    except Exception as e:
                        logger.error("[NotifNode] get_group_members exception: %s", e, exc_info=True)
                        logs.append(f"⚠️ Failed to resolve group '{r_str}': {e}")
                else:
                    logger.warning(
                        "[NotifNode] Cannot resolve group: group_id=%s has_deps=%s has_ud=%s",
                        bool(group_id), bool(self.deps), bool(self.deps and self.deps.user_directory),
                    )
                logs.append(
                    f"⚠️ Could not resolve '{r_str}' — group members not found. "
                    "Check: does this group exist and have members assigned?"
                )
                continue

            # Role shortcut: "role:<role_id>" → all users with this role
            if r_lower.startswith("role:"):
                role_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                logger.info("[NotifNode] Resolving role recipient: role_id=%s org=%s", role_id, context.org_id)
                if role_id and self.deps and self.deps.user_directory:
                    try:
                        role_members = self.deps.user_directory.get_role_members(
                            str(role_id), context.org_id
                        ) or []
                        logger.info("[NotifNode] get_role_members returned %d members", len(role_members))
                        count = 0
                        for m in role_members:
                            em = getattr(m, "email", None)
                            if em:
                                resolved_recipients.append(em)
                                count += 1
                                logger.info("[NotifNode] Role member email: %s", em)
                        if count > 0:
                            logs.append(f"Resolved '{r_str}' → {count} role member(s)")
                            continue
                    except Exception as e:
                        logger.error("[NotifNode] get_role_members exception: %s", e, exc_info=True)
                        logs.append(f"⚠️ Failed to resolve role '{r_str}': {e}")
                logs.append(
                    f"⚠️ Could not resolve '{r_str}' — role members not found. "
                    "Check: does this role exist and have users assigned?"
                )
                continue

            # Management chain shortcuts from the UI ("skip_level_2", "skip_level_3", ...)
            if r_lower.startswith("skip_level_"):
                if self.deps and self.deps.user_directory:
                    try:
                        level_str = r_lower.replace("skip_level_", "").strip()
                        level = int(level_str)
                        requester_id = user_context.get("user_id") or context.user_id
                        if requester_id and level >= 1:
                            chain = self.deps.user_directory.get_management_chain(str(requester_id), context.org_id, max_depth=level) or []
                            if len(chain) >= level:
                                mgr = chain[level - 1]
                                em = getattr(mgr, "email", None)
                                if em:
                                    resolved_recipients.append(em)
                                    logs.append(f"Resolved '{r_str}' → {em}")
                                    continue
                    except Exception as e:
                        logs.append(f"⚠️ Failed to resolve '{r_str}' via management chain: {e}")
                logs.append(f"⚠️ Could not resolve '{r_str}' — management chain not available")
                continue
            
            # Looks like an email → pass through
            if "@" in r_str:
                resolved_recipients.append(r_str)
                continue
            
            # Looks like a UUID (user ID) → resolve via User Directory
            if self.deps and self.deps.user_directory and len(r_str) >= 20 and "-" in r_str:
                try:
                    user_attrs = self.deps.user_directory.get_user(r_str, context.org_id)
                    if user_attrs and user_attrs.email:
                        resolved_recipients.append(user_attrs.email)
                        logs.append(f"Resolved user ID {r_str[:8]}… → {user_attrs.email}")
                        continue
                except Exception as e:
                    logs.append(f"Warning: Failed to resolve user ID {r_str[:8]}…: {e}")
            
            # Fallback: use as-is (might be an email without @, a name, etc.)
            resolved_recipients.append(r_str)
        
        interpolated_recipients = [r for r in resolved_recipients if r and r.strip()]
        logger.info(
            "[NotifNode:%s] Final resolved recipients: %s (from raw: %s)",
            node.name, interpolated_recipients, recipients,
        )
        logs.append(f"Recipients: {interpolated_recipients}")
        logs.append(f"Title: {title}")
        
        # Guard: if recipients is empty after resolution, report clearly
        if not interpolated_recipients:
            logs.append("Warning: No valid recipients after resolution — notification not sent")
            # Build a specific business message based on what was attempted
            attempted_shortcuts = [str(r).strip().lower() for r in (recipients or []) if r]
            specific_hints = []
            if any(s in ("requester", "submitter", "initiator", "self") for s in attempted_shortcuts):
                if not user_context.get("email"):
                    specific_hints.append("The requester's email address is not available — check the user's profile in the Identity Directory.")
            if any(s in ("manager", "supervisor", "direct_manager") for s in attempted_shortcuts):
                if not user_context.get("manager_email"):
                    specific_hints.append("The requester's manager email is not available — go to Settings > Identity Directory and ensure a manager is assigned to this user.")
            if not user_context:
                specific_hints.append("The Identity Directory did not return any user data. Please check that the Identity Directory is configured in Settings.")
            if identity_warnings:
                specific_hints.extend(identity_warnings)
            
            hint_text = " ".join(specific_hints) if specific_hints else "Check the Identity Directory to ensure the user and their manager have valid email addresses."
            
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    code="NO_RECIPIENTS",
                    message=f"No valid recipients resolved for notification '{node.name}'. Original recipients config: {recipients}",
                    business_message=(
                        f"The notification \"{node.name}\" could not be sent because no valid recipient email was found. {hint_text}"
                    ),
                    is_user_fixable=True,
                    details={
                        'original_recipients': recipients,
                        'user_context_available': bool(user_context),
                        'user_email': user_context.get('email', '(not found)'),
                        'manager_email': user_context.get('manager_email', '(not found)'),
                        'identity_warnings': identity_warnings,
                        'action_hint': hint_text,
                    },
                ),
                logs=logs,
            )
        
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
            logger.info(
                "[NotifNode:%s] Sending via channel=%s to %d recipient(s): %s",
                node.name, channel, len(interpolated_recipients), interpolated_recipients,
            )
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
            logger.info("[NotifNode:%s] Send result: %s", node.name, result)
            
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
            
            # Notifications are non-critical — log error but still succeed
            # so the rest of the workflow continues.
            return NodeResult.success(
                output={
                    'sent': False,
                    'error': str(e),
                    'business_message': (
                        f"The notification \"{node.name}\" could not be delivered. "
                        "The email service may be temporarily unavailable."
                    ),
                    'is_user_fixable': False,
                    'action_hint': 'This appears to be a technical issue. Please share the Technical view details with your IT team.',
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
