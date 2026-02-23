"""
Process API Service
Business logic for process execution API

This service bridges the API layer with the Process Engine.
Integrates with the platform's security module for access control.
"""

import json
import os
import uuid
import logging
import re
from typing import Dict, Any, List, Optional, AsyncIterator
from datetime import datetime
from sqlalchemy.orm import Session

from database.services.process_execution_service import ProcessExecutionService
from database.services.process_settings_service import ProcessSettingsService
from database.models import Agent
from core.process import (
    ProcessEngine,
    ProcessDefinition,
    ProcessContext,
    ProcessResult,
)
from core.process.nodes.base import ExecutorDependencies
from core.llm.registry import LLMRegistry
from core.llm.factory import LLMFactory
from core.llm.base import Message, MessageRole
from core.tools.base import ToolRegistry, ToolConfig

from .schemas import (
    ProcessExecutionResponse,
    ApprovalRequestResponse,
    ProcessStatsResponse,
)

from core.process.services import NotificationService, ApprovalService

# Import Access Control for security integration
from api.modules.access_control.service import AccessControlService

# Import User Directory for identity resolution in processes
from core.identity.service import UserDirectoryService

logger = logging.getLogger(__name__)

# Singleton User Directory Service for process identity resolution
_user_directory = UserDirectoryService()


def _approvers_to_ids(value: Any) -> List[str]:
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


class ProcessAPIService:
    """
    Service for process execution API operations
    """
    
    def __init__(
        self,
        db: Session,
        llm_registry: Optional[LLMRegistry] = None
    ):
        self.db = db
        self.exec_service = ProcessExecutionService(db)
        self.llm_registry = llm_registry
    
    async def start_execution(
        self,
        agent_id: str,
        org_id: str,
        user_id: str,
        trigger_input: Dict[str, Any] = None,
        trigger_type: str = "manual",
        conversation_id: str = None,
        correlation_id: str = None,
        user_info: Dict[str, Any] = None
    ) -> ProcessExecutionResponse:
        """
        Start a new process execution
        
        Security checks:
        1. Agent access - Does user have access to the agent?
        2. Execute permission - Can user execute this agent?
        3. Tool access - Which tools can user use? (filtered at runtime)
        
        Args:
            agent_id: ID of the process agent
            org_id: Organization ID
            user_id: ID of user triggering execution
            trigger_input: Input data
            trigger_type: How it was triggered
            conversation_id: Optional conversation link
            correlation_id: Optional correlation ID
            user_info: Optional user info for context
            
        Returns:
            ProcessExecutionResponse with execution details
        """
        # Get the agent
        agent = self.db.query(Agent).filter(
            Agent.id == uuid.UUID(agent_id),
            Agent.org_id == uuid.UUID(org_id)
        ).first()
        
        if not agent:
            raise ValueError(f"Agent not found: {agent_id}")
        # Agent (and process_definition, process_settings, name, tool_ids) are from DB above; we use _ensure_dict for JSON columns

        # --- [ProcessDebug] What was loaded from DB ---
        _raw_pd = agent.process_definition
        _pd_type = type(_raw_pd).__name__
        _pd = self._ensure_dict(_raw_pd)
        _nodes = _pd.get("nodes") or []
        _ps = self._ensure_dict(agent.process_settings or {})
        logger.info(
            "[ProcessDebug] Loaded from DB: agent_id=%s, process_definition type=%s, nodes_count=%s, process_settings keys=%s",
            agent_id, _pd_type, len(_nodes), list(_ps.keys())
        )
        for i, n in enumerate(_nodes):
            _cfg = n.get("config") or {}
            _tc = _cfg.get("type_config") or _cfg
            logger.info(
                "[ProcessDebug]   node[%s] id=%s type=%s config_keys=%s (type_config: approvers=%s assignee_ids=%s expression=%s)",
                i, n.get("id"), n.get("type"), list(_cfg.keys()) if isinstance(_cfg, dict) else [],
                _tc.get("approvers"), _tc.get("assignee_ids"), _tc.get("expression") if isinstance(_tc, dict) else None
            )
        # --- end ProcessDebug ---
        
        if agent.agent_type != "process":
            raise ValueError(f"Agent is not a process type: {agent.agent_type}")
        
        if not agent.process_definition:
            raise ValueError("Agent has no process definition")
        
        # =========================================================
        # SECURITY CHECK 1: Agent Access Control
        # =========================================================
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        is_owner = user_id == owner_id
        
        if not is_owner:
            # Check if user has access to this agent
            user_roles = user_info.get('roles', []) if user_info else []
            user_groups = user_info.get('groups', []) if user_info else []
            
            access_result = AccessControlService.check_user_access(
                user_id=user_id,
                user_role_ids=user_roles,
                user_group_ids=user_groups,
                agent_id=agent_id,
                org_id=org_id
            )
            
            if not access_result.has_access:
                raise PermissionError(
                    f"Access denied: {access_result.reason or 'You do not have permission to execute this process'}"
                )
            
            # Store denied tools for filtering during execution
            denied_tool_ids = access_result.denied_tools or []
        else:
            denied_tool_ids = []  # Owner has access to all tools
        
        # =========================================================
        # MERGE SETTINGS: Org Defaults + Process Settings
        # =========================================================
        settings_service = ProcessSettingsService(self.db)
        org_settings = self._ensure_dict(settings_service.get_org_settings(org_id))
        process_settings = self._ensure_dict(agent.process_settings or {})
        
        # Merge: org_settings as base, process_settings as override
        merged_settings = self._merge_settings(org_settings, process_settings)
        
        # Validate and parse process definition with merged settings
        try:
            # Inject merged settings into the definition (support JSON string from DB)
            definition_data = self._ensure_dict(agent.process_definition).copy()
            if 'settings' not in definition_data:
                definition_data['settings'] = {}
            
            # Merge settings into definition
            definition_data['settings'] = self._merge_settings(
                merged_settings, 
                definition_data.get('settings', {})
            )
            
            # Normalize Visual Builder format to engine format
            definition_data = self._normalize_visual_builder_definition(
                definition_data, 
                agent_name=getattr(agent, 'name', 'Workflow')
            )

            # --- [ProcessDebug] Definition used for execution (after normalize) ---
            _dbg = str(os.getenv("PROCESS_DEBUG", "")).strip().lower() in ("1", "true", "yes", "y", "on")
            if _dbg:
                _norm_nodes = definition_data.get("nodes") or []
                logger.info("[ProcessDebug] After normalize: nodes_count=%s", len(_norm_nodes))
                for i, nn in enumerate(_norm_nodes):
                    _nc = nn.get("config") or {}
                    _ntc = _nc.get("type_config") or _nc
                    logger.info(
                        "[ProcessDebug]   norm_node[%s] id=%s type=%s assignee_ids=%s expression=%s true_branch=%s false_branch=%s",
                        i, nn.get("id"), nn.get("type"),
                        _ntc.get("assignee_ids") if isinstance(_ntc, dict) else None,
                        _ntc.get("expression") if isinstance(_ntc, dict) else None,
                        _ntc.get("true_branch") if isinstance(_ntc, dict) else None,
                        _ntc.get("false_branch") if isinstance(_ntc, dict) else None,
                    )
            # --- end ProcessDebug ---
            
            process_def = ProcessDefinition.from_dict(definition_data)
        except Exception as e:
            logger.exception("Process definition parse failed: %s", e)
            raise ValueError(f"Invalid process definition: {e}")
        
        _trigger = self._ensure_dict(trigger_input or {})
        # --- [ProcessDebug] Execution input ---
        if str(os.getenv("PROCESS_DEBUG", "")).strip().lower() in ("1", "true", "yes", "y", "on"):
            logger.info(
                "[ProcessDebug] Starting execution: agent_id=%s, trigger_type=%s, trigger_input_keys=%s (values not logged to avoid PII)",
                agent_id, trigger_type, list(_trigger.keys())
            )
        # --- end ProcessDebug ---

        # Create execution record (snapshot = normalized definition so resume/DB always get dict + normalizations)
        execution = self.exec_service.create_execution(
            agent_id=agent_id,
            org_id=org_id,
            created_by=user_id,
            trigger_type=trigger_type,
            trigger_input=_trigger,
            conversation_id=conversation_id,
            correlation_id=correlation_id,
            process_definition_snapshot=definition_data,
        )
        logger.info("[ProcessDebug] Created execution_id=%s", str(execution.id))

        # Update status to running
        execution = self.exec_service.update_execution_status(
            str(execution.id),
            status="running"
        )
        
        # =========================================================
        # SECURITY: Filter available tools based on access control
        # =========================================================
        available_tools = agent.tool_ids or []
        # Remove denied tools from available list
        filtered_tool_ids = [t for t in available_tools if t not in denied_tool_ids]
        
        if denied_tool_ids:
            # Log count only; do not log user_id or trigger_input (may contain PII)
            logger.info("Filtered %s denied tools for execution %s", len(denied_tool_ids), str(execution.id))
        
        # =========================================================
        # ENRICH: User Directory Integration
        # =========================================================
        # Enrich the process context with user directory data
        # (manager, department, employee_id, etc.) so process nodes
        # can use dynamic assignees like {{ context.manager_id }}
        user_context = {}
        _identity_warnings = []
        try:
            logger.info(
                "[ProcessIdentity] Enriching context: user_id=%s, org_id=%s",
                user_id, org_id
            )
            user_context = _user_directory.enrich_process_context(user_id, org_id)
            logger.info(
                "[ProcessIdentity] Enriched context for user %s: keys=%s, email=%s, manager_email=%s",
                user_id[:8] + "..." if user_id else "None",
                list(user_context.keys()),
                user_context.get("email", "(none)"),
                user_context.get("manager_email", "(none)")
            )
        except Exception as e:
            logger.warning("[ProcessIdentity] Failed to enrich user context for user_id=%s, org_id=%s: %s", user_id, org_id, e)
            import traceback
            logger.warning("[ProcessIdentity] Traceback: %s", traceback.format_exc())
            _identity_warnings.append(f"Identity enrichment failed: {e}")
        
        # ── CRITICAL FALLBACK ──────────────────────────────────────
        # If enrich_process_context returned empty or minimal data
        # (e.g. user not found in DB), inject the authenticated user's
        # email from the auth token so at least "requester" notifications work.
        _auth_email = (user_info.get("email") if user_info else None) or ""
        _auth_name = (user_info.get("name") if user_info else None) or ""
        
        if not user_context.get("email") and _auth_email:
            user_context["email"] = _auth_email
            print(f"🔄 [ProcessIdentity] FALLBACK: Injected email from auth token: {_auth_email}")
            logger.info(
                "[ProcessIdentity] Injected email from auth token as fallback: %s", _auth_email
            )
            _identity_warnings.append(
                f"User email was not found via the Identity Directory. "
                f"Using the authenticated email ({_auth_email}) as fallback. "
                "To fix permanently, ensure the user exists in the Identity Directory with matching email."
            )
        else:
            print(f"✅ [ProcessIdentity] user_context email: {user_context.get('email', '(not set)')}, auth_email: {_auth_email}")
        if not user_context.get("display_name") and _auth_name:
            user_context["display_name"] = _auth_name
        if not user_context.get("user_id"):
            user_context["user_id"] = user_id
        # ── END FALLBACK ──────────────────────────────────────────
        
        # Validate the enriched context — report missing critical fields
        if user_context and len(user_context) > 2:  # More than just user_id + fallback email
            if not user_context.get("email"):
                _identity_warnings.append(
                    "User email not found in identity directory. "
                    "Notifications to 'requester' will fail."
                )
            if not user_context.get("manager_email") and not user_context.get("manager_id"):
                _identity_warnings.append(
                    "Manager information not found for this user in the identity directory. "
                    "Notifications/approvals to 'manager' will fail. "
                    "Please check the user's profile in the Identity Directory and ensure a manager is assigned."
                )
            if not user_context.get("department_name") and not user_context.get("department_id"):
                _identity_warnings.append(
                    "Department not assigned to this user. "
                    "Department-based routing or approvals may not work."
                )
        elif not _identity_warnings:
            # user_context is minimal (only user_id + possibly fallback email)
            # This means the user wasn't found or identity is not configured
            _identity_warnings.append(
                "Could not retrieve full user identity data from the Identity Directory. "
                "The user may not exist in the DB, the org_id may not match, "
                "or the Identity Directory is not configured. "
                "Notifications to 'manager' may fail."
            )

        if _identity_warnings:
            logger.warning("[ProcessIdentity] Warnings: %s", _identity_warnings)
        
        # Merge user directory data into trigger_input so process nodes can access it
        enriched_trigger = self._ensure_dict(trigger_input or {})
        if user_context:
            # Add user context under a standard key that process nodes can reference
            enriched_trigger["_user_context"] = user_context
            # Also set common fields at top level if not already provided
            for key in ["manager_id", "department_id", "employee_id"]:
                if key not in enriched_trigger and user_context.get(key):
                    enriched_trigger[key] = user_context[key]
        # Always add identity warnings so downstream steps can report them
        if _identity_warnings:
            enriched_trigger["_identity_warnings"] = _identity_warnings
        
        # ── PERSIST enriched trigger to DB ────────────────────────
        # The execution was created with the RAW trigger_input (form data).
        # Now we've added _user_context and _identity_warnings which MUST
        # survive process resume (e.g. after approval).  Update the DB row.
        try:
            _exec_obj = self.exec_service.get_execution(str(execution.id))
            if _exec_obj:
                _exec_obj.trigger_input = enriched_trigger
                self.db.add(_exec_obj)
                self.db.commit()
                logger.info(
                    "[ProcessIdentity] Persisted enriched trigger_input (with _user_context) to execution %s",
                    str(execution.id)
                )
        except Exception as _persist_err:
            logger.warning("[ProcessIdentity] Failed to persist enriched trigger: %s", _persist_err)
        # ── END PERSIST ───────────────────────────────────────────
        
        # Build context with filtered tools (ensure dicts; DB may return JSON strings)
        context = ProcessContext(
            execution_id=str(execution.id),
            agent_id=agent_id,
            org_id=org_id,
            trigger_type=trigger_type,
            trigger_input=enriched_trigger,
            conversation_id=conversation_id,
            user_id=user_id,
            user_name=user_context.get('display_name') or (user_info.get('name') if user_info else None),
            user_email=user_context.get('email') or (user_info.get('email') if user_info else None),
            user_roles=user_info.get('roles', []) if user_info else [],
            user_groups=user_info.get('groups', []) if user_info else [],
            available_tool_ids=filtered_tool_ids,  # Filtered based on access control
            denied_tool_ids=denied_tool_ids,  # Track what's denied for error messages
            settings=self._ensure_dict(agent.process_settings or {}),
        )

        # تقرير واضح: ما المحفوظ في DB + ما المُستخدم في الـ execution (للتشخيص)
        self._log_process_execution_info(
            agent=agent,
            definition_from_db=self._ensure_dict(agent.process_definition),
            definition_normalized=definition_data,
            execution_id=str(execution.id),
            trigger_type=trigger_type,
            trigger_input_keys=list(_trigger.keys()),
            context_summary={"available_tool_ids_count": len(filtered_tool_ids)},
        )

        # Build dependencies (only with allowed tools)
        deps = await self._build_dependencies(agent, filtered_tool_ids)
        
        # Create engine
        engine = ProcessEngine(
            process_definition=process_def,
            context=context,
            dependencies=deps,
            execution_id=str(execution.id)
        )
        
        # Set checkpoint callback to persist to database
        async def checkpoint_callback(
            execution_id: str,
            checkpoint_data: Dict[str, Any],
            variables: Dict[str, Any],
            completed_nodes: List[str]
        ):
            self.exec_service.update_execution_state(
                execution_id=execution_id,
                checkpoint_data=checkpoint_data,
                variables=variables,
                completed_nodes=completed_nodes
            )
        
        engine.set_checkpoint_callback(checkpoint_callback)

        # =========================================================
        # AUDIT TRAIL: Persist step-by-step input/output (business-friendly reporting)
        # =========================================================
        def _json_safe(value: Any) -> Any:
            try:
                return json.loads(json.dumps(value, default=str))
            except Exception:
                try:
                    return str(value)
                except Exception:
                    return None

        def _truncate(value: Any, max_str: int = 6000, max_items: int = 80, max_depth: int = 4, _depth: int = 0) -> Any:
            if _depth >= max_depth:
                return "[truncated]"
            if isinstance(value, str):
                if len(value) <= max_str:
                    return value
                return value[:max_str] + "…"
            if isinstance(value, list):
                out = [_truncate(v, max_str=max_str, max_items=max_items, max_depth=max_depth, _depth=_depth + 1) for v in value[:max_items]]
                if len(value) > max_items:
                    out.append("…")
                return out
            if isinstance(value, dict):
                out = {}
                for i, (k, v) in enumerate(list(value.items())[:max_items]):
                    out[str(k)] = _truncate(v, max_str=max_str, max_items=max_items, max_depth=max_depth, _depth=_depth + 1)
                if len(value) > max_items:
                    out["…"] = f"+{len(value) - max_items} more"
                return out
            return value

        def _map_node_status(node_result: Any) -> str:
            try:
                s = getattr(node_result, "status", None)
                sv = getattr(s, "value", None) or str(s or "")
                sv = str(sv).strip().lower()
            except Exception:
                sv = ""
            return {
                "success": "completed",
                "skipped": "skipped",
                "waiting": "waiting",
                "failure": "failed",
                "failed": "failed",
            }.get(sv, "completed")

        def _build_node_input_data(node: Any, state: Any, ctx: Any) -> Dict[str, Any]:
            node_type = getattr(getattr(node, "type", None), "value", None) or str(getattr(node, "type", "")).strip()
            type_cfg = getattr(getattr(node, "config", None), "type_config", None) or {}
            out: Dict[str, Any] = {
                "node_type": node_type,
                "node_name": getattr(node, "name", None),
            }
            if node_type == "start":
                out["trigger_input"] = _truncate(_json_safe(getattr(ctx, "trigger_input", {}) or {}))
                return out
            # Store both the raw config and the resolved config (after interpolation)
            out["config"] = _truncate(_json_safe(type_cfg))
            try:
                resolved = state.interpolate_object(type_cfg) if state and type_cfg else {}
            except Exception:
                resolved = {}
            out["resolved"] = _truncate(_json_safe(resolved))
            return out

        def _build_node_output_data(node_result: Any) -> Dict[str, Any]:
            try:
                status_val = getattr(getattr(node_result, "status", None), "value", None) or str(getattr(node_result, "status", "") or "")
            except Exception:
                status_val = ""
            out: Dict[str, Any] = {
                "status": str(status_val),
                "output": _truncate(_json_safe(getattr(node_result, "output", None))),
                "variables_update": _truncate(_json_safe(getattr(node_result, "variables_update", {}) or {})),
            }
            waiting_for = getattr(node_result, "waiting_for", None)
            if waiting_for:
                out["waiting_for"] = str(waiting_for)
                out["waiting_metadata"] = _truncate(_json_safe(getattr(node_result, "waiting_metadata", None)))
            # Keep a short tail of logs for diagnostics (can be hidden in UI)
            try:
                logs = getattr(node_result, "logs", None) or []
                if isinstance(logs, list) and logs:
                    out["logs"] = _truncate(_json_safe(logs[-25:]), max_str=1200, max_items=50, max_depth=3)
            except Exception:
                pass
            # Include business-friendly error details for frontend display
            err = getattr(node_result, "error", None)
            if err:
                error_detail = {}
                biz = getattr(err, "business_message", None)
                if biz:
                    error_detail["business_message"] = str(biz)
                fixable = getattr(err, "is_user_fixable", None)
                if fixable is not None:
                    error_detail["is_user_fixable"] = bool(fixable)
                details = getattr(err, "details", None)
                if isinstance(details, dict) and details.get("action_hint"):
                    error_detail["action_hint"] = str(details["action_hint"])
                if error_detail:
                    out["error_detail"] = error_detail
            return out

        async def _on_node_start(node: Any, state: Any, context: Any, execution_order: int = 0):
            input_data = _build_node_input_data(node, state, context)
            try:
                variables_before = state.get_masked_variables() if state else {}
            except Exception:
                variables_before = {}
            node_exec = self.exec_service.create_node_execution(
                process_execution_id=str(execution.id),
                node_id=str(getattr(node, "id", "")),
                node_type=str(getattr(getattr(node, "type", None), "value", None) or getattr(node, "type", "") or ""),
                node_name=str(getattr(node, "name", "") or "") or None,
                execution_order=int(execution_order or 0),
                input_data=_json_safe(input_data) or {},
                variables_before=_json_safe(variables_before) or {},
            )
            return str(node_exec.id)

        async def _on_node_complete(node: Any, state: Any, context: Any, result: Any, execution_order: int = 0, handle: Any = None):
            if not handle:
                return
            status = _map_node_status(result)
            try:
                variables_after = state.get_masked_variables() if state else {}
            except Exception:
                variables_after = {}
            out_data = _build_node_output_data(result)
            err_message = None
            err_type = None
            try:
                if getattr(result, "error", None):
                    err_message = getattr(result.error, "message", None) or None
                    err_type = getattr(result.error, "code", None) or None
            except Exception:
                err_message = None
                err_type = None
            branch_taken = getattr(result, "next_node_id", None)
            try:
                self.exec_service.complete_node_execution(
                    node_execution_id=str(handle),
                    status=status,
                    output_data=_json_safe(out_data),
                    variables_after=_json_safe(variables_after) or {},
                    branch_taken=str(branch_taken) if branch_taken else None,
                    error_message=err_message,
                    error_type=err_type,
                    duration_ms=getattr(result, "duration_ms", None),
                    tokens_used=getattr(result, "tokens_used", None),
                )
            except Exception as e:
                logger.exception("Failed to persist node execution: %s", e)

        engine.set_node_execution_callbacks(
            on_node_start=_on_node_start,
            on_node_complete=_on_node_complete,
            initial_execution_order=0,
        )
        
        # Execute (async)
        try:
            result = await engine.execute(trigger_input)
            logger.info(
                "[ProcessApproval] engine result: execution_id=%s status=%s is_success=%s is_waiting=%s waiting_for=%s nodes_executed=%s",
                str(execution.id), getattr(result, 'status', None), result.is_success, result.is_waiting,
                getattr(result, 'waiting_for', None), getattr(result, 'nodes_executed', []),
            )
            
            # Update execution with result
            if result.is_success:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="completed"
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    output=result.output,
                    node_count_executed=result.node_count,
                    tokens_used=result.total_tokens_used
                )
            elif result.is_waiting:
                meta = getattr(result, 'waiting_metadata', None)
                logger.info(
                    "[ProcessApproval] execution waiting: execution_id=%s waiting_for=%s has_meta=%s has_approval_svc=%s",
                    str(execution.id), result.waiting_for, meta is not None, deps.approval_service is not None,
                )
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="waiting",
                    current_node_id=result.resume_node_id
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    checkpoint_data=engine.get_checkpoint()
                )
                # Create ProcessApprovalRequest in DB so it appears in Pending Approvals list
                if result.waiting_for == 'approval' and meta and deps.approval_service:
                    try:
                        org_id_val = meta.get('org_id') or str(getattr(execution, 'org_id', ''))
                        assignee_ids_val = meta.get('assignee_ids') or []
                        assignee_type_val = meta.get('assignee_type', 'user')
                        if not assignee_ids_val:
                            assignee_type_val = 'any'
                        logger.info(
                            "[ProcessApproval] creating approval in DB: execution_id=%s org_id=%s node_id=%s title=%s assignee_type=%s assignee_ids=%s",
                            str(execution.id), org_id_val, meta.get('node_id'), meta.get('title'), assignee_type_val, assignee_ids_val,
                        )
                        deadline_iso = meta.get('deadline')
                        timeout_hours = 24
                        if deadline_iso:
                            try:
                                from datetime import datetime as dt
                                end = dt.fromisoformat(deadline_iso.replace('Z', '+00:00'))
                                timeout_hours = max(1, (end - dt.now(end.tzinfo)).total_seconds() / 3600)
                            except Exception:
                                pass
                        create_result = await deps.approval_service.create_approval_request(
                            execution_id=str(execution.id),
                            org_id=org_id_val,
                            node_id=meta.get('node_id', result.resume_node_id or ''),
                            node_name=meta.get('node_name', 'Approval'),
                            title=meta.get('title', 'Approval Required'),
                            description=meta.get('description'),
                            review_data=meta.get('review_data') or {},
                            assignee_type=assignee_type_val,
                            assignee_ids=assignee_ids_val,
                            min_approvals=meta.get('min_approvals', 1),
                            priority=meta.get('priority', 'normal'),
                            timeout_hours=int(timeout_hours),
                            escalation_config=meta.get('escalation'),
                        )
                        logger.info(
                            "[ProcessApproval] approval created in DB: approval_id=%s execution_id=%s",
                            create_result.get('approval_id'), str(execution.id),
                        )
                    except Exception as e:
                        logger.exception("Failed to create approval request in DB: %s", e)
                else:
                    logger.info(
                        "[ProcessApproval] skip create: waiting_for=%s has_meta=%s has_approval_svc=%s",
                        result.waiting_for, meta is not None, deps.approval_service is not None,
                    )
            else:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="failed",
                    error_message=result.error.message if result.error else "Unknown error",
                    error_node_id=result.failed_node_id,
                    error_details=result.error.to_dict() if result.error else None
                )
            
        except Exception as e:
            logger.error(f"Process execution error: {e}")
            execution = self.exec_service.update_execution_status(
                str(execution.id),
                status="failed",
                error_message=str(e)
            )
        
        return self._to_response(execution)
    
    async def resume_execution(
        self,
        execution_id: str,
        user_id: str,
        user_info: Dict[str, Any] = None,
        resume_input: Dict[str, Any] = None
    ) -> ProcessExecutionResponse:
        """
        Resume a paused execution
        
        Security: User must have access to the agent and appropriate permissions
        """
        execution = self.exec_service.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        if execution.status not in ["waiting", "paused"]:
            raise ValueError(f"Execution cannot be resumed: {execution.status}")
        
        if not execution.checkpoint_data:
            raise ValueError("Execution has no checkpoint data")
        
        # Get agent
        agent = self.db.query(Agent).filter(
            Agent.id == execution.agent_id
        ).first()
        
        if not agent:
            raise ValueError("Agent not found")
        
        # =========================================================
        # SECURITY CHECK: User must have access or be owner
        # =========================================================
        owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
        is_owner = user_id == owner_id
        created_by_user = str(execution.created_by) == user_id
        
        if not is_owner and not created_by_user:
            # Check if user has EXECUTE_PROCESS permission
            user_roles = user_info.get('roles', []) if user_info else []
            user_groups = user_info.get('groups', []) if user_info else []
            
            perm_result = AccessControlService.check_agent_permission(
                user_id=user_id,
                user_role_ids=user_roles,
                user_group_ids=user_groups,
                agent_id=str(agent.id),
                org_id=str(agent.org_id),
                permission="execute_process"
            )
            
            if not perm_result.get("has_permission"):
                raise PermissionError("You don't have permission to resume this execution")
        
        # Parse process definition from snapshot (support JSON string from DB)
        raw_def = execution.process_definition_snapshot or agent.process_definition
        _def_source = "snapshot" if execution.process_definition_snapshot else "agent"
        logger.info(
            "[ProcessDebug] Resume: execution_id=%s, definition_source=%s, current_node=%s",
            execution_id, _def_source, getattr(execution, "current_node_id", None)
        )
        process_def = ProcessDefinition.from_dict(self._ensure_dict(raw_def))

        # ── Restore enriched trigger and user identity ──────────
        # trigger_input from DB should already contain _user_context
        # (persisted during start_execution).  Extract identity data
        # for the context fields (user_email, user_name) and re-enrich
        # if missing (belt-and-suspenders).
        #
        # IMPORTANT: The `user_id` passed here may be the APPROVER (manager),
        # NOT the original requester.  For identity re-enrichment and context
        # fields we MUST use execution.created_by (the original requester).
        _original_requester_id = str(execution.created_by) if execution.created_by else user_id
        
        _restored_trigger = self._ensure_dict(execution.trigger_input or {})
        _restored_uc = _restored_trigger.get("_user_context", {})
        
        # Determine user_email and user_name from restored _user_context
        # (which was enriched during start_execution for the ORIGINAL requester)
        _resume_email = _restored_uc.get("email") or ""
        _resume_name = _restored_uc.get("display_name") or ""
        
        # If _user_context was not persisted (old execution), re-enrich now
        # using the ORIGINAL requester's ID (not the approver)
        if not _restored_uc:
            logger.info(
                "[ProcessResume] _user_context missing from DB trigger_input — "
                "re-enriching for original requester %s (current user_id=%s)",
                _original_requester_id, user_id
            )
            try:
                _re_uc = _user_directory.enrich_process_context(
                    _original_requester_id, str(execution.org_id)
                )
                if _re_uc:
                    _restored_trigger["_user_context"] = _re_uc
                    _resume_email = _re_uc.get("email") or _resume_email
                    _resume_name = _re_uc.get("display_name") or _resume_name
            except Exception as _re_err:
                logger.warning("[ProcessResume] Re-enrichment failed: %s", _re_err)
            # Last-resort: if we still have no email, try to fetch from user DB
            if not _resume_email:
                try:
                    from database.services.user_service import UserService
                    _u_svc = UserService(self.db)
                    _orig_user = _u_svc.get_user(_original_requester_id)
                    if _orig_user and _orig_user.email:
                        _resume_email = _orig_user.email
                        _restored_trigger.setdefault("_user_context", {})["email"] = _resume_email
                        logger.info("[ProcessResume] Got email from user DB: %s", _resume_email)
                except Exception:
                    pass
        
        print(f"🔄 [ProcessResume] execution_id={execution_id}, "
              f"original_requester={_original_requester_id}, current_user={user_id}, "
              f"user_email={_resume_email}, "
              f"_user_context.email={_restored_trigger.get('_user_context', {}).get('email', '(none)')}")
        
        # Build context (ensure dicts; DB may return JSON strings)
        # IMPORTANT: user_id must be the ORIGINAL requester (who started the
        # process), not the approver.  "requester" references, notifications,
        # and identity data all relate to the person who submitted the form.
        context = ProcessContext(
            execution_id=str(execution.id),
            agent_id=str(execution.agent_id),
            org_id=str(execution.org_id),
            trigger_type=execution.trigger_type or "manual",
            trigger_input=_restored_trigger,
            user_id=_original_requester_id,
            user_email=_resume_email,
            user_name=_resume_name,
            user_roles=user_info.get('roles', []) if user_info else [],
            user_groups=user_info.get('groups', []) if user_info else [],
            available_tool_ids=agent.tool_ids or [],
            settings=self._ensure_dict(getattr(execution, "settings", None) or {}),
        )
        
        # Build dependencies
        deps = await self._build_dependencies(agent)
        
        # Create engine with restored state
        engine = ProcessEngine(
            process_definition=process_def,
            context=context,
            dependencies=deps,
            execution_id=str(execution.id)
        )

        # =========================================================
        # AUDIT TRAIL: Persist step-by-step input/output on resume
        # =========================================================
        existing_node_execs = []
        try:
            existing_node_execs = self.exec_service.get_node_executions(execution_id) or []
        except Exception:
            existing_node_execs = []

        waiting_node_exec_id = None
        waiting_node_prev_output = None
        try:
            waiting_node_id = getattr(execution, "current_node_id", None) or None
            if waiting_node_id:
                for n in reversed(existing_node_execs):
                    if getattr(n, "node_id", None) == waiting_node_id and getattr(n, "status", None) == "waiting":
                        waiting_node_exec_id = str(getattr(n, "id"))
                        try:
                            waiting_node_prev_output = getattr(n, "output_data", None)
                        except Exception:
                            waiting_node_prev_output = None
                        break
        except Exception:
            waiting_node_exec_id = None
            waiting_node_prev_output = None

        def _json_safe(value: Any) -> Any:
            try:
                return json.loads(json.dumps(value, default=str))
            except Exception:
                try:
                    return str(value)
                except Exception:
                    return None

        def _truncate(value: Any, max_str: int = 6000, max_items: int = 80, max_depth: int = 4, _depth: int = 0) -> Any:
            if _depth >= max_depth:
                return "[truncated]"
            if isinstance(value, str):
                if len(value) <= max_str:
                    return value
                return value[:max_str] + "…"
            if isinstance(value, list):
                out = [_truncate(v, max_str=max_str, max_items=max_items, max_depth=max_depth, _depth=_depth + 1) for v in value[:max_items]]
                if len(value) > max_items:
                    out.append("…")
                return out
            if isinstance(value, dict):
                out = {}
                for i, (k, v) in enumerate(list(value.items())[:max_items]):
                    out[str(k)] = _truncate(v, max_str=max_str, max_items=max_items, max_depth=max_depth, _depth=_depth + 1)
                if len(value) > max_items:
                    out["…"] = f"+{len(value) - max_items} more"
                return out
            return value

        def _map_node_status(node_result: Any) -> str:
            try:
                s = getattr(node_result, "status", None)
                sv = getattr(s, "value", None) or str(s or "")
                sv = str(sv).strip().lower()
            except Exception:
                sv = ""
            return {
                "success": "completed",
                "skipped": "skipped",
                "waiting": "waiting",
                "failure": "failed",
                "failed": "failed",
            }.get(sv, "completed")

        def _build_node_input_data(node: Any, state: Any, ctx: Any) -> Dict[str, Any]:
            node_type = getattr(getattr(node, "type", None), "value", None) or str(getattr(node, "type", "")).strip()
            type_cfg = getattr(getattr(node, "config", None), "type_config", None) or {}
            out: Dict[str, Any] = {"node_type": node_type, "node_name": getattr(node, "name", None)}
            if node_type == "start":
                out["trigger_input"] = _truncate(_json_safe(getattr(ctx, "trigger_input", {}) or {}))
                return out
            out["config"] = _truncate(_json_safe(type_cfg))
            try:
                resolved = state.interpolate_object(type_cfg) if state and type_cfg else {}
            except Exception:
                resolved = {}
            out["resolved"] = _truncate(_json_safe(resolved))
            return out

        def _build_node_output_data(node_result: Any) -> Dict[str, Any]:
            try:
                status_val = getattr(getattr(node_result, "status", None), "value", None) or str(getattr(node_result, "status", "") or "")
            except Exception:
                status_val = ""
            out: Dict[str, Any] = {
                "status": str(status_val),
                "output": _truncate(_json_safe(getattr(node_result, "output", None))),
                "variables_update": _truncate(_json_safe(getattr(node_result, "variables_update", {}) or {})),
            }
            waiting_for = getattr(node_result, "waiting_for", None)
            if waiting_for:
                out["waiting_for"] = str(waiting_for)
                out["waiting_metadata"] = _truncate(_json_safe(getattr(node_result, "waiting_metadata", None)))
            # Include business-friendly error details for frontend display
            err = getattr(node_result, "error", None)
            if err:
                error_detail = {}
                biz = getattr(err, "business_message", None)
                if biz:
                    error_detail["business_message"] = str(biz)
                fixable = getattr(err, "is_user_fixable", None)
                if fixable is not None:
                    error_detail["is_user_fixable"] = bool(fixable)
                details = getattr(err, "details", None)
                if isinstance(details, dict) and details.get("action_hint"):
                    error_detail["action_hint"] = str(details["action_hint"])
                if error_detail:
                    out["error_detail"] = error_detail
            return out

        async def _on_node_start(node: Any, state: Any, context: Any, execution_order: int = 0):
            input_data = _build_node_input_data(node, state, context)
            try:
                variables_before = state.get_masked_variables() if state else {}
            except Exception:
                variables_before = {}
            node_exec = self.exec_service.create_node_execution(
                process_execution_id=str(execution.id),
                node_id=str(getattr(node, "id", "")),
                node_type=str(getattr(getattr(node, "type", None), "value", None) or getattr(node, "type", "") or ""),
                node_name=str(getattr(node, "name", "") or "") or None,
                execution_order=int(execution_order or 0),
                input_data=_json_safe(input_data) or {},
                variables_before=_json_safe(variables_before) or {},
            )
            return str(node_exec.id)

        async def _on_node_complete(node: Any, state: Any, context: Any, result: Any, execution_order: int = 0, handle: Any = None):
            if not handle:
                return
            status = _map_node_status(result)
            try:
                variables_after = state.get_masked_variables() if state else {}
            except Exception:
                variables_after = {}
            out_data = _build_node_output_data(result)
            err_message = None
            err_type = None
            try:
                if getattr(result, "error", None):
                    err_message = getattr(result.error, "message", None) or None
                    err_type = getattr(result.error, "code", None) or None
            except Exception:
                err_message = None
                err_type = None
            branch_taken = getattr(result, "next_node_id", None)
            try:
                self.exec_service.complete_node_execution(
                    node_execution_id=str(handle),
                    status=status,
                    output_data=_json_safe(out_data),
                    variables_after=_json_safe(variables_after) or {},
                    branch_taken=str(branch_taken) if branch_taken else None,
                    error_message=err_message,
                    error_type=err_type,
                    duration_ms=getattr(result, "duration_ms", None),
                    tokens_used=getattr(result, "tokens_used", None),
                )
            except Exception as e:
                logger.exception("Failed to persist node execution (resume): %s", e)

        engine.set_node_execution_callbacks(
            on_node_start=_on_node_start,
            on_node_complete=_on_node_complete,
            initial_execution_order=len(existing_node_execs),
        )
        
        # Update status
        execution = self.exec_service.update_execution_status(
            str(execution.id),
            status="running"
        )
        
        # Resume execution
        try:
            result = await engine.resume(
                execution.checkpoint_data,
                resume_input
            )

            # Mark the previously waiting node execution as completed (the decision is applied on resume)
            if waiting_node_exec_id:
                try:
                    self.exec_service.complete_node_execution(
                        node_execution_id=str(waiting_node_exec_id),
                        status="completed",
                        output_data=_json_safe({
                            "waiting": waiting_node_prev_output,
                            "resume_input": resume_input or {}
                        }),
                        variables_after=_json_safe(result.final_variables if getattr(result, "final_variables", None) else {}),
                    )
                except Exception:
                    pass
            
            # Update execution with result
            if result.is_success:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="completed"
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    output=result.output,
                    node_count_executed=result.node_count
                )
            elif result.is_waiting:
                meta = getattr(result, 'waiting_metadata', None)
                logger.info(
                    "[ProcessApproval] resume waiting: execution_id=%s waiting_for=%s has_meta=%s",
                    str(execution.id), result.waiting_for, meta is not None,
                )
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="waiting",
                    current_node_id=result.resume_node_id
                )
                execution = self.exec_service.update_execution_state(
                    str(execution.id),
                    variables=result.final_variables,
                    completed_nodes=result.nodes_executed,
                    checkpoint_data=engine.get_checkpoint()
                )
                if result.waiting_for == 'approval' and meta and deps.approval_service:
                    try:
                        org_id_val = meta.get('org_id') or str(getattr(execution, 'org_id', ''))
                        assignee_ids_val = meta.get('assignee_ids') or []
                        assignee_type_val = 'any' if not assignee_ids_val else meta.get('assignee_type', 'user')
                        logger.info("[ProcessApproval] creating approval (resume): execution_id=%s org_id=%s assignee_type=%s", str(execution.id), org_id_val, assignee_type_val)
                        deadline_iso = meta.get('deadline')
                        timeout_hours = 24
                        if deadline_iso:
                            try:
                                from datetime import datetime as dt
                                end = dt.fromisoformat(deadline_iso.replace('Z', '+00:00'))
                                timeout_hours = max(1, (end - dt.now(end.tzinfo)).total_seconds() / 3600)
                            except Exception:
                                pass
                        create_result = await deps.approval_service.create_approval_request(
                            execution_id=str(execution.id),
                            org_id=org_id_val,
                            node_id=meta.get('node_id', result.resume_node_id or ''),
                            node_name=meta.get('node_name', 'Approval'),
                            title=meta.get('title', 'Approval Required'),
                            description=meta.get('description'),
                            review_data=meta.get('review_data') or {},
                            assignee_type=assignee_type_val,
                            assignee_ids=assignee_ids_val,
                            min_approvals=meta.get('min_approvals', 1),
                            priority=meta.get('priority', 'normal'),
                            timeout_hours=int(timeout_hours),
                            escalation_config=meta.get('escalation'),
                        )
                        logger.info("[ProcessApproval] approval created (resume): approval_id=%s", create_result.get('approval_id'))
                    except Exception as e:
                        logger.exception("Failed to create approval request in DB (resume): %s", e)
            else:
                execution = self.exec_service.update_execution_status(
                    str(execution.id),
                    status="failed",
                    error_message=result.error.message if result.error else "Unknown error",
                    error_node_id=result.failed_node_id
                )
                
        except Exception as e:
            logger.error(f"Resume error: {e}")
            execution = self.exec_service.update_execution_status(
                str(execution.id),
                status="failed",
                error_message=str(e)
            )
        
        return self._to_response(execution)
    
    async def cancel_execution(
        self,
        execution_id: str,
        user_id: str,
        user_info: Dict[str, Any] = None,
        reason: str = None
    ) -> ProcessExecutionResponse:
        """
        Cancel an execution
        
        Security: User must be owner, execution creator, or have cancel_executions permission
        """
        execution = self.exec_service.get_execution(execution_id)
        if not execution:
            raise ValueError(f"Execution not found: {execution_id}")
        
        if execution.status in ["completed", "failed", "cancelled"]:
            raise ValueError(f"Execution already terminated: {execution.status}")
        
        # =========================================================
        # SECURITY CHECK: User must have permission to cancel
        # =========================================================
        agent = self.db.query(Agent).filter(
            Agent.id == execution.agent_id
        ).first()
        
        if agent:
            owner_id = str(agent.owner_id) if agent.owner_id else str(agent.created_by)
            is_owner = user_id == owner_id
            created_by_user = str(execution.created_by) == user_id
            
            if not is_owner and not created_by_user:
                user_roles = user_info.get('roles', []) if user_info else []
                user_groups = user_info.get('groups', []) if user_info else []
                
                perm_result = AccessControlService.check_agent_permission(
                    user_id=user_id,
                    user_role_ids=user_roles,
                    user_group_ids=user_groups,
                    agent_id=str(agent.id),
                    org_id=str(agent.org_id),
                    permission="cancel_executions"
                )
                
                if not perm_result.get("has_permission"):
                    raise PermissionError("You don't have permission to cancel this execution")
        
        execution = self.exec_service.update_execution_status(
            execution_id,
            status="cancelled",
            error_message=reason or f"Cancelled by user {user_id}"
        )
        
        # Log execution_id only for correlation; avoid PII (user_id is UUID, acceptable for audit)
        logger.info("Execution %s cancelled", execution_id)
        
        return self._to_response(execution)
    
    def get_execution(
        self,
        execution_id: str,
        org_id: str
    ) -> ProcessExecutionResponse:
        """Get execution details"""
        execution = self.exec_service.get_execution(execution_id)
        if not execution or str(execution.org_id) != org_id:
            raise ValueError(f"Execution not found: {execution_id}")
        
        return self._to_response(execution)
    
    def list_executions(
        self,
        org_id: str,
        agent_id: str = None,
        status: str = None,
        created_by: str = None,
        limit: int = 50,
        offset: int = 0
    ) -> tuple:
        """List executions"""
        executions, total = self.exec_service.list_executions(
            org_id=org_id,
            agent_id=agent_id,
            status=status,
            created_by=created_by,
            limit=limit,
            offset=offset
        )
        
        return [self._to_response(e) for e in executions], total
    
    # =========================================================================
    # APPROVAL METHODS
    # =========================================================================
    
    async def handle_approval_decision(
        self,
        approval_id: str,
        user_id: str,
        decision: str,
        comments: str = None,
        decision_data: Dict[str, Any] = None,
        user_info: Dict[str, Any] = None
    ) -> ApprovalRequestResponse:
        """Handle approval decision and resume process if needed"""
        approval = self.exec_service.get_approval_request(approval_id)
        if not approval:
            raise ValueError(f"Approval not found: {approval_id}")
        
        # Record decision
        approval = self.exec_service.decide_approval(
            approval_id=approval_id,
            decision=decision,
            decided_by=user_id,
            comments=comments,
            decision_data=decision_data
        )
        
        # If approved, resume the process
        if decision == "approved":
            try:
                await self.resume_execution(
                    str(approval.process_execution_id),
                    user_id,
                    user_info=user_info,
                    resume_input={
                        'approval_decision': decision,
                        'approval_comments': comments,
                        'approval_data': decision_data or {}
                    }
                )
            except Exception as e:
                logger.error(f"Failed to resume after approval: {e}")
        
        return self._approval_to_response(approval)
    
    def get_pending_approvals(
        self,
        user_id: str,
        org_id: str,
        user_role_ids: List[str] = None,
        user_group_ids: List[str] = None,
        user_email: str = None,
        include_all_for_org_admin: bool = False
    ) -> List[ApprovalRequestResponse]:
        """Get pending approvals for user. If include_all_for_org_admin, return all pending in org (for admin/superadmin testing)."""
        logger.info(
            "[ProcessApproval] list requested: user_id=%s org_id=%s user_role_ids_count=%s user_group_ids_count=%s include_all_for_admin=%s",
            user_id, org_id, len(user_role_ids or []), len(user_group_ids or []), include_all_for_org_admin,
        )
        # Apply any due escalations so newly-added escalation recipients see tasks immediately.
        try:
            escalated = self.exec_service.apply_due_approval_escalations(org_id)
            if escalated:
                logger.info("[ProcessApproval] applied due escalations: count=%s org_id=%s", escalated, org_id)
        except Exception as e:
            logger.warning("[ProcessApproval] escalation check failed (non-blocking): %s", e)
        approvals = self.exec_service.get_pending_approvals_for_user(
            user_id=user_id,
            org_id=org_id,
            user_role_ids=user_role_ids,
            user_group_ids=user_group_ids,
            user_email=user_email,
            include_all_for_org_admin=include_all_for_org_admin
        )
        out = [self._approval_to_response(a) for a in approvals]
        logger.info("[ProcessApproval] list response: count=%s approval_ids=%s", len(out), [a.id for a in approvals])
        return out
    
    # =========================================================================
    # STATISTICS
    # =========================================================================
    
    def get_stats(
        self,
        org_id: str,
        agent_id: str = None,
        days: int = 30
    ) -> ProcessStatsResponse:
        """Get execution statistics with user-friendly formatting"""
        stats = self.exec_service.get_execution_stats(
            org_id=org_id,
            agent_id=agent_id,
            days=days
        )
        
        # Format for users
        avg_ms = stats.get('avg_duration_ms', 0)
        avg_display = self._format_duration(avg_ms / 1000) if avg_ms else "N/A"
        
        return ProcessStatsResponse(
            total_executions=stats.get('total_executions', 0),
            by_status=stats.get('by_status', {}),
            success_rate=stats.get('success_rate', 0),
            average_duration_display=avg_display,
            time_period=f"Last {days} day{'s' if days != 1 else ''}"
        )
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================

    def _log_process_execution_info(
        self,
        agent: Agent,
        definition_from_db: Dict[str, Any],
        definition_normalized: Dict[str, Any],
        execution_id: str,
        trigger_type: str,
        trigger_input_keys: List[str],
        context_summary: Dict[str, Any],
    ) -> None:
        """
        Log a clear report: what was loaded from DB (process data) and what is used for execution.
        Use for debugging: grep '[ProcessExecutionInfo]' in logs.
        """
        nodes_from_db = definition_from_db.get("nodes") or []
        nodes_norm = definition_normalized.get("nodes") or []
        process_settings = self._ensure_dict(agent.process_settings or {})

        logger.info("[ProcessExecutionInfo] ========== ما المحفوظ في الـ DB (Process من الـ Agent) ==========")
        logger.info(
            "[ProcessExecutionInfo] agent_id = %s  (معرّف الـ Agent في الـ DB)",
            str(agent.id),
        )
        logger.info(
            "[ProcessExecutionInfo] agent.name = %s  (اسم الـ workflow)",
            getattr(agent, "name", None),
        )
        logger.info(
            "[ProcessExecutionInfo] process_definition (خام من DB) = تعريف الـ workflow: nodes + edges. نوع العمود: %s، عدد الـ nodes: %s",
            type(agent.process_definition).__name__,
            len(nodes_from_db),
        )
        for i, n in enumerate(nodes_from_db):
            cfg = n.get("config") or {}
            tc = cfg.get("type_config") or cfg
            logger.info(
                "[ProcessExecutionInfo]   node[%s] من DB: id=%s, type=%s | approvers=%s | assignee_ids=%s | expression=%s | field=%s",
                i, n.get("id"), n.get("type"),
                tc.get("approvers") if isinstance(tc, dict) else None,
                tc.get("assignee_ids") if isinstance(tc, dict) else None,
                tc.get("expression") if isinstance(tc, dict) else None,
                tc.get("field") if isinstance(tc, dict) else None,
            )
        logger.info(
            "[ProcessExecutionInfo] process_settings (من DB) = إعدادات الـ process (timeout, retry, etc.). المفاتيح: %s",
            list(process_settings.keys()),
        )
        logger.info(
            "[ProcessExecutionInfo] agent.tool_ids (من DB) = أدوات الـ agent المسموح بها. العدد: %s",
            len(agent.tool_ids or []),
        )

        logger.info("[ProcessExecutionInfo] ========== ما تحتاجه الـ Execution (المعلومات المُرسلة/المُستخدمة) ==========")
        logger.info(
            "[ProcessExecutionInfo] execution_id = %s  (معرّف تشغيل هذه الـ run؛ يُحفظ في DB ويُستخدم للمتابعة والـ resume)",
            execution_id,
        )
        logger.info(
            "[ProcessExecutionInfo] agent_id = %s  (نفس الـ agent اللي من DB)",
            str(agent.id),
        )
        logger.info(
            "[ProcessExecutionInfo] org_id = %s  (معرّف المنظمة)",
            str(agent.org_id),
        )
        logger.info(
            "[ProcessExecutionInfo] trigger_type = %s  (كيف تم تشغيل الـ process: manual, form, webhook, ...)",
            trigger_type,
        )
        logger.info(
            "[ProcessExecutionInfo] trigger_input (المدخلات) = البيانات اللي أرسلها المستخدم (form أو API). المفاتيح فقط: %s  (القيم لا تُسجّل لأمان البيانات)",
            trigger_input_keys,
        )
        logger.info(
            "[ProcessExecutionInfo] process_definition_snapshot = نسخة الـ definition المستخدمة في هذه الـ run (بعد التطبيع). عدد الـ nodes بعد التطبيع: %s",
            len(nodes_norm),
        )
        for i, nn in enumerate(nodes_norm):
            nc = nn.get("config") or {}
            ntc = nc.get("type_config") or nc
            logger.info(
                "[ProcessExecutionInfo]   norm_node[%s] للـ execution: id=%s, type=%s | assignee_ids=%s | expression=%s | true_branch=%s | false_branch=%s",
                i, nn.get("id"), nn.get("type"),
                ntc.get("assignee_ids") if isinstance(ntc, dict) else None,
                ntc.get("expression") if isinstance(ntc, dict) else None,
                ntc.get("true_branch") if isinstance(ntc, dict) else None,
                ntc.get("false_branch") if isinstance(ntc, dict) else None,
            )
        logger.info(
            "[ProcessExecutionInfo] context (ملخص) = execution_id, agent_id, org_id, user_id, trigger_input, available_tool_ids, settings. available_tool_ids count=%s",
            context_summary.get("available_tool_ids_count", 0),
        )
        logger.info("[ProcessExecutionInfo] ========== نهاية التقرير ==========")

    async def _build_dependencies(
        self, 
        agent: Agent, 
        allowed_tool_ids: List[str] = None
    ) -> ExecutorDependencies:
        """
        Build executor dependencies from agent config
        
        Provides all services needed by node executors:
        - LLM for AI tasks
        - Tools for tool_call nodes (filtered by access control)
        - Notification service
        - Approval service
        
        Args:
            agent: Agent model
            allowed_tool_ids: Tools allowed for this user (after access control filtering)
        """
        llm = None
        tools = {}
        
        # Get LLM
        if self.llm_registry and agent.model_id:
            llm_config = self.llm_registry.get(agent.model_id)
            if llm_config:
                llm = LLMFactory.create(llm_config)
        
        # Use allowed tools list if provided, otherwise use all agent tools
        tool_ids_to_load = allowed_tool_ids if allowed_tool_ids is not None else (agent.tool_ids or [])
        
        # Get tools (only allowed ones)
        from database.models import Tool
        for tool_id in tool_ids_to_load:
            tool_record = self.db.query(Tool).filter(
                Tool.id == uuid.UUID(tool_id)
            ).first()
            
            if tool_record:
                try:
                    tool_config = ToolConfig(
                        type=tool_record.type,
                        name=tool_record.name,
                        config=tool_record.config or {},
                        enabled=tool_record.is_enabled,
                        requires_approval=tool_record.requires_approval
                    )
                    tool = ToolRegistry.create(tool_config)
                    tools[tool_id] = tool
                except Exception as e:
                    logger.warning(f"Failed to load tool {tool_id}: {e}")
        
        # Build notification service (use platform EmailService = same as reset password, MFA)
        try:
            from core.security import EmailService as PlatformEmailService
            notification_service = NotificationService(
                db=self.db,
                platform_email_service=PlatformEmailService
            )
        except ImportError:
            notification_service = NotificationService(db=self.db)
        
        # Build approval service
        approval_service = ApprovalService(
            db=self.db,
            exec_service=self.exec_service
        )
        
        return ExecutorDependencies(
            llm=llm,
            tools=tools,
            notification_service=notification_service,
            approval_service=approval_service,
            user_directory=_user_directory,
        )
    
    def _to_response(self, execution) -> ProcessExecutionResponse:
        """Convert execution model to response with business-friendly format"""
        from .schemas import StatusInfo, ErrorInfo
        from core.process.messages import get_status_info, sanitize_for_user
        
        duration = None
        duration_display = None
        if execution.started_at and execution.completed_at:
            duration = (execution.completed_at - execution.started_at).total_seconds()
            duration_display = self._format_duration(duration)
        elif execution.started_at:
            duration = (datetime.utcnow() - execution.started_at).total_seconds()
            duration_display = self._format_duration(duration)
        
        # Get user-friendly status
        status_data = get_status_info(execution.status)
        status_info = StatusInfo(**status_data)
        
        # Format error for user
        error_info = None
        if execution.error_message:
            error_info = ErrorInfo(
                title="Error Occurred",
                message=sanitize_for_user(execution.error_message),
                can_retry=execution.status in ["failed", "timed_out"]
            )
        
        return ProcessExecutionResponse(
            id=str(execution.id),
            agent_id=str(execution.agent_id),
            org_id=str(execution.org_id),
            execution_number=execution.execution_number,
            correlation_id=execution.correlation_id,
            status=execution.status,
            status_info=status_info,
            current_step=execution.current_node_id,  # TODO: Get display name
            completed_steps=execution.completed_nodes or [],
            trigger_input=execution.trigger_input or {},
            output=execution.output,
            error=error_info,
            can_resume=execution.can_resume and execution.status in ["waiting", "paused"],
            started_at=execution.started_at,
            completed_at=execution.completed_at,
            duration_display=duration_display,
            node_count_executed=execution.node_count_executed or 0,
            created_at=execution.created_at,
            created_by=str(execution.created_by)
        )
    
    def _format_duration(self, seconds: float) -> str:
        """Format duration for users"""
        if seconds < 1:
            return "Less than a second"
        elif seconds < 60:
            return f"{int(seconds)} second{'s' if seconds != 1 else ''}"
        elif seconds < 3600:
            minutes = int(seconds / 60)
            return f"{minutes} minute{'s' if minutes != 1 else ''}"
        else:
            hours = int(seconds / 3600)
            return f"{hours} hour{'s' if hours != 1 else ''}"
    
    def _approval_to_response(self, approval) -> ApprovalRequestResponse:
        """Convert approval model to response"""
        return ApprovalRequestResponse(
            id=str(approval.id),
            process_execution_id=str(approval.process_execution_id),
            node_id=approval.node_id,
            node_name=approval.node_name,
            status=approval.status,
            title=approval.title,
            description=approval.description,
            review_data=approval.review_data or {},
            priority=approval.priority,
            assignee_type=approval.assignee_type,
            assigned_user_ids=approval.assigned_user_ids or [],
            assigned_role_ids=approval.assigned_role_ids or [],
            assigned_group_ids=getattr(approval, 'assigned_group_ids', None) or [],
            min_approvals=approval.min_approvals,
            approval_count=approval.approval_count,
            decided_by=str(approval.decided_by) if approval.decided_by else None,
            decided_at=approval.decided_at,
            decision=approval.decision,
            decision_comments=approval.decision_comments,
            deadline_at=approval.deadline_at,
            created_at=approval.created_at
        )
    
    def _normalize_visual_builder_definition(
        self, 
        data: Dict[str, Any], 
        agent_name: str = "Workflow"
    ) -> Dict[str, Any]:
        """
        Normalize process definition from Visual Builder format to engine format.
        - Builder uses edges with from/to/type; engine expects id/source/target/edge_type.
        - Builder uses node type 'trigger'/'form'; engine expects 'start'.
        - Builder node.config is flat; engine expects config.type_config for type-specific fields.
        """
        data = data.copy()
        if not data.get('name'):
            data['name'] = agent_name
        
        # Normalize edges: from/to/type -> id/source/target/edge_type
        raw_edges = data.get('edges') or data.get('connections') or []
        edges = []
        for i, e in enumerate(raw_edges):
            source = e.get('from') or e.get('source')
            target = e.get('to') or e.get('target')
            if not source or not target:
                continue
            edge_type = e.get('type', 'default')
            # Keep 'yes'/'no' for condition nodes so true_branch/false_branch get set
            edges.append({
                'id': e.get('id') or f"edge_{source}_{target}_{i}",
                'source': source,
                'target': target,
                'edge_type': edge_type,
                'condition': e.get('condition'),
                'label': e.get('label'),
            })
        data['edges'] = edges

        # Normalize and de-duplicate START semantics (Visual Builder may include both Trigger + Form shapes).
        # Engine schema requires exactly one START node.
        nodes = data.get('nodes') or []
        start_like_types = {'trigger', 'form', 'schedule', 'webhook', 'start'}

        def _node_type_lower(nn: Any) -> str:
            try:
                return str((nn or {}).get('type') or '').strip().lower()
            except Exception:
                return ''

        def _extract_fields_from_node(nn: Any) -> List[Dict[str, Any]]:
            if not nn or not isinstance(nn, dict):
                return []
            cfg = nn.get('config') or {}
            if not isinstance(cfg, dict):
                return []
            type_cfg = cfg.get('type_config') if isinstance(cfg.get('type_config'), dict) else None
            raw_fields = (type_cfg or cfg).get('fields') if isinstance((type_cfg or cfg), dict) else None
            return raw_fields if isinstance(raw_fields, list) else []

        def _first_node_by_type(t: str) -> Optional[Dict[str, Any]]:
            tl = str(t or '').strip().lower()
            for nn in nodes:
                if _node_type_lower(nn) == tl:
                    return nn
            return None

        start_node = (
            _first_node_by_type('trigger')
            or _first_node_by_type('start')
            or _first_node_by_type('schedule')
            or _first_node_by_type('webhook')
            or _first_node_by_type('form')
        )
        start_node_id = (start_node or {}).get('id')

        # If a separate Form shape holds the input fields, merge them into the chosen start node.
        form_with_fields = next(
            (nn for nn in nodes if _node_type_lower(nn) == 'form' and len(_extract_fields_from_node(nn)) > 0),
            None
        )
        if start_node and start_node_id and form_with_fields and form_with_fields.get('id') != start_node_id:
            start_fields = _extract_fields_from_node(start_node)
            form_fields = _extract_fields_from_node(form_with_fields)
            if not start_fields and form_fields:
                cfg = start_node.get('config') or {}
                if not isinstance(cfg, dict):
                    cfg = {}
                if isinstance(cfg.get('type_config'), dict):
                    cfg['type_config'] = dict(cfg['type_config'])
                    cfg['type_config'].setdefault('fields', form_fields)
                else:
                    cfg.setdefault('fields', form_fields)
                start_node['config'] = cfg

        # Remove extra start-like nodes, and rewire edges across them (usually trigger -> form -> next).
        removed_ids = set()
        if start_node_id:
            for nn in list(nodes):
                nt = _node_type_lower(nn)
                nid = (nn or {}).get('id')
                if nid and nid != start_node_id and nt in start_like_types:
                    removed_ids.add(nid)

        if removed_ids:
            for rid in list(removed_ids):
                incoming = [e for e in edges if e.get('target') == rid]
                outgoing = [e for e in edges if e.get('source') == rid]
                bridged = []
                for inc in incoming:
                    for out in outgoing:
                        src = inc.get('source')
                        tgt = out.get('target')
                        if not src or not tgt:
                            continue
                        bridged.append({
                            'id': f"edge_{src}_{tgt}_{len(bridged)}",
                            'source': src,
                            'target': tgt,
                            'edge_type': out.get('edge_type', 'default'),
                            'condition': out.get('condition') if out.get('condition') is not None else inc.get('condition'),
                            'label': out.get('label') if out.get('label') is not None else inc.get('label'),
                        })

                edges = [e for e in edges if e.get('source') != rid and e.get('target') != rid]
                edges.extend(bridged)

            # Dedupe edges (keep first occurrence)
            seen = set()
            deduped = []
            for e in edges:
                k = (e.get('source'), e.get('target'), e.get('edge_type', 'default'))
                if not k[0] or not k[1]:
                    continue
                if k in seen:
                    continue
                seen.add(k)
                deduped.append(e)
            edges = deduped

            nodes = [nn for nn in nodes if (nn or {}).get('id') not in removed_ids]
            data['nodes'] = nodes
            data['edges'] = edges

        # Start node fields are the canonical "inputs" for file upload field matching.
        nodes = data.get('nodes') or []
        start_fields = _extract_fields_from_node(start_node) if start_node else []
        file_field_keys: List[str] = []
        file_field_labels: Dict[str, str] = {}
        for f in start_fields:
            if not isinstance(f, dict):
                continue
            k = str(f.get('name') or f.get('id') or '').strip()
            t = str(f.get('type') or '').strip().lower()
            if not k:
                continue
            if t == 'file':
                file_field_keys.append(k)
                file_field_labels[k] = str(f.get('label') or '').strip()

        def _norm_token(s: Any) -> str:
            s = str(s or '').strip().lower()
            return re.sub(r'[^a-z0-9]+', '', s)

        def _best_file_field(wanted: str) -> str:
            w = str(wanted or '').strip()
            if not w:
                return file_field_keys[0] if len(file_field_keys) == 1 else ''
            if w in file_field_keys:
                return w
            wn = _norm_token(w)
            if not wn:
                return file_field_keys[0] if len(file_field_keys) == 1 else ''
            for k in file_field_keys:
                if _norm_token(k) == wn:
                    return k
            for k in file_field_keys:
                lab = file_field_labels.get(k) or ''
                if lab and _norm_token(lab) == wn:
                    return k
            return file_field_keys[0] if len(file_field_keys) == 1 else ''
        
        # Build lookup: from (source, edge_type) -> target for condition branching
        edges_by_source = {}
        for e in edges:
            src = e['source']
            if src not in edges_by_source:
                edges_by_source[src] = {}
            edges_by_source[src][e.get('edge_type', 'default')] = e['target']

        _dbg_cond = str(os.getenv("PROCESS_DEBUG_CONDITIONS", "")).strip().lower() in ("1", "true", "yes", "y", "on") or \
            str(os.getenv("PROCESS_DEBUG", "")).strip().lower() in ("1", "true", "yes", "y", "on")
        
        # Normalize nodes: type trigger/form -> start; wrap config in type_config
        nodes = data.get('nodes') or []
        normalized_nodes = []
        for n in nodes:
            node = dict(n)
            node_type = (node.get('type') or '').strip().lower()
            if node_type in ('trigger', 'form', 'schedule', 'webhook'):
                node['type'] = 'start'
            elif node_type in ('ai', 'ai_step'):
                # Decide engine type based on AI mode
                ai_mode = (n.get('config') or {}).get('aiMode', 'custom')
                if ai_mode == 'create_doc':
                    node['type'] = 'file_operation'
                else:
                    # extract_file, analyze, generate, classify, batch_files, custom
                    # all go through ai_task so the LLM parses into structured JSON
                    node['type'] = 'ai_task'
            elif node_type == 'tool':
                node['type'] = 'tool_call'
            elif node_type == 'read_document':
                # Legacy Read File → file_operation (extract_text)
                node['type'] = 'file_operation'
            elif node_type == 'create_document':
                # Legacy Create Document → file_operation (generate_document)
                node['type'] = 'file_operation'
            elif node_type == 'calculate':
                # New shape: Calculate → transform
                node['type'] = 'transform'
            elif node_type == 'parallel':
                # Run in Parallel — engine already supports parallel type
                node['type'] = 'parallel'
            elif node_type == 'call_process':
                # Call Process — maps to sub_process engine type
                node['type'] = 'sub_process'
            elif node_type == 'action':
                node['type'] = 'ai_task'  # default; may be remapped based on actionType
            config = node.get('config')
            if config is not None and isinstance(config, dict) and 'type_config' not in config:
                config = dict(config)
            else:
                config = (config or {}).copy() if isinstance(config, dict) else {}
            if 'type_config' not in config:
                config = {'type_config': config}
            type_cfg = config.get('type_config') or {}
            # Condition node: build expression from rules[] or legacy field/operator/value
            if node_type == 'condition':
                rules = type_cfg.get('rules')
                if not isinstance(rules, list) or len(rules) == 0:
                    legacy_field = type_cfg.get('field') or ''
                    rules = [{'field': legacy_field, 'operator': type_cfg.get('operator') or 'equals', 'value': type_cfg.get('value')}] if legacy_field else []
                connectors = type_cfg.get('connectors')
                if not isinstance(connectors, list):
                    connectors = []
                # Backward compat: if old global logic exists, expand to connector list
                legacy_logic = str(type_cfg.get('logic') or 'and').strip().lower()
                if legacy_logic not in ('and', 'or'):
                    legacy_logic = 'and'

                existing_expr = str(type_cfg.get('expression') or '').strip()

                def _build_rule_expr(r):
                    rf = str(r.get('field') or '').strip()
                    if not rf:
                        return None
                    ro = str(r.get('operator') or 'equals').strip()
                    rv = r.get('value')
                    try:
                        rv_num = float(rv) if rv is not None and str(rv).strip() != '' else None
                    except (TypeError, ValueError):
                        rv_num = None
                    rv_repr = rv_num if rv_num is not None else repr(rv)
                    if ro == 'greater_than':
                        return f"{{{{{rf}}}}} > {rv_repr}"
                    elif ro == 'less_than':
                        return f"{{{{{rf}}}}} < {rv_repr}"
                    elif ro == 'equals':
                        return f"{{{{{rf}}}}} == {rv_repr}"
                    elif ro == 'not_equals':
                        return f"{{{{{rf}}}}} != {rv_repr}"
                    elif ro == 'contains':
                        return f"{repr(rv)} in str({{{{{rf}}}}})"
                    elif ro == 'not_contains':
                        return f"{repr(rv)} not in str({{{{{rf}}}}})"
                    elif ro == 'starts_with':
                        return f"str({{{{{rf}}}}}).startswith({repr(rv)})"
                    elif ro == 'is_empty':
                        return f"({{{{{rf}}}}} == '' or {{{{{rf}}}}} == None)"
                    elif ro == 'is_not_empty':
                        return f"({{{{{rf}}}}} != '' and {{{{{rf}}}}} != None)"
                    else:
                        return f"{{{{{rf}}}}} == {rv_repr}"

                # Normalize connectors length to rules length (n-1)
                needed = max(0, len(rules) - 1)
                norm_connectors = [str(c or '').strip().lower() for c in connectors[:needed]]
                while len(norm_connectors) < needed:
                    norm_connectors.append(legacy_logic)
                norm_connectors = [('or' if c == 'or' else 'and') for c in norm_connectors]
                type_cfg['connectors'] = norm_connectors

                # Build expressions for each rule (keep index alignment with connectors)
                rule_exprs = []
                for _i, _r in enumerate(rules):
                    if not isinstance(_r, dict):
                        rule_exprs.append(None)
                        continue
                    rule_exprs.append(_build_rule_expr(_r))

                if rule_exprs:
                    # Create a compound expression using standard boolean precedence:
                    # AND groups are evaluated before OR groups.
                    # We do this by grouping contiguous AND-connected rules, then OR-joining those groups.
                    groups: list[list[str]] = []
                    cur: list[str] = []
                    for i, expr in enumerate(rule_exprs):
                        if not expr:
                            continue
                        if not cur:
                            cur = [expr]
                        else:
                            conn = norm_connectors[i - 1] if i - 1 < len(norm_connectors) else 'and'
                            if conn == 'or':
                                groups.append(cur)
                                cur = [expr]
                            else:
                                cur.append(expr)
                    if cur:
                        groups.append(cur)

                    if len(groups) == 0:
                        if not existing_expr or existing_expr == 'True':
                            type_cfg['expression'] = 'True'
                    elif len(groups) == 1 and len(groups[0]) == 1:
                        type_cfg['expression'] = groups[0][0]
                    else:
                        group_exprs = []
                        for g in groups:
                            if len(g) == 1:
                                group_exprs.append(f"({g[0]})")
                            else:
                                group_exprs.append("(" + " and ".join(f"({x})" for x in g) + ")")
                        type_cfg['expression'] = " or ".join(group_exprs)
                elif not existing_expr or existing_expr == 'True':
                    type_cfg['expression'] = 'True'

                # Determine true/false branches.
                # Priority: onTrue/onFalse config fields (explicit) > edge types.
                _on_true = str(type_cfg.get('onTrue') or '').strip()
                _on_false = str(type_cfg.get('onFalse') or '').strip()
                out = edges_by_source.get(node.get('id'), {})
                if _on_true and _on_false:
                    type_cfg['true_branch'] = _on_true
                    type_cfg['false_branch'] = _on_false
                else:
                    type_cfg['true_branch'] = out.get('yes') or out.get('default')
                    type_cfg['false_branch'] = out.get('no')
                if _dbg_cond:
                    _fr = None
                    for _r in rules:
                        if isinstance(_r, dict) and str(_r.get('field') or '').strip():
                            _fr = _r
                            break
                    logger.info(
                        "[ConditionDebug] normalize node_id=%s field=%s operator=%s value=%s connectors=%s expression=%s yes=%s no=%s",
                        node.get("id"),
                        str((_fr or {}).get("field") or ""),
                        str((_fr or {}).get("operator") or ""),
                        str((_fr or {}).get("value") or ""),
                        str(type_cfg.get("connectors") or ""),
                        str(type_cfg.get("expression") or ""),
                        str(type_cfg.get("true_branch") or ""),
                        str(type_cfg.get("false_branch") or ""),
                    )
            # Notification node: Process Builder uses 'recipient' (single), 'template' (body); engine expects 'recipients' (list), 'message'
            if node_type == 'notification':
                if not type_cfg.get('recipients') and type_cfg.get('recipient'):
                    type_cfg['recipients'] = [type_cfg['recipient']]
                if not type_cfg.get('message') and type_cfg.get('template'):
                    type_cfg['message'] = type_cfg.get('template', '')
                    # Remove 'template' so the engine doesn't confuse it with a template ID
                    del type_cfg['template']
                # Ensure at least one of message/template so "Either message or template is required" does not fail
                if not (type_cfg.get('message') or type_cfg.get('template')):
                    type_cfg['message'] = 'Notification'
                # Ensure title exists (used as email subject)
                if not type_cfg.get('title'):
                    type_cfg['title'] = node.get('name') or 'Notification'
            # Tool node: Process Builder uses 'toolId' and 'params'; engine expects 'tool_id' and 'arguments'
            if node_type == 'tool':
                if not type_cfg.get('tool_id') and type_cfg.get('toolId'):
                    type_cfg['tool_id'] = type_cfg['toolId']
                if type_cfg.get('arguments') is None and type_cfg.get('params') is not None:
                    type_cfg['arguments'] = type_cfg.get('params') or {}

            # Action node: remap advanced action types into engine node types where supported
            if node_type == 'action':
                at = str(type_cfg.get('actionType') or type_cfg.get('action_type') or '').strip()
                at_norm = at.lower().replace('-', '_')
                if at_norm in ('generatedocument', 'generate_document'):
                    node['type'] = 'file_operation'
                    # Map business-friendly config into file operation "generate_document"
                    title = type_cfg.get('documentTitle') or node.get('name') or 'Document'
                    fmt = type_cfg.get('documentFormat') or type_cfg.get('format') or 'docx'
                    instr = type_cfg.get('documentInstructions') or type_cfg.get('instructions') or type_cfg.get('description') or ''
                    type_cfg['operation'] = 'generate_document'
                    type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                    type_cfg['title'] = title
                    type_cfg['format'] = fmt
                    type_cfg['instructions'] = instr
                elif at_norm in ('extractdocumenttext', 'extract_document_text', 'extract_text'):
                    node['type'] = 'file_operation'
                    type_cfg['operation'] = 'extract_text'
                    type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                    # Prefer explicit path, otherwise build from selected trigger file field
                    if not type_cfg.get('path'):
                        src = (
                            type_cfg.get('sourceField') or
                            type_cfg.get('documentField') or
                            type_cfg.get('fileField') or
                            type_cfg.get('field') or
                            ''
                        )
                        src = str(src).strip()
                        if src:
                            type_cfg['path'] = f"{{{{{src}.path}}}}"

            # New shape: read_document → file_operation extract_text
            if node_type == 'read_document':
                type_cfg['operation'] = 'extract_text'
                type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                if not type_cfg.get('path'):
                    src = (type_cfg.get('sourceField') or '').strip()
                    if src:
                        type_cfg['path'] = f"{{{{{src}.path}}}}"

            # New shape: create_document → file_operation generate_document
            if node_type == 'create_document':
                type_cfg['operation'] = 'generate_document'
                type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                if not type_cfg.get('title'):
                    type_cfg['title'] = node.get('name') or 'Document'
                if not type_cfg.get('format'):
                    type_cfg['format'] = 'docx'

            # AI modes: extract_file / create_doc → file_operation with right sub-config
            if node_type in ('ai', 'ai_step'):
                ai_mode = type_cfg.get('aiMode') or 'custom'
                if ai_mode == 'extract_file':
                    type_cfg['operation'] = 'extract_text'
                    type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                    if not type_cfg.get('path'):
                        src = (type_cfg.get('sourceField') or '').strip()
                        if src:
                            type_cfg['path'] = f"{{{{{src}.path}}}}"
                elif ai_mode == 'create_doc':
                    type_cfg['operation'] = 'generate_document'
                    type_cfg['storage_type'] = type_cfg.get('storage_type') or 'local'
                    if not type_cfg.get('title'):
                        type_cfg['title'] = type_cfg.get('docTitle') or node.get('name') or 'Document'
                    if not type_cfg.get('format'):
                        type_cfg['format'] = type_cfg.get('docFormat') or 'docx'
                    if not type_cfg.get('instructions') and type_cfg.get('prompt'):
                        type_cfg['instructions'] = type_cfg.get('prompt')
                elif ai_mode == 'batch_files':
                    # Normalize sourceFields → source_fields for engine consumption
                    src_fields = type_cfg.get('sourceFields') or []
                    if src_fields and isinstance(src_fields, list):
                        type_cfg['source_fields'] = src_fields

                # Auto-generate output_schema from outputFields for all AI modes
                output_fields = type_cfg.get('outputFields') or []
                if output_fields and isinstance(output_fields, list):
                    type_map = {
                        'text': 'string', 'number': 'number', 'date': 'string',
                        'currency': 'number', 'email': 'string', 'boolean': 'boolean',
                        'list': 'array'
                    }
                    schema_props = {}
                    for f in output_fields:
                        if f.get('name') and f.get('label'):
                            json_type = type_map.get(f.get('type', 'text'), 'string')
                            schema_props[f['name']] = {
                                'type': json_type,
                                'description': f['label']
                            }
                            if json_type == 'array':
                                schema_props[f['name']]['items'] = {'type': 'string'}
                    if schema_props:
                        type_cfg['output_format'] = 'json'
                        type_cfg['output_schema'] = {
                            'type': 'object',
                            'properties': schema_props,
                            'required': list(schema_props.keys())
                        }

                # Pass enabled tool IDs to engine
                enabled_tool_ids = type_cfg.get('enabledToolIds') or []
                if enabled_tool_ids and isinstance(enabled_tool_ids, list):
                    type_cfg['enabled_tool_ids'] = enabled_tool_ids

            # New shape: calculate → transform (with calculate handler)
            if node_type == 'calculate':
                type_cfg['transform_type'] = 'calculate'
                if not type_cfg.get('operation'):
                    type_cfg['operation'] = 'custom'

            # Schedule/Webhook legacy nodes: map into START triggerType config
            if node_type in ('schedule', 'webhook'):
                if node_type == 'schedule':
                    type_cfg['triggerType'] = 'schedule'
                    if type_cfg.get('cron') is None and node.get('config', {}).get('cron') is not None:
                        type_cfg['cron'] = node.get('config', {}).get('cron')
                    if type_cfg.get('timezone') is None and node.get('config', {}).get('timezone') is not None:
                        type_cfg['timezone'] = node.get('config', {}).get('timezone')
                else:
                    type_cfg['triggerType'] = 'webhook'
                    if type_cfg.get('method') is None and node.get('config', {}).get('method') is not None:
                        type_cfg['method'] = node.get('config', {}).get('method')
                    if type_cfg.get('path') is None and node.get('config', {}).get('path') is not None:
                        type_cfg['path'] = node.get('config', {}).get('path')
            # Delay node: UI uses {duration, unit}; engine expects {delay_type, duration}
            if node_type == 'delay':
                unit = type_cfg.get('unit')
                if unit and not type_cfg.get('delay_type'):
                    type_cfg['delay_type'] = str(unit).strip().lower()
                if type_cfg.get('duration') is None and type_cfg.get('duration_seconds') is not None:
                    type_cfg['delay_type'] = type_cfg.get('delay_type') or 'seconds'
                    type_cfg['duration'] = type_cfg.get('duration_seconds')
            # Approval / human_task: Process Builder uses 'approvers' (UI) or 'assignee'/'assignee_id' (single); engine expects 'assignee_ids' (list)
            if node_type in ('approval', 'human_task', 'human'):
                aids = type_cfg.get('assignee_ids')
                if not aids or (isinstance(aids, list) and len(aids) == 0):
                    # UI saves as approvers: [] - map to assignee_ids
                    approvers = type_cfg.get('approvers')
                    if approvers is not None:
                        _aids = _approvers_to_ids(approvers)
                        if _aids:
                            type_cfg['assignee_ids'] = _aids
                    if not type_cfg.get('assignee_ids'):
                        single = type_cfg.get('assignee') or type_cfg.get('assignee_id')
                        if single is not None and str(single).strip():
                            type_cfg['assignee_ids'] = [single] if isinstance(single, str) else list(single) if hasattr(single, '__iter__') and not isinstance(single, (str, bytes)) else [str(single)]
                elif not isinstance(aids, list):
                    type_cfg['assignee_ids'] = [aids] if aids is not None else []
                # Map UI-friendly "message" to engine "description" when missing
                if type_cfg.get('message') and not type_cfg.get('description'):
                    type_cfg['description'] = type_cfg.get('message')
                if not type_cfg.get('title'):
                    # Keep title short; defaults also exist in executor
                    type_cfg['title'] = node.get('name') or 'Approval Required'
            # Parallel node: auto-build branches from outgoing edges
            if node_type == 'parallel':
                node_id = node.get('id')
                if node_id:
                    out_edges = edges_by_source.get(node_id, {})
                    branches = [[target] for etype, target in out_edges.items() if target]
                    if branches:
                        type_cfg['branches'] = branches
                    type_cfg.setdefault('merge_strategy', 'wait_all')
                    type_cfg.setdefault('fail_fast', True)

            # Call Process (sub_process) node
            if node_type == 'call_process':
                pid = type_cfg.get('processId') or ''
                type_cfg['process_id'] = pid
                type_cfg.setdefault('input_mapping', type_cfg.get('inputMapping', {}))
                ov = type_cfg.get('outputVariable') or node.get('output_variable') or ''
                if ov:
                    node['output_variable'] = ov

            # File extraction: keep sourceField aligned with the actual upload field on the Start node.
            # This prevents failures when AI-generated configs use a different field key than the Start/Form upload field.
            try:
                op = str(type_cfg.get('operation') or '').strip().lower()
                if node.get('type') == 'file_operation' and op in ('extract_text', 'extract_document_text'):
                    # Determine desired field from config
                    source_field = str(type_cfg.get('sourceField') or type_cfg.get('source_field') or '').strip()
                    if not source_field:
                        pt = type_cfg.get('path')
                        if isinstance(pt, str):
                            m = re.match(r'^\s*\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\.path\s*\}\}\s*$', pt)
                            if m:
                                source_field = m.group(1)
                    chosen = _best_file_field(source_field)
                    if chosen:
                        type_cfg['sourceField'] = chosen
                        # Ensure path template references the chosen field for consistent engine behavior
                        type_cfg['path'] = f"{{{{{chosen}.path}}}}"
            except Exception:
                pass

            # End node: treat plain output string as variable reference (e.g. "result" -> "{{result}}")
            if node_type == 'end':
                out_val = type_cfg.get('output')
                if isinstance(out_val, str):
                    s = out_val.strip()
                    if s and ('{{' not in s and '}}' not in s):
                        if re.match(r'^[A-Za-z_][A-Za-z0-9_\.\[\]]*$', s):
                            type_cfg['output'] = f"{{{{{s}}}}}"
            config['type_config'] = type_cfg
            node['config'] = config
            normalized_nodes.append(node)

        # -------------------------------------------------------------------
        # CROSS-REFERENCE: Verify condition fields resolve to known outputs.
        # Generic safety net — no domain-specific assumptions.
        # -------------------------------------------------------------------
        _known_output_vars: set = set()
        for _n in normalized_nodes:
            # Form/trigger fields
            _tc = (_n.get("config") or {}).get("type_config") or {}
            if _n.get("type") in ("start",):
                for _f in _tc.get("fields") or []:
                    _fn = _f.get("name") or _f.get("id")
                    if _fn:
                        _known_output_vars.add(str(_fn))
            _ov = str(_n.get("output_variable") or "").strip()
            if _ov:
                _known_output_vars.add(_ov)
            # AI outputField sub-paths
            for _of in _tc.get("outputFields") or []:
                _ofn = (_of.get("name") or "").strip()
                if _ofn and _ov:
                    _known_output_vars.add(f"{_ov}.{_ofn}")

        # Separate dot-paths for sub-field matching
        _known_dot_paths: set = {v for v in _known_output_vars if "." in v}

        def _crossref_condition_field(_fld_val, _nid, _n_name, _tc_ref):
            """Try to resolve a condition field to a known output variable. Returns resolved field or original."""
            if not _fld_val or _fld_val in _known_output_vars:
                return _fld_val
            _fl = _fld_val.lower()
            for _dp in _known_dot_paths:
                _leaf = _dp.rsplit(".", 1)[1] if "." in _dp else _dp
                if _leaf.lower() == _fl:
                    logger.info("ServiceNorm cross-ref: condition '%s' field '%s' → dot-path '%s'", _n_name, _fld_val, _dp)
                    _old_expr = str(_tc_ref.get("expression") or "").strip()
                    if _old_expr and ("{{" + _fld_val + "}}") in _old_expr:
                        _tc_ref["expression"] = _old_expr.replace("{{" + _fld_val + "}}", "{{" + _dp + "}}")
                    return _dp
            _incoming_ids = [e.get("source") or e.get("from") for e in (data.get("edges") or []) if (e.get("target") or e.get("to")) == _nid]
            for _src_id in _incoming_ids:
                _src = next((nd for nd in normalized_nodes if nd.get("id") == _src_id), None)
                if not _src:
                    continue
                _src_ov = str(_src.get("output_variable") or "").strip()
                if not _src_ov:
                    continue
                _candidate = f"{_src_ov}.{_fld_val}"
                if _candidate in _known_output_vars:
                    logger.info("ServiceNorm cross-ref: condition '%s' field '%s' → '%s'", _n_name, _fld_val, _candidate)
                    _old_expr = str(_tc_ref.get("expression") or "").strip()
                    if _old_expr and ("{{" + _fld_val + "}}") in _old_expr:
                        _tc_ref["expression"] = _old_expr.replace("{{" + _fld_val + "}}", "{{" + _candidate + "}}")
                    return _candidate
            return _fld_val

        for _n in normalized_nodes:
            if _n.get("type") != "condition":
                continue
            _tc = (_n.get("config") or {}).get("type_config") or {}
            _nid = _n.get("id")
            _n_name = _n.get("name", _nid)

            _rules = _tc.get("rules")
            if isinstance(_rules, list) and len(_rules) > 0:
                for _rule in _rules:
                    if not isinstance(_rule, dict):
                        continue
                    _rf = str(_rule.get("field") or "").strip()
                    if _rf:
                        _rule["field"] = _crossref_condition_field(_rf, _nid, _n_name, _tc)
                _tc["field"] = str((_rules[0] or {}).get("field") or "").strip()
            else:
                _fld = str(_tc.get("field") or "").strip()
                if _fld:
                    _tc["field"] = _crossref_condition_field(_fld, _nid, _n_name, _tc)

        data['nodes'] = normalized_nodes
        
        return data
    
    def _ensure_dict(self, value: Any) -> Dict[str, Any]:
        """
        Normalize a value to a dict for settings merge.
        Handles JSON strings from DB, None, and non-dict types.
        """
        if value is None:
            return {}
        if isinstance(value, dict):
            return value
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                return parsed if isinstance(parsed, dict) else {}
            except (json.JSONDecodeError, TypeError):
                return {}
        return {}
    
    def _merge_settings(
        self, 
        base: Dict[str, Any], 
        override: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deep merge settings dictionaries
        
        Args:
            base: Base settings (lower priority)
            override: Override settings (higher priority)
            
        Returns:
            Merged settings with override taking precedence
        """
        base = self._ensure_dict(base)
        override = self._ensure_dict(override)
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                # Recursively merge nested dicts
                result[key] = self._merge_settings(result[key], value)
            else:
                # Override value
                result[key] = value
        
        return result
    
    def _extract_form_fields_from_definition(self, process_definition: Any) -> List[Dict[str, Any]]:
        """
        Extract raw form/trigger input fields from process definition (same structure as UI).
        Returns list of dicts with id (name), type, required, options, placeholder, label.
        """
        pd = self._ensure_dict(process_definition)
        nodes = pd.get('nodes') or []
        trigger_node = next(
            (n for n in nodes if (n.get('type') or '').lower() in ('trigger', 'form', 'start')),
            None
        )
        if not trigger_node:
            return []
        config = trigger_node.get('config') or {}
        type_config = config.get('type_config') or config
        fields = type_config.get('fields') or config.get('fields') or []
        return [
            {
                'id': f.get('name') or f.get('id') or ('field_' + str(i)),
                'type': f.get('type') or 'text',
                'required': bool(f.get('required')),
                'options': f.get('options'),
                'placeholder': f.get('placeholder'),
                'label': f.get('label'),
            }
            for i, f in enumerate(fields)
            if f and (f.get('name') or f.get('id'))
        ]
    
    async def enrich_form_fields(
        self,
        process_name: str,
        process_goal: str,
        raw_fields: List[Dict[str, Any]],
    ) -> List[Dict[str, Any]]:
        """
        Use LLM to generate professional, business-friendly labels and placeholders
        for process run form fields based on process context.
        Returns list of dicts compatible with EnrichedFormField (id, label, placeholder, type, required, options).
        """
        if not raw_fields:
            return []
        if not self.llm_registry:
            return self._fallback_enrich_form_fields(raw_fields)
        models = self.llm_registry.list_all(active_only=True)
        if not models:
            return self._fallback_enrich_form_fields(raw_fields)
        config = models[0]
        try:
            llm = LLMFactory.create(config)
        except Exception as e:
            logger.warning("LLM not available for form enrichment: %s", e)
            return self._fallback_enrich_form_fields(raw_fields)
        process_context = f"Workflow name: {process_name or 'Workflow'}. Goal: {process_goal or 'Collect input and run workflow'}."
        fields_json = json.dumps([
            {'id': f['id'], 'type': f['type'], 'required': f.get('required'), 'options': f.get('options')}
            for f in raw_fields
        ], ensure_ascii=False)
        system_prompt = """You are an expert UX copywriter. Given a workflow's context and a list of form field IDs and types, output a JSON array of objects with the same order and ids. For each field provide:
- label: professional, clear, business-friendly label (e.g. "Amount (USD)" not "amount", "Start Date" not "start_date")
- placeholder: short hint for the input (e.g. "Enter the amount" or "Select category"); null if not needed
- description: one short sentence of help text if useful; null otherwise
Use the same language as the workflow goal if it's not English. Output only valid JSON, no markdown or explanation."""
        user_prompt = f"""Process context: {process_context}

Raw fields (keep id and type exactly, add label, placeholder, description):
{fields_json}

Respond with a JSON array only, one object per field, with keys: id, label, placeholder, type, required, options (if select), description."""
        try:
            messages = [
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=user_prompt),
            ]
            response = await llm.chat(messages, temperature=0.3, max_tokens=1024)
            content = (response.content or '').strip()
            if not content:
                return self._fallback_enrich_form_fields(raw_fields)
            if content.startswith('```'):
                content = content.split('```')[1]
                if content.startswith('json'):
                    content = content[4:]
                content = content.strip()
            data = json.loads(content)
            if not isinstance(data, list) or len(data) != len(raw_fields):
                return self._fallback_enrich_form_fields(raw_fields)
            result = []
            for i, raw in enumerate(raw_fields):
                enriched = data[i] if i < len(data) else {}
                result.append({
                    'id': raw['id'],
                    'label': enriched.get('label') or (raw.get('label') or raw['id'].replace('_', ' ').title()),
                    'placeholder': enriched.get('placeholder') or raw.get('placeholder'),
                    'type': raw['type'],
                    'required': raw.get('required', False),
                    'options': raw.get('options'),
                    'description': enriched.get('description'),
                })
            return result
        except Exception as e:
            logger.warning("LLM form enrichment failed: %s", e)
            return self._fallback_enrich_form_fields(raw_fields)
    
    def _fallback_enrich_form_fields(self, raw_fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Non-LLM fallback: humanize labels and placeholders from field ids."""
        result = []
        for f in raw_fields:
            name = f.get('id') or f.get('name') or 'field'
            raw_label = (f.get('label') or name).replace('_', ' ').strip()
            label = ' '.join(w.capitalize() for w in raw_label.split()) if raw_label else name
            result.append({
                'id': name,
                'label': label,
                'placeholder': f.get('placeholder') or f"Enter {label.lower()}...",
                'type': f.get('type') or 'text',
                'required': f.get('required', False),
                'options': f.get('options'),
                'description': f.get('description'),
            })
        return result
