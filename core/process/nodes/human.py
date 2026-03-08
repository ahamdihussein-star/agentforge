"""
Human Node Executors
Approval gates, human tasks, and notifications

These nodes involve human interaction:
- APPROVAL: Wait for approval before continuing
- HUMAN_TASK: Assign task to human
- NOTIFICATION: Send notification without waiting
"""

import asyncio
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
                    "trigger_input": context.trigger_input or {},
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
                            "This means the user who submitted the process does not have a manager assigned. "
                            "Go to Organization > People & Departments and assign a manager."
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
                **(context.trigger_input or {}),
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
                "trigger_input": context.trigger_input or {},
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
            logger.info(
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
                    "trigger_input": context.trigger_input or {},
                    "variables": state.get_all(),
                }
                fallback_ids = self.deps.user_directory.resolve_process_assignee(
                    fallback_config, fallback_ctx, context.org_id
                )
                logger.info("[ApprovalFallback] resolve_process_assignee returned: %s", fallback_ids)
                if fallback_ids:
                    assignee_ids = fallback_ids
                    assignee_type = 'user'
                    logs.append(f"No assignees configured — resolved {len(assignee_ids)} via requester's direct manager (fallback)")
                else:
                    logs.append("No assignees configured and dynamic_manager fallback returned empty")
                    logger.warning("[ApprovalFallback] dynamic_manager returned empty list")
            except Exception as e:
                logs.append(f"⚠️ Dynamic manager fallback failed: {e}")
                logger.exception("[ApprovalFallback] EXCEPTION: %s", e)

        # ── STRICT: If no approver resolved after all attempts → FAIL ──
        if not assignee_ids or assignee_type == 'any':
            dir_type = self.get_config_value(node, 'directory_assignee_type', 'dynamic_manager')
            dept_name = (
                self.get_config_value(node, 'assignee_department_name')
                or self.get_config_value(node, 'department_name')
                or ''
            )

            if dir_type == 'dynamic_manager' or not dir_type:
                reason = (
                    "The submitter does not have a manager assigned. "
                    "Please go to Organization > People & Departments, "
                    "select the submitter, and assign a manager."
                )
            elif 'department' in dir_type:
                dept_label = f' "{dept_name}"' if dept_name else ''
                reason = (
                    f"No manager was found for the{dept_label} department. "
                    "Please go to Organization > People & Departments, "
                    f"select the{dept_label} department, and assign a manager."
                )
            elif dir_type in ('role', 'group'):
                reason = (
                    f"No users are assigned to the specified {dir_type}. "
                    f"Please go to Settings and ensure the {dir_type} has members."
                )
            else:
                reason = (
                    "The approver could not be determined from the current configuration. "
                    "Please review the approval step settings in the Process Builder."
                )

            logger.warning(
                "[ApprovalNode] FAILING — no approver resolved. assignee_source=%s "
                "dir_type=%s assignee_ids=%s",
                assignee_source, dir_type, assignee_ids,
            )
            logs.append(f"❌ Approval step failed: {reason}")
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    code="NO_APPROVER",
                    message=f"No approver could be resolved for step '{title}'",
                    business_message=(
                        f"The approval step \"{title}\" could not proceed because no approver was found. {reason}"
                    ),
                    is_retryable=False,
                ),
                logs=logs,
            )

        # ── Resolve approver details (name + email) for visibility ──
        approver_details: List[Dict[str, str]] = []
        if self.deps and getattr(self.deps, 'user_directory', None):
            for aid in assignee_ids:
                try:
                    attrs = self.deps.user_directory.get_user(str(aid), context.org_id)
                    if attrs:
                        approver_details.append({
                            'id': str(aid),
                            'name': attrs.display_name or f"{attrs.first_name or ''} {attrs.last_name or ''}".strip() or '(unknown)',
                            'email': attrs.email or '(no email)',
                        })
                    else:
                        approver_details.append({'id': str(aid), 'name': '(not found)', 'email': '(not found)'})
                except Exception:
                    approver_details.append({'id': str(aid), 'name': '(error)', 'email': '(error)'})
        else:
            for aid in assignee_ids:
                approver_details.append({'id': str(aid), 'name': '(unknown)', 'email': '(unknown)'})

        for ad in approver_details:
            logs.append(f"✅ Approver: {ad['name']} ({ad['email']})")
        logger.info("[ApprovalNode] Resolved approver details: %s", approver_details)

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
                        "trigger_input": context.trigger_input or {},
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
                        "trigger_input": context.trigger_input or {},
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
            # Default: include relevant variables, but filter out
            # internal/system keys that confuse non-technical approvers.
            _raw = state.get_all()
            _SKIP_PREFIXES = ('_', '__')
            _SKIP_KEYS = {
                'user_context', 'current_user', 'org_id', 'org',
                'trigger_input', 'submitted_information',
                'execution_id', 'process_id', 'node_id',
            }
            review_data = {}
            for _k, _v in _raw.items():
                if any(_k.startswith(p) for p in _SKIP_PREFIXES):
                    continue
                if _k.lower().replace(' ', '_') in _SKIP_KEYS:
                    continue
                # Skip large arrays of objects (likely raw tool/API outputs),
                # but keep arrays of uploaded files.
                if isinstance(_v, list) and len(_v) > 5:
                    if any(
                        isinstance(item, dict)
                        and not (
                            isinstance(item.get('kind'), str)
                            and item['kind'].lower().replace('_', '') in ('uploadedfile',)
                            or ('name' in item and ('file_type' in item or 'content_type' in item or 'download_url' in item))
                        )
                        for item in _v
                    ):
                        continue
                review_data[_k] = _v
        
        # Calculate deadline
        deadline = datetime.utcnow() + timedelta(hours=timeout_hours) if timeout_hours else None

        # Build a generic, side-by-side comparison structure when we can detect
        # "document/source" data and "system/reference" data in review_data.
        # This keeps the platform dynamic: no domain-specific keys are required.
        try:
            def _is_file_ref_like(v: Any) -> bool:
                if not isinstance(v, dict):
                    return False
                if v.get("path") and (v.get("filename") or v.get("name")):
                    return True
                d = v.get("data")
                if isinstance(d, dict) and d.get("path") and (d.get("filename") or d.get("name")):
                    return True
                return False

            def _looks_like_uuid(v: Any) -> bool:
                try:
                    return bool(re.match(r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$", str(v or "").strip(), re.I))
                except Exception:
                    return False

            def _primitive_items(dct: dict) -> dict:
                out = {}
                for kk, vv in (dct or {}).items():
                    if vv is None or vv == "":
                        continue
                    k_norm = str(kk or "").lower().replace(" ", "").replace("_", "").replace("-", "")
                    # Skip technical/file metadata fields (generic)
                    if k_norm in (
                        "id", "uuid", "kind", "path", "downloadurl", "url", "size", "filetype",
                        "contenttype", "mimetype", "storedpath", "createdat", "updatedat"
                    ):
                        continue
                    if isinstance(vv, str) and _looks_like_uuid(vv):
                        continue
                    if isinstance(vv, (str, int, float, bool)):
                        out[str(kk)] = vv
                return out

            def _norm_key(s: str) -> str:
                return str(s or "").lower().replace(" ", "").replace("_", "").replace("-", "")

            def _score_key(name: str, positive: list[str]) -> int:
                n = _norm_key(name)
                sc = 0
                for w in positive:
                    if w in n:
                        sc += 3
                return sc

            doc_words = ["extract", "parsed", "document", "source", "input", "upload", "submitted", "form", "request"]
            sys_words = ["system", "lookup", "external", "reference", "master", "response", "result", "api", "erp", "database"]

            def _looks_like_id_key(k: str) -> bool:
                kn = str(k or "").lower().replace(" ", "").replace("_", "").replace("-", "")
                return any(s in kn for s in ("id", "uuid", "number", "code", "ref", "reference", "key"))

            def _is_empty_marker(x: Any) -> bool:
                t = str(x).strip().lower() if x is not None else ""
                return t in ("", "n/a", "na", "none", "null", "-")

            def _norm_id_val(x: Any) -> str:
                return re.sub(r"[^a-z0-9]+", "", str(x or "").lower())

            def _is_uploaded_file_dict(d: dict) -> bool:
                """Detect uploaded file metadata dicts (generic)."""
                try:
                    if not isinstance(d, dict):
                        return False
                    kind = str(d.get("kind") or "").lower().replace("_", "").replace("-", "")
                    if kind in ("uploadedfile", "uploadfile", "file"):
                        return True
                    # Heuristic: file metadata typically has path/name/content_type/download_url
                    keys = {str(k).lower().replace("_", "").replace("-", "") for k in d.keys()}
                    if ("downloadurl" in keys or "contenttype" in keys) and ("path" in keys or "name" in keys or "filename" in keys):
                        return True
                except Exception:
                    return False
                return False

            def _is_mostly_file_records(recs: list) -> bool:
                try:
                    if not recs:
                        return False
                    sample = recs[:5]
                    hits = sum(1 for x in sample if isinstance(x, dict) and _is_uploaded_file_dict(x))
                    return hits >= max(2, int(len(sample) * 0.6))
                except Exception:
                    return False

            def _extract_record_list(v: Any) -> Optional[dict]:
                """Extract list[dict] from common envelopes; returns {records, meta}."""
                if isinstance(v, list) and v and all(isinstance(i, dict) for i in v[:3]):
                    return {"records": v, "meta": {"envelope": False, "envelope_key": ""}}
                if isinstance(v, dict):
                    for kk in ("response", "data", "results", "items", "records", "entries", "transactions", "invoices", "documents", "requests"):
                        vv = v.get(kk)
                        if isinstance(vv, list) and vv and all(isinstance(i, dict) for i in vv[:3]):
                            # Tool/API style envelope detection (generic)
                            env = bool(v.get("status_code") is not None or v.get("tool_type") or v.get("mode") or v.get("status"))
                            return {"records": vv, "meta": {"envelope": env, "envelope_key": kk}}
                # Generic fallback: any list[dict] value
                for kk, vv in (v or {}).items():
                    if isinstance(vv, list) and vv and all(isinstance(i, dict) for i in vv[:3]):
                        return {"records": vv, "meta": {"envelope": False, "envelope_key": str(kk)}}
                return None

            # Prefer per-record comparisons when we can detect record lists on both sides.
            record_lists = []
            for rk, rv in (review_data or {}).items():
                if not rk or str(rk).startswith("_"):
                    continue
                if _is_file_ref_like(rv):
                    continue
                recs_info = _extract_record_list(rv)
                if recs_info and recs_info.get("records"):
                    recs = recs_info["records"]
                    if _is_mostly_file_records(recs):
                        continue
                    meta = recs_info.get("meta") or {}
                    # Prefer tool/API response envelopes as system candidates
                    sys_env_bonus = 8 if meta.get("envelope") and str(meta.get("envelope_key")) == "response" else 0
                    record_lists.append({
                        "key": str(rk),
                        "records": recs,
                        "doc_score": _score_key(str(rk), doc_words),
                        "sys_score": _score_key(str(rk), sys_words) + sys_env_bonus,
                        "meta": meta,
                    })

            best_doc_list = max(record_lists, key=lambda c: (c["doc_score"], -c["sys_score"], len(c["records"])), default=None)
            best_sys_list = None
            if best_doc_list:
                # Pick a DIFFERENT list for system, prefer sys_score then envelope then size.
                candidates_sys = [c for c in record_lists if c.get("key") != best_doc_list.get("key")]
                best_sys_list = max(
                    candidates_sys,
                    key=lambda c: (c["sys_score"], 1 if (c.get("meta") or {}).get("envelope") else 0, len(c["records"])),
                    default=None
                )

            if best_doc_list and best_sys_list and best_doc_list["records"] and best_sys_list["records"]:
                comparisons = []
                sys_records = best_sys_list["records"]

                # Pre-index system records by any id-like field values for fast matching
                sys_index = {}
                for sr in sys_records:
                    if not isinstance(sr, dict):
                        continue
                    for sk, sv in sr.items():
                        if not _looks_like_id_key(sk) or _is_empty_marker(sv):
                            continue
                        nv = _norm_id_val(sv)
                        if not nv:
                            continue
                        sys_index.setdefault(nv, []).append(sr)

                def _item_label(d: dict, fallback: str) -> str:
                    # Generic label selection: name/title first, then id/ref/number
                    for kk in d.keys():
                        nk = str(kk).lower().replace(" ", "").replace("_", "").replace("-", "")
                        vv = d.get(kk)
                        if re.search(r"(name|title|label|subject)", nk):
                            if vv is not None and vv != "" and not isinstance(vv, (dict, list)):
                                return str(vv)
                    for kk in d.keys():
                        nk = str(kk).lower().replace(" ", "").replace("_", "").replace("-", "")
                        vv = d.get(kk)
                        if re.search(r"(number|code|ref|id)$", nk):
                            if vv is not None and vv != "" and not isinstance(vv, (dict, list)):
                                return str(vv)
                    return fallback

                def _to_num(x: Any) -> Optional[float]:
                    try:
                        if isinstance(x, (int, float)):
                            return float(x)
                        if isinstance(x, str):
                            t = x.strip().replace(",", "")
                            t = re.sub(r"[^0-9.\-]", "", t)
                            if not t or t in ("-", "."):
                                return None
                            return float(t)
                    except Exception:
                        return None
                    return None

                def _eq(a: Any, b: Any) -> bool:
                    na = _to_num(a)
                    nb = _to_num(b)
                    if na is not None and nb is not None:
                        return abs(na - nb) <= 1e-9
                    sa = str(a).strip().lower() if a is not None else ""
                    sb = str(b).strip().lower() if b is not None else ""
                    empties = {"", "n/a", "na", "none", "null", "-"}
                    if sa in empties and sb in empties:
                        return True
                    return sa == sb

                for di, dr in enumerate(best_doc_list["records"][:12]):
                    if not isinstance(dr, dict):
                        continue
                    prim_doc = _primitive_items(dr)
                    # Gather doc id candidates
                    doc_ids = []
                    for dk, dv in prim_doc.items():
                        if not _looks_like_id_key(dk) or _is_empty_marker(dv):
                            continue
                        nv = _norm_id_val(dv)
                        if nv:
                            doc_ids.append({"field": dk, "value": str(dv), "norm": nv})

                    matched_sr = None
                    binding = []
                    for cand in doc_ids:
                        hits = sys_index.get(cand["norm"]) or []
                        if hits:
                            matched_sr = hits[0]
                            binding = [{"field": cand["field"], "value": cand["value"]}]
                            break

                    item = {
                        "itemLabel": _item_label(prim_doc, f"Item {di+1}"),
                        "leftLabel": "Document",
                        "rightLabel": "System",
                        "leftSourceKey": best_doc_list["key"],
                        "rightSourceKey": best_sys_list["key"],
                        "binding": binding,
                        "rows": [],
                        "unmatched": False,
                        "reason": "",
                    }

                    if not matched_sr:
                        item["unmatched"] = True
                        item["reason"] = "No matching system record for this item (no shared reference/ID value)."
                        comparisons.append(item)
                        continue

                    prim_sys = _primitive_items(matched_sr)
                    sys_norm_map = { _norm_key(k): k for k in prim_sys.keys() }
                    # Compare by normalized key intersection (handles snake/camel differences)
                    rows = []
                    for dk, dv in prim_doc.items():
                        nk = _norm_key(dk)
                        sk = sys_norm_map.get(nk)
                        if not sk:
                            continue
                        sv = prim_sys.get(sk)
                        rows.append({
                            "field": dk,
                            "left": dv,
                            "right": sv,
                            "match": _eq(dv, sv),
                        })
                    # Stable ordering and cap
                    rows = sorted(rows, key=lambda r: (len(str(r.get("field") or "")), str(r.get("field") or "").lower()))[:24]
                    item["rows"] = rows
                    comparisons.append(item)

                if comparisons:
                    review_data["_approval_comparisons"] = {
                        "leftLabel": "Document",
                        "rightLabel": "System",
                        "leftSourceKey": best_doc_list["key"],
                        "rightSourceKey": best_sys_list["key"],
                        "items": comparisons,
                    }
                    # Back-compat: set a single comparison for older renderers (prefer first matched)
                    first = next((c for c in comparisons if not c.get("unmatched") and c.get("rows")), comparisons[0])
                    review_data["_approval_comparison"] = {
                        "leftLabel": first.get("leftLabel"),
                        "rightLabel": first.get("rightLabel"),
                        "rows": first.get("rows") or [],
                        "binding": first.get("binding") or [],
                        "unmatched": bool(first.get("unmatched")),
                        "reason": first.get("reason") or "",
                    }

            candidates = []
            for rk, rv in (review_data or {}).items():
                if not rk or str(rk).startswith("_"):
                    continue
                if _is_file_ref_like(rv):
                    continue
                if isinstance(rv, dict):
                    prim = _primitive_items(rv)
                    if len(prim) >= 4:
                        candidates.append({
                            "key": str(rk),
                            "value": rv,
                            "prim": prim,
                            "doc_score": _score_key(str(rk), doc_words),
                            "sys_score": _score_key(str(rk), sys_words),
                        })

            doc_c = max(candidates, key=lambda c: (c["doc_score"], len(c["prim"])), default=None)
            sys_c = max(candidates, key=lambda c: (c["sys_score"], len(c["prim"])), default=None)

            # If heuristics are weak but we have 2+ candidates, pick two richest dicts.
            if doc_c and doc_c["doc_score"] == 0 and sys_c and sys_c["sys_score"] == 0:
                if len(candidates) >= 2:
                    ranked = sorted(candidates, key=lambda c: len(c["prim"]), reverse=True)
                    doc_c = ranked[0]
                    sys_c = ranked[1]

            if doc_c and sys_c and doc_c["key"] != sys_c["key"]:
                left = doc_c["prim"]
                right = sys_c["prim"]

                # ---- Match binding guardrail (generic) ----
                # Only compare "Document vs System" when we can prove they refer to the SAME record
                # using at least one shared reference/identifier field with the same non-empty value.
                def _is_empty_marker(x: Any) -> bool:
                    t = str(x).strip().lower() if x is not None else ""
                    return t in ("", "n/a", "na", "none", "null", "-")

                def _norm_id_val(x: Any) -> str:
                    # Normalize identifier values so "po-2026-0042" == "PO 2026 0042"
                    return re.sub(r"[^a-z0-9]+", "", str(x or "").lower())

                binding = []
                for kk in left.keys():
                    if kk not in right:
                        continue
                    if not _looks_like_id_key(kk):
                        continue
                    lv = left.get(kk)
                    rv = right.get(kk)
                    if _is_empty_marker(lv) or _is_empty_marker(rv):
                        continue
                    if _norm_id_val(lv) and _norm_id_val(lv) == _norm_id_val(rv):
                        binding.append({"field": kk, "value": str(lv)})

                if not binding:
                    # No proof of match -> do NOT compare; prevent hallucinated "system" values.
                    review_data["_approval_comparison"] = {
                        "leftLabel": doc_c["key"],
                        "rightLabel": sys_c["key"],
                        "rows": [],
                        "unmatched": True,
                        "reason": "No shared reference/ID value found between document data and system data. Comparison skipped to prevent incorrect matching.",
                    }
                else:
                    def _to_num(x: Any) -> Optional[float]:
                        try:
                            if isinstance(x, (int, float)):
                                return float(x)
                            if isinstance(x, str):
                                t = x.strip().replace(",", "")
                                t = re.sub(r"[^0-9.\-]", "", t)
                                if not t or t in ("-", "."):
                                    return None
                                return float(t)
                        except Exception:
                            return None
                        return None

                    def _eq(a: Any, b: Any) -> bool:
                        na = _to_num(a)
                        nb = _to_num(b)
                        if na is not None and nb is not None:
                            return abs(na - nb) <= 1e-9
                        sa = str(a).strip().lower() if a is not None else ""
                        sb = str(b).strip().lower() if b is not None else ""
                        # Treat common "empty" markers as equivalent
                        empties = {"", "n/a", "na", "none", "null", "-"}
                        if sa in empties and sb in empties:
                            return True
                        return sa == sb

                    shared_keys = [k for k in left.keys() if k in right]
                    # Prefer stable order: shorter keys first, then alphabetical
                    shared_keys = sorted(shared_keys, key=lambda x: (len(x), x.lower()))[:24]
                    rows = []
                    for kk in shared_keys:
                        rows.append({
                            "field": kk,
                            "left": left.get(kk),
                            "right": right.get(kk),
                            "match": _eq(left.get(kk), right.get(kk)),
                        })

                    if rows:
                        review_data["_approval_comparison"] = {
                            "leftLabel": doc_c["key"],
                            "rightLabel": sys_c["key"],
                            "rows": rows,
                            "binding": binding,
                        }
        except Exception as _cmp_exc:
            logs.append(f"Approval comparison generation skipped: {_cmp_exc}")
        
        # Generate LLM approval summary so approvers see business-friendly context
        _has_llm = bool(self.deps and getattr(self.deps, 'llm', None))
        logger.info("[ApprovalNode] LLM summary: review_data=%d keys, has_llm=%s", len(review_data) if review_data else 0, _has_llm)
        def _fallback_summary(data: dict) -> str:
            """Generic, business-friendly fallback summary (no LLM)."""
            try:
                lines = []
                for k, v in list(data.items())[:40]:
                    if not k or str(k).startswith('_'):
                        continue
                    if isinstance(v, dict):
                        # Prefer human-visible fields
                        fn = v.get('filename') or v.get('name')
                        if fn and v.get('path'):
                            lines.append(f"• Attachment: {fn}")
                            continue
                        # Show a few key/value pairs
                        pairs = []
                        for kk, vv in list(v.items())[:6]:
                            if vv is None or vv == '':
                                continue
                            if isinstance(vv, (dict, list)):
                                continue
                            pairs.append(f"{kk}: {vv}")
                        if pairs:
                            lines.append(f"• {k}: " + ", ".join(pairs))
                        else:
                            lines.append(f"• {k}: (details available)")
                    elif isinstance(v, list):
                        lines.append(f"• {k}: {len(v)} item(s)")
                    else:
                        s = str(v).strip()
                        if s:
                            lines.append(f"• {k}: {s[:180]}")
                return "\n".join(lines[:25])
            except Exception:
                return "• Summary is available, but detailed formatting is temporarily unavailable."

        if review_data and _has_llm:
            try:
                def _is_uploaded_file_dict(d: Any) -> bool:
                    try:
                        if not isinstance(d, dict):
                            return False
                        kind = str(d.get("kind") or "").lower().replace("_", "").replace("-", "")
                        if kind in ("uploadedfile", "uploadfile", "file"):
                            return True
                        keys = {str(k).lower().replace("_", "").replace("-", "") for k in d.keys()}
                        if ("downloadurl" in keys or "contenttype" in keys) and ("path" in keys or "name" in keys or "filename" in keys):
                            return True
                    except Exception:
                        return False
                    return False

                def _is_tool_envelope(d: Any) -> bool:
                    if not isinstance(d, dict):
                        return False
                    return bool(d.get("status_code") is not None or d.get("tool_type") or d.get("mode")) and isinstance(d.get("response"), list)

                _DROP_KEYS = {
                    "id", "uuid", "path", "stored_path", "storedpath", "download_url", "downloadurl",
                    "content_type", "contenttype", "mime_type", "mimetype", "size", "bytes", "created_at", "updated_at"
                }

                def _sanitize_for_summary(val: Any, depth: int = 0) -> Any:
                    if depth > 6:
                        return None
                    if val is None:
                        return None
                    if isinstance(val, (str, int, float, bool)):
                        return val
                    if isinstance(val, list):
                        if not val:
                            return []
                        # Uploaded files list -> names only
                        if all(isinstance(x, dict) and _is_uploaded_file_dict(x) for x in val[:5] if isinstance(x, dict)):
                            names = []
                            for x in val[:10]:
                                if isinstance(x, dict):
                                    n = x.get("filename") or x.get("name")
                                    if n:
                                        names.append(str(n))
                            return names
                        # Generic list: sanitize first N
                        out = []
                        for x in val[:12]:
                            sx = _sanitize_for_summary(x, depth + 1)
                            if sx is not None and sx != "":
                                out.append(sx)
                        return out
                    if isinstance(val, dict):
                        if _is_uploaded_file_dict(val):
                            return {"filename": val.get("filename") or val.get("name") or "file"}
                        if _is_tool_envelope(val):
                            # Never dump entire tool response into summary input
                            resp = val.get("response") or []
                            return {
                                "status_code": val.get("status_code"),
                                "status": val.get("status"),
                                "response_count": len(resp) if isinstance(resp, list) else 0,
                            }
                        out = {}
                        for kk, vv in list(val.items())[:40]:
                            k_norm = str(kk).lower().replace(" ", "").replace("_", "").replace("-", "")
                            if k_norm in {x.replace("_", "") for x in _DROP_KEYS}:
                                continue
                            if k_norm in ("downloadurl", "path", "contenttype", "mimetype"):
                                continue
                            sv = _sanitize_for_summary(vv, depth + 1)
                            if sv is None or sv == "" or sv == [] or sv == {}:
                                continue
                            out[kk] = sv
                        return out
                    return None

                _summary_data = {}
                for _sk, _sv in review_data.items():
                    # Keep key internal comparison structures for grounded summaries
                    _force_include_internal = _sk in ("_approval_comparisons", "_approval_comparison")
                    if _sk.startswith('_') and not _force_include_internal:
                        continue
                    # Keep comparisons (already business-focused), drop bulky raw tool responses and upload metadata
                    if isinstance(_sv, dict) and _is_tool_envelope(_sv) and isinstance(_sv.get("response"), list) and len(_sv.get("response") or []) > 5:
                        _summary_data[_sk] = _sanitize_for_summary(_sv)
                        continue
                    if isinstance(_sv, list) and _sv and all(isinstance(x, dict) and _is_uploaded_file_dict(x) for x in _sv[:2] if isinstance(x, dict)):
                        _summary_data[_sk] = _sanitize_for_summary(_sv)
                        continue
                    try:
                        _clean = _sanitize_for_summary(_sv)
                        _sj = json.dumps(_clean, default=str)
                        if len(_sj) > 8000:
                            if isinstance(_clean, dict):
                                _summary_data[_sk] = {k: v for i, (k, v) in enumerate(_clean.items()) if i < 20}
                            elif isinstance(_clean, list):
                                _summary_data[_sk] = _clean[:10]
                            else:
                                _summary_data[_sk] = str(_clean)[:4000]
                        else:
                            _summary_data[_sk] = _clean
                    except Exception:
                        _summary_data[_sk] = str(_sv)[:2000]
                # Detect if any variable contains per-record analysis data
                _has_record_analysis = False
                _record_analysis_count = 0
                for _rdv in _summary_data.values():
                    if isinstance(_rdv, dict):
                        _ra = _rdv.get("recordAnalysis")
                        if isinstance(_ra, list) and len(_ra) > 0:
                            _has_record_analysis = True
                            _record_analysis_count = max(_record_analysis_count, len(_ra))
                _summary_limit = 30000 if _has_record_analysis else 15000
                _summary_json = json.dumps(_summary_data, default=str, ensure_ascii=False)[:_summary_limit]
                logger.info(
                    "[ApprovalNode] LLM summary: sending %d chars to LLM (has_record_analysis=%s, record_count=%d)",
                    len(_summary_json), _has_record_analysis, _record_analysis_count,
                )
                from core.llm.base import Message, MessageRole
                _summary_resp = await asyncio.wait_for(
                    self.deps.llm.chat(
                        messages=[
                            Message(role=MessageRole.SYSTEM, content=(
                                "You are an executive assistant writing a comprehensive approval summary for a business manager. "
                                "Write a clear, professional summary that contains ALL important details the approver needs. "
                                "Rules:\n"
                                "- Lead with the most important finding or action needed.\n"
                                "- Include specific numbers, amounts, dates, and names from the data.\n"
                                "- Highlight any risks, anomalies, or discrepancies with exact figures.\n"
                                "- For comparisons, show both values side by side ONLY when they differ (e.g., 'Actual: 13,333.75 vs Expected: 63,000').\n"
                                "- Do NOT list fields where Document and System are the same. If a shared identifier/value is important (e.g., reference number, record number, name), show it ONCE (no Document/System).\n"
                                "- If a side-by-side comparison table is present in the data, use it to present the SAME fields\n"
                                "  for 'Document' vs 'System' in the same order so it is easy to compare.\n"
                                "- When you mention a field, show it consistently for both sides: 'Field: Document=<x> | System=<y>'.\n"
                                "- If there are multiple items (e.g., multiple documents/records), cover EACH item separately.\n"
                                "  Do NOT skip any item. If 3 items were analyzed, all 3 must appear in the summary.\n"
                                "- If the data contains a 'recordAnalysis' array, it holds per-record details from the analysis.\n"
                                "  Each element is a separate record. Present EVERY record's findings under its own heading/section.\n"
                                "  Show the record identifier, its individual risk level, and ALL its findings.\n"
                                "- If there is a findings/anomalies/discrepancies list, include EVERY finding as its own bullet\n"
                                "  with the type, severity/risk, and the exact values that triggered it.\n"
                                "  Do NOT collapse or summarize multiple findings into one.\n"
                                "- If any report/document is available, mention its filename so the approver knows what to download.\n"
                                "- Use plain business language. No technical terms, no JSON keys, no array indices.\n"
                                "- Do NOT use markdown (no **, no backticks, no headers). No asterisks.\n"
                                "- Keep it scannable. Prefer fewer bullets that focus on differences, risks, and key identifiers.\n"
                                "- End with a clear recommendation or the key question the approver needs to answer.\n"
                                "- Format as bullet points using the bullet character. One bullet per line. No headers."
                            )),
                            Message(role=MessageRole.USER, content=(
                                f"Approval step: {title}\n"
                                f"Description: {description}\n\n"
                                f"Data for review:\n{_summary_json}\n\n"
                                "Write the approval summary now."
                            )),
                        ],
                        temperature=0.3,
                        max_tokens=2500 if _has_record_analysis else 1500,
                    ),
                    timeout=45 if _has_record_analysis else 30
                )
                if _summary_resp and _summary_resp.content:
                    # Post-verify: remove any false "mismatch" bullets where Document == System
                    _s = _summary_resp.content.strip()
                    try:
                        import re as _re
                        def _to_num(x: str):
                            try:
                                t = str(x).strip().replace(",", "")
                                t = _re.sub(r"[^0-9.\-]", "", t)
                                if not t or t in ("-", "."):
                                    return None
                                return float(t)
                            except Exception:
                                return None
                        _rx = _re.compile(r"mismatch.*?document\s*[:=\-]\s*([-0-9.,]+).*?system\s*[:=\-]\s*([-0-9.,]+)", _re.I)
                        cleaned = []
                        for line in _s.splitlines():
                            m = _rx.search(line or "")
                            if m:
                                a = _to_num(m.group(1)); b = _to_num(m.group(2))
                                if a is not None and b is not None and abs(a - b) <= 1e-9:
                                    logs.append(f"🧹 Removed false mismatch line from summary: Document==System ({a})")
                                    continue
                            cleaned.append(line)
                        _s = "\n".join(cleaned).strip()
                    except Exception:
                        pass

                    # Post-format: collapse equal "Document=... | System=..." lines into a single value
                    try:
                        import re as _re2

                        def _norm_text(x: str) -> str:
                            t = str(x or "").strip()
                            t = _re2.sub(r"\s+", " ", t)
                            t = t.strip(" .;,-")
                            return t.lower()

                        _cmp_rx = _re2.compile(
                            r"^\s*(?:[•\-\*]\s*)?(?P<label>[^:]{2,80}?)\s*:\s*"
                            r"document\s*[:=]\s*(?P<doc>.+?)\s*\|\s*system\s*[:=]\s*(?P<sys>.+?)\s*$",
                            _re2.I
                        )
                        collapsed = []
                        for line in _s.splitlines():
                            m = _cmp_rx.match(line or "")
                            if not m:
                                collapsed.append(line)
                                continue
                            label = (m.group("label") or "").strip()
                            doc_v = (m.group("doc") or "").strip()
                            sys_v = (m.group("sys") or "").strip()
                            a = _to_num(doc_v)
                            b = _to_num(sys_v)
                            eq = False
                            if a is not None and b is not None:
                                eq = abs(a - b) <= 1e-9
                            else:
                                eq = _norm_text(doc_v) == _norm_text(sys_v) and _norm_text(doc_v) != ""
                            if eq:
                                # Keep key identifiers once; avoid Document/System duplication noise
                                bullet = "• "
                                collapsed.append(f"{bullet}{label}: {doc_v}")
                            else:
                                collapsed.append(line)
                        _s = "\n".join([ln for ln in collapsed if str(ln or "").strip()]).strip()
                    except Exception:
                        pass

                    review_data['_approval_summary'] = _s
                    logs.append(f"Generated approval summary ({len(_summary_resp.content)} chars)")
                    logger.info("[ApprovalNode] LLM summary generated: %d chars", len(_summary_resp.content))
                else:
                    logs.append("Approval summary: LLM returned empty response")
                    logger.warning("[ApprovalNode] LLM summary: empty response")
            except Exception as _se:
                logs.append(f"Approval summary generation skipped: {_se}")
                logger.warning("[ApprovalNode] LLM summary failed: %s", _se, exc_info=True)
                if review_data and not review_data.get('_approval_summary'):
                    review_data['_approval_summary'] = _fallback_summary(review_data)
                    logs.append("Approval summary: used fallback summary (LLM failure)")
        elif review_data and not review_data.get('_approval_summary'):
            # No LLM configured: always provide a fallback summary so the UI can stay business-friendly
            review_data['_approval_summary'] = _fallback_summary(review_data)
            logs.append("Approval summary: used fallback summary (no LLM configured)")

        # Build approval request metadata
        approval_request = {
            'node_id': node.id,
            'node_name': node.name,
            'title': title,
            'description': description,
            'assignee_type': assignee_type,
            'assignee_ids': assignee_ids,
            'approver_details': approver_details,
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
        
        # Detailed assignee log with names and emails
        approver_summary = ", ".join(
            f"{ad['name']} ({ad['email']})" for ad in approver_details
        ) if approver_details else "(none)"
        logs.append(f"Approvers: {approver_summary}")
        logs.append(f"Deadline: {deadline}")
        
        # ── Embedded notification: optionally email the approver(s) ──
        notify_approver = (
            self.get_config_value(node, 'notifyApprover', False)
            or self.get_config_value(node, 'notify_approver', False)
        )
        logger.info(
            "[ApprovalNode] notifyApprover=%s, approver_details=%s, "
            "has_notification_svc=%s",
            notify_approver, approver_details,
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

            # Use already-resolved approver details instead of re-resolving
            approver_emails = [
                ad['email'] for ad in approver_details
                if ad.get('email') and '@' in ad.get('email', '')
            ]
            logger.info("[ApprovalNode] Approver emails from details: %s", approver_emails)

            if not approver_emails:
                # Fallback to full resolution chain
                approver_emails = self._resolve_assignee_emails(
                    assignee_ids, assignee_type, state, context, logs
                )
                logger.info("[ApprovalNode] Fallback resolved emails: %s", approver_emails)

            if approver_emails:
                try:
                    # Attach generated outputs (reports) when available so approvers receive the Excel/PDF
                    # without needing to open the UI. Keep this generic: only attach files that were
                    # generated by the process (process_outputs), not the originally uploaded source docs.
                    attachments = None
                    try:
                        import os
                        import mimetypes
                        base_dir = os.environ.get("PROCESS_OUTPUT_PATH", "data/process_outputs")
                        base_dir_abs = os.path.abspath(base_dir)
                        seen = set()
                        atts = []

                        def _is_generated_output_path(p: str) -> bool:
                            try:
                                ap = os.path.abspath(str(p))
                                if os.path.commonpath([ap, base_dir_abs]) == base_dir_abs:
                                    return True
                            except Exception:
                                pass
                            return "/process_outputs/" in str(p).replace("\\", "/")

                        def _add_file_info(fi: dict):
                            if not isinstance(fi, dict):
                                return
                            fpath = fi.get("path")
                            if not fpath or not isinstance(fpath, str):
                                return
                            if not _is_generated_output_path(fpath):
                                return
                            if not os.path.isfile(fpath):
                                return
                            if fpath in seen:
                                return
                            seen.add(fpath)
                            fname = fi.get("filename") or os.path.basename(fpath)
                            fmt = (fi.get("format") or "").strip().lower()
                            mime = fi.get("mime_type") or mimetypes.guess_type(fname or fpath)[0] or "application/octet-stream"
                            # Prefer deterministic MIME for known formats
                            if fmt == "xlsx":
                                mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                            elif fmt == "pdf":
                                mime = "application/pdf"
                            elif fmt == "docx":
                                mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            elif fmt == "pptx":
                                mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation"
                            atts.append({"path": fpath, "filename": fname, "mime_type": mime})

                        # 1) scan review_data
                        if isinstance(review_data, dict):
                            for _v in review_data.values():
                                if isinstance(_v, dict):
                                    _add_file_info(_v)
                                    if isinstance(_v.get("data"), dict):
                                        _add_file_info(_v.get("data"))
                                elif isinstance(_v, list):
                                    for _it in _v:
                                        if isinstance(_it, dict):
                                            _add_file_info(_it)
                                            if isinstance(_it.get("data"), dict):
                                                _add_file_info(_it.get("data"))

                        # 2) scan full state (fallback) for generated docs
                        try:
                            all_vars = state.get_all() if hasattr(state, "get_all") else {}
                            for _k, _v in (all_vars or {}).items():
                                if isinstance(_v, dict):
                                    _add_file_info(_v)
                                    if isinstance(_v.get("data"), dict):
                                        _add_file_info(_v.get("data"))
                        except Exception:
                            pass

                        if atts:
                            attachments = atts[:3]  # keep emails lightweight
                            logs.append(f"Attachments for approver email: {', '.join([a.get('filename','file') for a in attachments])}")
                    except Exception as _att_exc:
                        logs.append(f"Approver email attachment resolution skipped: {_att_exc}")

                    send_result = await self.deps.notification_service.send(
                        channel=notif_channel,
                        recipients=approver_emails,
                        title=notif_title,
                        message=notif_msg,
                        priority=priority,
                        attachments=attachments,
                    )
                    logger.info("[ApprovalNode] Notification send result: %s", send_result)
                    email_list = ", ".join(approver_emails)
                    logs.append(f"📧 Sent {notif_channel} notification to: {email_list}")
                except Exception as e:
                    logger.error(
                        "[ApprovalNode] Notification send exception: %s", e, exc_info=True
                    )
                    logs.append(f"⚠️ Approver notification failed: {e}")
            else:
                logs.append(
                    "⚠️ Notification enabled but no approver email could be resolved. "
                    "Check that the approver has an email address in their profile."
                )
        
        # Return waiting result - the engine will create the DB record
        return NodeResult.waiting(
            waiting_for='approval',
            waiting_metadata=approval_request,
            output={
                'approver_details': approver_details,
                'assignee_type': assignee_type,
                'notification_sent': notify_approver and bool(approver_emails) if notify_approver else False,
            },
            logs=logs,
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

            if aid_lower in ("requester", "submitter", "initiator", "self", "platform_user", "user", "current_user"):
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
            if r_lower in ("requester", "submitter", "initiator", "self", "platform_user", "user", "current_user"):
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
                        "Check: Does this user have a manager assigned? "
                        "Go to Organization > People & Departments and verify the manager field."
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
            
            # Fallback: if it doesn't look like an email, try resolving
            # to the requester as a last resort (wizard sometimes generates
            # ambiguous shortcut names).
            if "@" not in r_str:
                logs.append(
                    f"⚠️ Unrecognized recipient shortcut '{r_str}' — attempting requester fallback"
                )
                _fb_email = user_context.get("email") or getattr(context, 'user_email', None) or ""
                if _fb_email:
                    resolved_recipients.append(_fb_email)
                    logs.append(f"Resolved unrecognized '{r_str}' → requester email {_fb_email}")
                else:
                    logs.append(f"⚠️ Could not resolve '{r_str}' — no fallback email available")
            else:
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
            if any(s in ("requester", "submitter", "initiator", "self", "platform_user", "user", "current_user") for s in attempted_shortcuts):
                if not user_context.get("email"):
                    specific_hints.append("The requester's email address is not available — check the user's profile in Organization > People & Departments.")
            if any(s in ("manager", "supervisor", "direct_manager") for s in attempted_shortcuts):
                if not user_context.get("manager_email"):
                    specific_hints.append("The requester's manager email is not available — go to Organization > People & Departments and ensure a manager is assigned to this user.")
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
            logs.append("Warning: No notification service configured - notification not sent")
            return NodeResult.success(
                output={
                    'sent': False,
                    'reason': 'No notification service configured'
                },
                logs=logs
            )

        # ── Resolve file attachments ──────────────────────────────────────
        resolved_attachments = self._resolve_attachments(node, state, logs)

        if resolved_attachments:
            logs.append(f"Attachments ready to send: {[a['filename'] for a in resolved_attachments]}")
        else:
            logs.append(
                "ℹ️ No file attachment will be included in this notification. "
                "If a report was expected to be attached, make sure a 'Report Generation' "
                "step runs and completes BEFORE this notification in the process flow."
            )

        # Send notification
        try:
            logger.info(
                "[NotifNode:%s] Sending via channel=%s to %d recipient(s): %s attachments=%d",
                node.name, channel, len(interpolated_recipients), interpolated_recipients,
                len(resolved_attachments),
            )
            result = await self.deps.notification_service.send(
                channel=channel,
                recipients=interpolated_recipients,
                title=title,
                message=message,
                template_id=template_id,
                template_data=template_data,
                priority=priority,
                config=channel_config,
                attachments=resolved_attachments or None,
            )
            logger.info("[NotifNode:%s] Send result: %s", node.name, result)
            
            logs.append(f"Notification sent successfully")
            
            _out: dict = {
                'sent': True,
                'channel': channel,
                'recipients_count': len(interpolated_recipients),
                'attachments_sent': len(resolved_attachments),
                'result': result,
            }
            if not resolved_attachments:
                _out['attachment_notice'] = (
                    "Notification sent without any file attachment. "
                    "If a report was expected, ensure a Report Generation step runs "
                    "before this notification in the process flow."
                )
            return NodeResult.success(output=_out, logs=logs)
            
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
    
    # ── Attachment resolution ────────────────────────────────────────

    _MIME_MAP = {
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'pdf': 'application/pdf',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'txt': 'text/plain',
        'csv': 'text/csv',
    }

    def _try_resolve_file_info(self, val: Any) -> Optional[dict]:
        """Extract {path, filename, format} from a state value that represents a generated document."""
        import os
        if not isinstance(val, dict):
            return None
        if val.get('path') and isinstance(val['path'], str):
            if os.path.isfile(val['path']):
                return val
        data = val.get('data')
        if isinstance(data, dict) and data.get('path') and isinstance(data['path'], str):
            if os.path.isfile(data['path']):
                return data
        return None

    def _resolve_attachments(
        self, node, state, logs: list
    ) -> list:
        """Resolve config.attachments into a list of {path, filename, mime_type} dicts.

        Supported config values for each attachment entry:
          - A string variable reference like "{{generatedReport}}" that points
            to a dict with at least a ``path`` key (produced by create_doc / file_operation).
          - A raw string path (absolute filesystem path).
          - A dict with ``variable`` key (variable name whose state value has ``path``).
          - A dict with ``path`` key directly.

        If no attachments are configured, auto-detects generated documents in state.
        """
        import os

        raw = self.get_config_value(node, 'attachments', [])
        logger.info("[NotifNode:%s] Attachments config raw: %s (type=%s)", node.name, raw, type(raw).__name__)

        if isinstance(raw, str) and raw.strip():
            raw = [raw]
        if not isinstance(raw, list):
            raw = []

        result = []
        for entry in raw:
            try:
                file_info = None

                if isinstance(entry, str):
                    var_name = entry.strip()
                    if var_name.startswith('{{') and var_name.endswith('}}'):
                        var_name = var_name[2:-2].strip()

                    val = state.get(var_name)
                    logger.info("[NotifNode:%s] Attachment var '%s' → type=%s, keys=%s",
                                node.name, var_name, type(val).__name__,
                                list(val.keys()) if isinstance(val, dict) else '(N/A)')
                    file_info = self._try_resolve_file_info(val)
                    if not file_info and isinstance(val, str) and os.path.isfile(val):
                        file_info = {'path': val, 'filename': os.path.basename(val)}
                    if not file_info and os.path.isfile(entry):
                        file_info = {'path': entry, 'filename': os.path.basename(entry)}

                elif isinstance(entry, dict):
                    var_name = entry.get('variable') or entry.get('var')
                    if var_name:
                        val = state.get(str(var_name))
                        file_info = self._try_resolve_file_info(val)
                    elif entry.get('path'):
                        file_info = entry

                if file_info and file_info.get('path'):
                    fpath = str(file_info['path'])
                    if os.path.isfile(fpath):
                        att = {
                            'path': fpath,
                            'filename': file_info.get('filename') or os.path.basename(fpath),
                        }
                        fmt = file_info.get('format', '')
                        if fmt:
                            att['mime_type'] = self._MIME_MAP.get(fmt, 'application/octet-stream')
                        result.append(att)
                        logs.append(f"Attachment resolved: {att['filename']}")
                    else:
                        logs.append(f"Attachment file not found: {fpath}")
                else:
                    logs.append(f"Could not resolve attachment: {entry}")
            except Exception as exc:
                logs.append(f"Attachment resolution error: {exc}")

        # Auto-detect generated documents in state if no explicit attachments were configured or resolved
        if not result:
            logger.info("[NotifNode:%s] No attachments resolved from config, scanning state for generated docs", node.name)
            try:
                all_vars = state.get_all() if hasattr(state, 'get_all') else {}
                for vk, vv in all_vars.items():
                    fi = self._try_resolve_file_info(vv)
                    if fi and fi.get('path') and fi.get('filename'):
                        fpath = str(fi['path'])
                        if os.path.isfile(fpath):
                            att = {
                                'path': fpath,
                                'filename': fi.get('filename') or os.path.basename(fpath),
                            }
                            fmt = fi.get('format', '')
                            if fmt:
                                att['mime_type'] = self._MIME_MAP.get(fmt, 'application/octet-stream')
                            result.append(att)
                            logs.append(f"Auto-attached generated document: {att['filename']} (from variable '{vk}')")
                            logger.info("[NotifNode:%s] Auto-attached: %s from var '%s'", node.name, att['filename'], vk)
            except Exception as exc:
                logs.append(f"Auto-attach scan error: {exc}")

        return result

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
        has_message = message is not None and str(message).strip()
        has_template = template is not None and str(template).strip()
        
        if not recipients:
            return ExecutionError.validation_error("At least one recipient is required")
        
        if not has_message and not has_template:
            return ExecutionError.validation_error("Either message or template is required")
        
        return None
