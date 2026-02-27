"""
Process API Router
FastAPI endpoints for process execution

Endpoints:
- POST /process/execute - Start new execution
- GET /process/executions - List executions
- GET /process/executions/{id} - Get execution details
- POST /process/executions/{id}/resume - Resume paused execution
- POST /process/executions/{id}/cancel - Cancel execution
- GET /process/executions/{id}/nodes - Get node executions
- GET /process/approvals - List pending approvals
- POST /process/approvals/{id}/decide - Approve/reject
- GET /process/stats - Execution statistics
"""

from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import FileResponse
import os
import re
import uuid
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field, EmailStr

from database.config import get_db
from core.llm.registry import LLMRegistry

from .schemas import (
    ProcessExecutionCreate,
    ProcessExecutionResponse,
    ProcessExecutionListResponse,
    ApprovalRequestResponse,
    ApprovalDecisionRequest,
    ApprovalListResponse,
    ProcessResumeRequest,
    ProcessCancelRequest,
    ProcessStatsResponse,
    NodeExecutionResponse,
    EnrichFormFieldsRequest,
    EnrichFormFieldsResponse,
    EnrichedFormField,
    SummarizeProcessRequest,
    SummarizeProcessResponse,
    UpdateProcessScheduleRequest,
    UpdateProcessScheduleResponse,
    PendingApprovalDisplayResponse,
    FinalizeExecutionUploadsRequest,
)
from .service import ProcessAPIService
from database.config import get_db_session

# Import security from platform's auth system
from api.security import require_auth, User
from core.security import security_state, Permission

# Import business-friendly messages and RFC 9457 problem details
from core.process.messages import (
    ErrorCode,
    format_error_for_user,
    get_success_message,
    sanitize_for_user,
    problem_details_rfc9457,
)


router = APIRouter(prefix="/process", tags=["Process Execution"])

_logger = logging.getLogger(__name__)


async def _run_engine_background(execution_id: str, llm_registry: LLMRegistry):
    """
    Async function executed by FastAPI BackgroundTasks.
    Opens its own DB session, runs the engine to completion, then closes.
    FastAPI awaits this after the response is sent.
    """
    _logger.info("[ProcessBG] ENTER _run_engine_background for %s", execution_id)
    db = None
    try:
        db = get_db_session()
        _logger.info("[ProcessBG] DB session opened for %s", execution_id)
        svc = ProcessAPIService(db=db, llm_registry=llm_registry)
        _logger.info("[ProcessBG] Service created, calling run_execution_from_db for %s", execution_id)
        await svc.run_execution_from_db(execution_id=execution_id)
        _logger.info("[ProcessBG] run_execution_from_db returned OK for %s", execution_id)
    except Exception as exc:
        _logger.exception("[ProcessBG] EXCEPTION for %s: %s", execution_id, exc)
        if db:
            try:
                from database.services.process_execution_service import ProcessExecutionService
                ProcessExecutionService(db).update_execution_status(
                    execution_id,
                    status="failed",
                    error_message="There was an issue processing your request. Please try again.",
                    error_details={"code": "BACKGROUND_RUN_FAILED", "error": str(exc)[:500]},
                )
                _logger.info("[ProcessBG] Marked execution %s as FAILED", execution_id)
            except Exception as inner_exc:
                _logger.exception("[ProcessBG] Could not mark %s as failed: %s", execution_id, inner_exc)
    finally:
        _logger.info("[ProcessBG] EXIT _run_engine_background for %s", execution_id)
        if db:
            try:
                db.close()
            except Exception:
                pass


# Global LLM registry instance (initialized on first request)
_llm_registry: Optional[LLMRegistry] = None


def _get_llm_registry() -> LLMRegistry:
    """Get or create LLM registry singleton"""
    global _llm_registry
    if _llm_registry is None:
        _llm_registry = LLMRegistry()
        # Load from environment or configuration
        _llm_registry.load_from_env()
    return _llm_registry


def get_service(db: Session = Depends(get_db)) -> ProcessAPIService:
    """Get process service instance with dependencies"""
    return ProcessAPIService(
        db=db, 
        llm_registry=_get_llm_registry()
    )


def _user_to_dict(user: User) -> Dict[str, Any]:
    """Convert User object to dict for service layer"""
    # Handle different User model variations
    org_id = getattr(user, 'org_id', None) or getattr(user, 'organization_id', None) or ''
    name = getattr(user, 'name', None) or getattr(user, 'email', 'Unknown')
    email = getattr(user, 'email', '') 
    
    # Get role_ids and group_ids (the User model uses role_ids, not roles)
    role_ids = getattr(user, 'role_ids', []) or []
    group_ids = getattr(user, 'group_ids', []) or []
    
    return {
        "id": str(user.id),
        "org_id": str(org_id),
        "name": name,
        "email": email,
        "role_ids": role_ids,
        "group_ids": group_ids
    }


def _is_platform_admin(user: User) -> bool:
    """
    Determine if the current user should be treated as a platform/org admin for portal-scoped visibility.

    We intentionally keep this check lightweight and aligned with existing approvals behavior.
    """
    try:
        return (
            security_state.check_permission(user, Permission.SYSTEM_ADMIN.value) or
            security_state.check_permission(user, Permission.USERS_VIEW.value) or
            security_state.check_permission(user, Permission.USERS_EDIT.value)
        )
    except Exception:
        return False


def _is_approval_visible_to_user(approval: Any, user_dict: Dict[str, Any]) -> bool:
    """Check whether an approval request should be visible/actionable for a user."""
    if not approval or not user_dict:
        return False
    try:
        assignee_type = str(getattr(approval, "assignee_type", "") or "").strip().lower()
        # Enterprise safety: never allow "anyone can approve" in the end-user portal.
        # If an approval is unassigned (e.g., missing manager), treat it as not actionable.
        if assignee_type == "any":
            return False
        user_id = str(user_dict.get("id") or "")
        role_ids = set(str(x) for x in (user_dict.get("role_ids") or []) if x)
        group_ids = set(str(x) for x in (user_dict.get("group_ids") or []) if x)
        assigned_user_ids = set(str(x) for x in (getattr(approval, "assigned_user_ids", None) or []) if x)
        assigned_role_ids = set(str(x) for x in (getattr(approval, "assigned_role_ids", None) or []) if x)
        assigned_group_ids = set(str(x) for x in (getattr(approval, "assigned_group_ids", None) or []) if x)
        if user_id and user_id in assigned_user_ids:
            return True
        if role_ids and assigned_role_ids and role_ids.intersection(assigned_role_ids):
            return True
        if group_ids and assigned_group_ids and group_ids.intersection(assigned_group_ids):
            return True
    except Exception:
        return False
    return False


# =============================================================================
# FILE UPLOADS FOR PROCESS RUNS (Trigger "file" fields)
# =============================================================================

def _process_upload_base_dir() -> str:
    """
    Base directory for uploaded files.

    We intentionally reuse the platform's UPLOAD_PATH convention (used by Documents/Kits),
    but isolate process-run uploads under a dedicated subfolder.
    """
    base = os.environ.get("UPLOAD_PATH", "data/uploads")
    return str(base)


def _safe_filename(name: str) -> str:
    n = (name or "").strip()
    if not n:
        return "upload"
    # keep dots for extensions, but strip everything else unsafe
    n = re.sub(r"[^A-Za-z0-9\.\-_]+", "_", n)
    n = n.strip("._")
    return n or "upload"


@router.post("/uploads")
async def upload_process_file(
    file: UploadFile = File(...),
    user: User = Depends(require_auth)
):
    """
    Upload a file to be used as a trigger input for a workflow run.

    Returns a **file reference object** that can be embedded inside `trigger_input`.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found for current user.")

    file_id = str(uuid.uuid4())
    original_name = file.filename or "upload"
    safe_name = _safe_filename(original_name)
    content_type = file.content_type or "application/octet-stream"
    ext = safe_name.split(".")[-1].lower() if "." in safe_name else ""

    base_dir = _process_upload_base_dir()
    dest_dir = os.path.join(base_dir, "process_uploads", org_id)
    os.makedirs(dest_dir, exist_ok=True)
    stored_name = f"{file_id}_{safe_name}"
    dest_path = os.path.join(dest_dir, stored_name)

    size = 0
    try:
        # Stream to disk (avoid loading large files into memory)
        with open(dest_path, "wb") as out:
            while True:
                chunk = await file.read(1024 * 1024)  # 1MB
                if not chunk:
                    break
                size += len(chunk)
                out.write(chunk)
    except Exception as e:
        try:
            if os.path.exists(dest_path):
                os.remove(dest_path)
        except Exception:
            pass
        raise HTTPException(status_code=500, detail="Failed to upload file.")

    return {
        "success": True,
        "file": {
            "kind": "uploadedFile",
            "id": file_id,
            "name": original_name,
            "content_type": content_type,
            "file_type": ext,
            "size": size,
            # This path is used internally by file/text extraction steps (not shown to end users)
            "path": dest_path,
            # Download URL for UIs (optional)
            "download_url": f"/process/uploads/{file_id}/download",
        }
    }


@router.get("/uploads/{file_id}/download")
async def download_process_file(
    file_id: str,
    user: User = Depends(require_auth)
):
    """
    Download a previously uploaded process-run file by id.

    Security: files are scoped to the caller's org folder.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found for current user.")

    try:
        uuid.UUID(str(file_id))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid file id.")

    base_dir = _process_upload_base_dir()
    dest_dir = os.path.join(base_dir, "process_uploads", org_id)
    if not os.path.isdir(dest_dir):
        raise HTTPException(status_code=404, detail="File not found.")

    prefix = f"{file_id}_"
    match = None
    try:
        for name in os.listdir(dest_dir):
            if name.startswith(prefix):
                match = name
                break
    except Exception:
        match = None

    if not match:
        raise HTTPException(status_code=404, detail="File not found.")

    path = os.path.join(dest_dir, match)
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found.")

    original_name = match[len(prefix):] or "download"
    return FileResponse(
        path,
        filename=original_name,
        media_type="application/octet-stream"
    )


# =============================================================================
# BUILDER TEST UTILITIES
# =============================================================================

class ProcessTestSendNotificationRequest(BaseModel):
    """Send a real notification during a visual builder test run."""
    channel: str = Field(default="email", description="Notification channel (only email supported for test)")
    recipients: List[EmailStr] = Field(default_factory=list, description="Recipient email addresses")
    title: str = Field(default="Notification", description="Email subject")
    message: str = Field(default="", description="Email body (plain text or HTML)")


@router.post("/test/resolve-approvers")
async def test_resolve_approvers(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Resolve approval-node assignees to concrete user details (name + email).

    Used by the Process Builder test to validate and display who will receive
    the approval before the test runs.  Returns a list of
    ``{id, name, email}`` or an error with a business-friendly reason.
    """
    from core.identity.service import UserDirectoryService

    ud = UserDirectoryService()
    org_id = str(user.org_id)
    requester_id = str(user.id)

    source = str(request.get("assignee_source") or "platform_user").strip()
    dir_type = str(request.get("directory_assignee_type") or "dynamic_manager").strip()
    raw_ids = request.get("assignee_ids") or request.get("approvers") or []
    dept_id = (
        request.get("assignee_department_id")
        or request.get("department_id")
        or request.get("departmentId")
        or None
    )
    dept_name = (
        request.get("assignee_department_name")
        or request.get("department_name")
        or request.get("departmentName")
        or None
    )
    role_ids = request.get("assignee_role_ids") or request.get("role_ids") or []
    group_ids = request.get("assignee_group_ids") or request.get("group_ids") or []

    resolved: list = []

    try:
        if source == "user_directory":
            directory_config = {
                "type": dir_type,
                "user_ids": raw_ids if isinstance(raw_ids, list) else [],
                "role_ids": role_ids if isinstance(role_ids, list) else [],
                "group_ids": group_ids if isinstance(group_ids, list) else [],
                "department_id": dept_id,
                "department_name": dept_name,
                "level": request.get("management_level", 1),
            }
            process_context = {
                "user_id": requester_id,
                "trigger_input": {"_user_context": {"user_id": requester_id}},
                "variables": {},
            }
            ids = ud.resolve_process_assignee(directory_config, process_context, org_id) or []
        elif source in ("platform_group", "platform_role"):
            directory_config = {
                "type": "role" if source == "platform_role" else "group",
                "role_ids": raw_ids if source == "platform_role" and isinstance(raw_ids, list) else [],
                "group_ids": raw_ids if source == "platform_group" and isinstance(raw_ids, list) else [],
            }
            process_context = {
                "user_id": requester_id,
                "trigger_input": {},
                "variables": {},
            }
            ids = ud.resolve_process_assignee(directory_config, process_context, org_id) or []
        else:
            ids = [str(x) for x in raw_ids if x] if isinstance(raw_ids, list) else []

        for uid in ids:
            try:
                attrs = ud.get_user(str(uid), org_id)
                if attrs:
                    resolved.append({
                        "id": str(uid),
                        "name": attrs.display_name or f"{attrs.first_name or ''} {attrs.last_name or ''}".strip() or "(unknown)",
                        "email": attrs.email or "(no email)",
                    })
                else:
                    resolved.append({"id": str(uid), "name": "(not found)", "email": "(not found)"})
            except Exception:
                resolved.append({"id": str(uid), "name": "(error)", "email": "(error)"})

    except Exception as exc:
        _logger.warning("[resolve-approvers] Resolution failed: %s", exc)
        return {
            "resolved": False,
            "approvers": [],
            "error": str(exc),
            "reason": "Could not resolve the approver. Check the Identity Directory configuration.",
        }

    if not resolved:
        if dir_type == "dynamic_manager":
            reason = (
                "The submitter does not have a manager assigned. "
                "Go to Organization > People & Departments and assign a manager."
            )
        elif "department" in dir_type:
            dept_label = f' "{dept_name}"' if dept_name else ""
            reason = (
                f"No manager found for the{dept_label} department. "
                f"Go to Organization > People & Departments and assign a manager."
            )
        else:
            reason = "No users matched the configured assignee source."

        return {
            "resolved": False,
            "approvers": [],
            "reason": reason,
        }

    return {
        "resolved": True,
        "approvers": resolved,
    }


@router.post("/test/send-notification")
async def test_send_notification(
    request: ProcessTestSendNotificationRequest,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    Send a real notification during a Process Builder "Test" run.

    This is used by the visual builder playback/simulation so business users can verify
    that email notifications actually deliver (SendGrid), while still using the animated
    path playback UX.
    """
    channel = (request.channel or "email").strip().lower()
    if channel != "email":
        raise HTTPException(status_code=400, detail="Only email notifications are supported in test mode right now.")
    if not request.recipients:
        raise HTTPException(status_code=400, detail="At least one recipient is required.")
    if len(request.recipients) > 10:
        raise HTTPException(status_code=400, detail="Too many recipients (max 10).")
    if request.message is None or not str(request.message).strip():
        raise HTTPException(status_code=400, detail="Message is required.")

    # Use the same platform email service as verification / MFA (SendGrid via env)
    from core.process.services.notification import NotificationService
    from core.security import EmailService as PlatformEmailService

    svc = NotificationService(db=db, platform_email_service=PlatformEmailService)
    result = await svc.send(
        channel="email",
        recipients=[str(x).strip() for x in request.recipients if str(x).strip()],
        title=(request.title or "Notification").strip() or "Notification",
        message=str(request.message),
        template_id=None,
        template_data={},
        priority="normal",
        config={},
    )
    return result


# =============================================================================
# PRE-FLIGHT VALIDATION (before test run)
# =============================================================================

@router.post("/preflight-check")
async def preflight_check(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db),
):
    """
    AI-driven pre-flight validation before running a process test.
    
    Analyzes the process definition to find ALL required identity fields,
    checks the current user's profile against them, and returns actionable
    warnings with fix suggestions.
    
    This runs BEFORE the actual test to give the user a chance to fix
    missing data (assign manager, fill profile fields, etc.) instead of
    discovering failures mid-execution.
    """
    import uuid as uuid_module
    from core.identity.service import UserDirectoryService
    from database.models.agent import Agent
    
    user_dict = _user_to_dict(user)
    agent_id = request.get("agent_id", "")
    
    if not agent_id:
        raise HTTPException(status_code=400, detail="agent_id is required")
    
    # Normalize agent_id to UUID for consistent DB query
    try:
        agent_uuid = uuid_module.UUID(str(agent_id))
    except (ValueError, AttributeError):
        raise HTTPException(status_code=400, detail="Invalid agent_id format")
    
    # Load process definition
    agent = db.query(Agent).filter(Agent.id == agent_uuid).first()
    if not agent or not agent.process_definition:
        raise HTTPException(status_code=404, detail="Process not found or has no definition")
    
    process_def = agent.process_definition
    if isinstance(process_def, str):
        import json as _json
        process_def = _json.loads(process_def)
    
    nodes = process_def.get("nodes", [])
    
    # =====================================================================
    # Step 1: Analyze process nodes to extract required identity fields
    # =====================================================================
    requirements = _analyze_process_identity_requirements(nodes)
    
    # =====================================================================
    # Step 2: Get the current user's identity data
    # =====================================================================
    dir_svc = UserDirectoryService()
    user_data = {}
    identity_ctx = {}
    try:
        user_data = dir_svc.enrich_process_context(user_dict["id"], user_dict["org_id"])
        print(f"[Preflight] enrich_process_context: user_id={user_dict['id']}, org_id={user_dict['org_id']}, "
              f"email={user_data.get('email', '(none)')}, manager_email={user_data.get('manager_email', '(none)')}, "
              f"keys={list(user_data.keys())}")
    except Exception as e:
        print(f"[Preflight] enrich_process_context FAILED: user_id={user_dict['id']}, org_id={user_dict['org_id']}, error={e}")
        import traceback
        traceback.print_exc()
        user_data = {}
    
    # Fallback: if enrich returned minimal data, inject email from auth token
    if not user_data.get("email") and user_dict.get("email"):
        user_data["email"] = user_dict["email"]
        print(f"[Preflight] Injected email from auth token as fallback: {user_dict['email']}")
    
    try:
        identity_ctx = dir_svc.discover_identity_context(user_dict["org_id"])
        print(f"[Preflight] identity_context: source={identity_ctx.get('source')}, warnings={identity_ctx.get('warnings')}")
    except Exception as e:
        print(f"[Preflight] discover_identity_context FAILED: {e}")
        identity_ctx = {}
    
    # =====================================================================
    # Step 3: Check requirements against actual data
    # =====================================================================
    issues = _check_requirements_against_data(requirements, user_data, identity_ctx, user_dict)
    
    # =====================================================================
    # Step 4: Return structured result
    # =====================================================================
    return {
        "ok": len([i for i in issues if i["severity"] == "error"]) == 0,
        "issues": issues,
        "identity_source": identity_ctx.get("source_label", "Unknown"),
        "user_profile_summary": {
            "email": user_data.get("email", None),
            "name": user_data.get("display_name") or user_data.get("name", None),
            "has_manager": bool(user_data.get("manager_email") or user_data.get("manager_id")),
            "manager_name": user_data.get("manager_name", None),
            "manager_email": user_data.get("manager_email", None),
            "department": user_data.get("department_name", None),
            "has_custom_fields": bool(user_data.get("custom_attributes")),
        },
        "requirements": requirements,
    }


def _analyze_process_identity_requirements(nodes: list) -> Dict[str, Any]:
    """
    Scan ALL process nodes to determine which identity fields are required.
    
    This is a deterministic, thorough scan — not LLM-based — so it's instant
    and 100% accurate. It checks:
    - Notification recipients (requester, manager, custom emails)
    - Approval assignees (dynamic_manager, department, role)
    - Variable references ({{ _user_context.X }})
    - Condition expressions referencing identity
    - AI task prompts referencing identity
    - Form fields with prefill from identity
    """
    import re as _re
    
    reqs = {
        "needs_email": False,
        "needs_manager": False,
        "needs_department": False,
        "needs_custom_fields": [],
        "referenced_identity_fields": set(),
        "details": [],  # Human-readable description of why each field is needed
    }
    
    # Regex to find {{ _user_context.FIELD }} or {{ trigger_input._user_context.FIELD }}
    ctx_ref_re = _re.compile(r'\{\{\s*(?:trigger_input\.)?_user_context\.(\w+)\s*\}\}')
    # Also catch manager_id / manager_email at top-level trigger_input
    top_ref_re = _re.compile(r'\{\{\s*(?:trigger_input\.)?(manager_id|manager_email|department_id|department_name|employee_id)\s*\}\}')
    
    for node in nodes:
        if not isinstance(node, dict):
            continue
        
        node_type = (node.get("type") or "").lower()
        node_name = node.get("name") or node.get("label") or node_type
        config = node.get("config") or node.get("data") or {}
        if isinstance(config, dict) and "config" in config:
            config = config["config"]  # Handle nested config from visual builder
        if not isinstance(config, dict):
            config = {}
        
        # --- Scan the entire node config as text for variable references ---
        config_text = str(config)
        for match in ctx_ref_re.finditer(config_text):
            field = match.group(1)
            reqs["referenced_identity_fields"].add(field)
            if field in ("email",):
                reqs["needs_email"] = True
            elif field in ("manager_id", "manager_email", "manager_name"):
                reqs["needs_manager"] = True
            elif field in ("department_name", "department_id"):
                reqs["needs_department"] = True
        
        for match in top_ref_re.finditer(config_text):
            field = match.group(1)
            if "manager" in field:
                reqs["needs_manager"] = True
            if "department" in field:
                reqs["needs_department"] = True
        
        # --- NOTIFICATION nodes ---
        if node_type == "notification":
            recipients = config.get("recipients") or []
            if not recipients:
                single = config.get("recipient")
                if single:
                    recipients = [single]
            
            for r in recipients:
                r_str = str(r).strip().lower()
                if r_str in ("requester", "submitter", "initiator", "self"):
                    reqs["needs_email"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "email",
                        "reason": f"Notification '{node_name}' sends to the requester — their email address must be set in their profile",
                    })
                elif r_str in ("manager", "supervisor", "direct_manager"):
                    reqs["needs_manager"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "manager_email",
                        "reason": f"Notification '{node_name}' sends to the requester's manager — a manager must be assigned in Identity Directory",
                    })
                elif r_str in ("department_head", "dept_head", "department_manager"):
                    reqs["needs_department"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "department",
                        "reason": f"Notification '{node_name}' sends to the department head — the requester must be assigned to a department with a manager",
                    })
                elif r_str.startswith("group:") or r_str.startswith("team:"):
                    group_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                    reqs["details"].append({
                        "node": node_name,
                        "field": "group",
                        "reason": f"Notification '{node_name}' sends to a group/team — the group must exist and have members with email addresses",
                        "group_id": group_id,
                    })
                elif r_str.startswith("role:"):
                    role_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                    reqs["details"].append({
                        "node": node_name,
                        "field": "role",
                        "reason": f"Notification '{node_name}' sends to users with a specific role — the role must exist and have assigned users",
                        "role_id": role_id,
                    })
                elif r_str.startswith("dept_manager:") or r_str.startswith("dept_head:"):
                    dept_id = r_str.split(":", 1)[1].strip() if ":" in r_str else ""
                    reqs["needs_department"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "department",
                        "reason": f"Notification '{node_name}' sends to a specific department's manager — the department must have a manager assigned",
                        "department_id": dept_id,
                    })
        
        # --- APPROVAL nodes ---
        if node_type == "approval":
            assignee_source = (config.get("assignee_source") or "").lower()
            dir_type = (config.get("directory_assignee_type") or "").lower()
            
            dept_name_cfg = config.get("assignee_department_name") or config.get("department_name") or ""

            if assignee_source == "user_directory":
                if dir_type in ("dynamic_manager", "manager"):
                    reqs["needs_manager"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "manager",
                        "reason": f"Approval '{node_name}' is routed to the requester's direct manager — a manager must be assigned in Identity Directory",
                    })
                elif dir_type == "department_manager" and dept_name_cfg:
                    reqs["needs_department"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "department",
                        "reason": f"Approval '{node_name}' is routed to the '{dept_name_cfg}' department manager — this department must exist and have a manager assigned",
                    })
                elif "department" in dir_type:
                    reqs["needs_department"] = True
                    reqs["details"].append({
                        "node": node_name,
                        "field": "department",
                        "reason": f"Approval '{node_name}' uses department-based routing — the requester must be assigned to a department",
                    })
            
            # Check for dynamic expressions in assignee_ids
            assignee_ids = config.get("assignee_ids") or config.get("approvers") or []
            for aid in (assignee_ids if isinstance(assignee_ids, list) else [assignee_ids]):
                aid_str = str(aid or "")
                if "manager" in aid_str.lower():
                    reqs["needs_manager"] = True
                if "department" in aid_str.lower():
                    reqs["needs_department"] = True
        
        # --- CONDITION nodes ---
        if node_type == "condition":
            expression = str(config.get("expression") or config.get("condition") or "")
            if "_user_context" in expression or "manager" in expression.lower():
                for match in ctx_ref_re.finditer(expression):
                    reqs["referenced_identity_fields"].add(match.group(1))
                if "manager" in expression.lower():
                    reqs["needs_manager"] = True
                if "department" in expression.lower():
                    reqs["needs_department"] = True
        
        # --- AI_TASK nodes (scan prompt for identity references) ---
        if node_type == "ai_task":
            prompt = str(config.get("prompt") or config.get("system_prompt") or "")
            for match in ctx_ref_re.finditer(prompt):
                field = match.group(1)
                reqs["referenced_identity_fields"].add(field)
                if field == "email":
                    reqs["needs_email"] = True
                elif "manager" in field:
                    reqs["needs_manager"] = True
                elif "department" in field:
                    reqs["needs_department"] = True
        
        # --- START node: scan prefill fields ---
        if node_type in ("start", "form"):
            fields = config.get("fields") or []
            if isinstance(fields, list):
                for f in fields:
                    if not isinstance(f, dict):
                        continue
                    prefill = f.get("prefill") or ""
                    prefill_str = str(prefill).lower()
                    if "manager" in prefill_str:
                        reqs["needs_manager"] = True
                    if "email" in prefill_str and ("user" in prefill_str or "requester" in prefill_str):
                        reqs["needs_email"] = True
                    if "department" in prefill_str:
                        reqs["needs_department"] = True
                    # Check for custom field prefills
                    if prefill_str.startswith("_user_context."):
                        field_name = prefill_str.replace("_user_context.", "")
                        reqs["referenced_identity_fields"].add(field_name)
    
    # Convert set to list for JSON serialization
    reqs["referenced_identity_fields"] = sorted(reqs["referenced_identity_fields"])
    return reqs


def _check_requirements_against_data(
    requirements: Dict[str, Any],
    user_data: Dict[str, Any],
    identity_ctx: Dict[str, Any],
    user_dict: Dict[str, Any],
) -> List[Dict[str, Any]]:
    """
    Compare what the process NEEDS vs what the user's profile HAS.
    Returns a list of issues, each with severity, message, and fix action.
    """
    issues = []
    
    # Check: Is identity configured at all?
    if not user_data:
        issues.append({
            "severity": "error",
            "code": "NO_IDENTITY_DATA",
            "title": "No identity data found",
            "message": (
                "Your user profile could not be loaded from the Identity Directory. "
                "This process requires identity data to run correctly."
            ),
            "action": {
                "type": "open_settings",
                "label": "Set up Identity Directory",
                "target": "identity",
            },
        })
        # If no identity data at all, remaining checks don't apply
        return issues
    
    # Check: Email
    if requirements.get("needs_email"):
        email = user_data.get("email") or user_dict.get("email")
        if not email:
            reasons = [d["reason"] for d in requirements.get("details", []) if d.get("field") == "email"]
            issues.append({
                "severity": "error",
                "code": "MISSING_EMAIL",
                "title": "Your email address is missing",
                "message": (
                    "This process sends notifications to you (the requester), "
                    "but your profile has no email address."
                    + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                ),
                "action": {
                    "type": "open_profile",
                    "label": "Update your profile",
                    "target": "profile",
                    "field": "email",
                },
            })
    
    # Check: Manager
    if requirements.get("needs_manager"):
        has_manager = bool(user_data.get("manager_email") or user_data.get("manager_id"))
        manager_email = user_data.get("manager_email")
        manager_name = user_data.get("manager_name")
        
        if not has_manager:
            reasons = [d["reason"] for d in requirements.get("details", []) if "manager" in d.get("field", "")]
            issues.append({
                "severity": "error",
                "code": "NO_MANAGER_ASSIGNED",
                "title": "No manager assigned to your profile",
                "message": (
                    "This process requires manager approval or sends notifications to your manager, "
                    "but you don't have a manager assigned in the Identity Directory."
                    + (f"\n\nNeeded by: {reasons[0]}" if reasons else "")
                ),
                "action": {
                    "type": "open_profile",
                    "label": "Assign a manager",
                    "target": "user_management",
                    "field": "manager",
                },
            })
        elif has_manager and not manager_email:
            # Manager is assigned but has no email — manager's profile is incomplete
            issues.append({
                "severity": "warning",
                "code": "MANAGER_NO_EMAIL",
                "title": f"Your manager{' (' + manager_name + ')' if manager_name else ''} has no email address",
                "message": (
                    "Your manager is assigned, but their profile doesn't have an email address. "
                    "Notifications sent to 'manager' will fail."
                ),
                "action": {
                    "type": "open_profile",
                    "label": f"Update manager's profile",
                    "target": "user_management",
                    "field": "manager_email",
                    "manager_id": user_data.get("manager_id"),
                },
            })
    
    # Check: Department
    if requirements.get("needs_department"):
        dept_details = [d for d in requirements.get("details", []) if "department" in d.get("field", "")]
        named_dept_details = [d for d in dept_details if d.get("reason") and "'" in d.get("reason", "")]
        generic_dept_details = [d for d in dept_details if d not in named_dept_details]

        # Named department routing (e.g., "Finance department manager") doesn't require
        # the requester to be in a department — it routes to a specific dept's manager.
        # Only generic department routing requires the requester to have a dept assignment.
        if generic_dept_details:
            has_dept = bool(user_data.get("department_name") or user_data.get("department_id"))
            if not has_dept:
                caps = identity_ctx.get("capabilities", {})
                has_any_depts = caps.get("has_departments", False)
                reasons = [d["reason"] for d in generic_dept_details]

                if not has_any_depts:
                    issues.append({
                        "severity": "error",
                        "code": "NO_DEPARTMENTS",
                        "title": "No departments configured",
                        "message": (
                            "This process uses department-based routing, "
                            "but no departments have been set up yet."
                            + (f"\n\nDetails: {reasons[0]}" if reasons else "")
                        ),
                        "action": {
                            "type": "open_settings",
                            "label": "Set up departments",
                            "target": "departments",
                        },
                    })
                else:
                    issues.append({
                        "severity": "error",
                        "code": "NO_DEPARTMENT_ASSIGNED",
                        "title": "You are not assigned to a department",
                        "message": (
                            "This process routes approvals based on your department, "
                            "but your profile does not have a department assigned."
                            + (f"\n\nDetails: {reasons[0]}" if reasons else "")
                        ),
                        "action": {
                            "type": "open_profile",
                            "label": "Assign your department",
                            "target": "user_management",
                            "field": "department",
                        },
                    })
    
    # Check: Referenced custom identity fields
    referenced = requirements.get("referenced_identity_fields", [])
    standard_fields = {
        "email", "name", "display_name", "first_name", "last_name", "phone",
        "job_title", "employee_id", "department_name", "department_id",
        "manager_id", "manager_name", "manager_email", "role_names",
        "group_names", "is_manager", "user_id", "roles", "groups",
        "direct_report_count", "identity_source",
    }
    for field in referenced:
        if field in standard_fields:
            # Check if this standard field has a value
            value = user_data.get(field)
            if not value and field not in ("is_manager", "direct_report_count"):
                issues.append({
                    "severity": "warning",
                    "code": "MISSING_PROFILE_FIELD",
                    "title": f"Profile field '{field}' is empty",
                    "message": (
                        f"The process references '{{{{ _user_context.{field} }}}}' "
                        f"but this field is empty in your profile."
                    ),
                    "action": {
                        "type": "open_profile",
                        "label": f"Fill in '{field}'",
                        "target": "profile",
                        "field": field,
                    },
                })
        else:
            # This is a custom field — check if it exists in user_data
            value = user_data.get(field)
            if value is None:
                issues.append({
                    "severity": "warning",
                    "code": "MISSING_CUSTOM_FIELD",
                    "title": f"Custom field '{field}' is not set",
                    "message": (
                        f"The process references a custom profile field '{field}' "
                        f"but it doesn't exist in your profile. This may need to be added "
                        f"via Organization > Settings > Profile Fields."
                    ),
                    "action": {
                        "type": "open_profile",
                        "label": f"Add '{field}' to profile",
                        "target": "user_management",
                        "field": field,
                    },
                })
    
    # Check identity source warnings
    id_warnings = identity_ctx.get("warnings", [])
    for w in id_warnings:
        issues.append({
            "severity": "warning",
            "code": "IDENTITY_WARNING",
            "title": "Identity Directory warning",
            "message": w,
            "action": {
                "type": "open_settings",
                "label": "Review Identity Settings",
                "target": "identity",
            },
        })
    
    return issues


# =============================================================================
# EXECUTION ENDPOINTS
# =============================================================================

@router.post("/execute", response_model=ProcessExecutionResponse)
async def start_execution(
    request: ProcessExecutionCreate,
    background_tasks: BackgroundTasks,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Start a new workflow run
    
    Starts running the selected workflow with the provided input.
    """
    user_dict = _user_to_dict(user)
    try:
        result = await service.start_execution(
            agent_id=request.agent_id,
            org_id=user_dict["org_id"],
            user_id=user_dict["id"],
            trigger_input=request.trigger_input,
            trigger_type="manual",
            conversation_id=request.conversation_id,
            correlation_id=request.correlation_id,
            user_info=user_dict
        )
        return result
    except PermissionError as e:
        raise HTTPException(
            status_code=403,
            detail=problem_details_rfc9457(403, ErrorCode.ACCESS_DENIED),
        )
    except ValueError as e:
        sanitized = sanitize_for_user(str(e))
        raise HTTPException(
            status_code=400,
            detail=problem_details_rfc9457(
                400, ErrorCode.VALIDATION_FAILED,
                detail_override=sanitized,
            ),
        )
    except Exception as e:
        import logging
        import traceback
        logging.getLogger(__name__).exception(
            "Process execution failed: %s", type(e).__name__
        )
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=problem_details_rfc9457(500, ErrorCode.EXECUTION_FAILED),
        )


@router.post("/execute-fast", response_model=ProcessExecutionResponse)
async def start_execution_fast(
    request: ProcessExecutionCreate,
    bg: BackgroundTasks,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Fast-start a new workflow run for the Chat Portal.
    Returns immediately with a reference/run ID, while the process continues in background.
    """
    user_dict = _user_to_dict(user)
    try:
        _logger.info("[ExecuteFast] endpoint called for agent=%s user=%s", request.agent_id, user_dict["id"])
        response, should_run = await service.start_execution_fast(
            agent_id=request.agent_id,
            org_id=user_dict["org_id"],
            user_id=user_dict["id"],
            trigger_input=request.trigger_input,
            trigger_type="manual",
            conversation_id=request.conversation_id,
            correlation_id=request.correlation_id,
            user_info=user_dict
        )
        _logger.info("[ExecuteFast] execution_id=%s should_run=%s status=%s", response.id, should_run, response.status)
        if should_run:
            _logger.info("[ExecuteFast] scheduling bg.add_task for %s", response.id)
            bg.add_task(_run_engine_background, str(response.id), _get_llm_registry())
        return response
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=problem_details_rfc9457(403, ErrorCode.ACCESS_DENIED),
        )
    except ValueError as e:
        sanitized = sanitize_for_user(str(e))
        raise HTTPException(
            status_code=400,
            detail=problem_details_rfc9457(
                400, ErrorCode.VALIDATION_FAILED,
                detail_override=sanitized,
            ),
        )
    except Exception as e:
        logging.getLogger(__name__).exception(
            "Process execution fast-start failed: %s", type(e).__name__
        )
        raise HTTPException(
            status_code=500,
            detail=problem_details_rfc9457(500, ErrorCode.EXECUTION_FAILED),
        )


@router.post("/enrich-form-fields", response_model=EnrichFormFieldsResponse)
async def enrich_form_fields(
    request: EnrichFormFieldsRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Get LLM-enriched form field labels for the process run form.
    Uses process context (name, goal) and raw fields to generate professional,
    business-friendly labels and placeholders.
    """
    process_definition = request.process_definition
    goal = request.goal or ''
    name = request.name or 'Workflow'
    if request.agent_id:
        from database.services import AgentService
        org_id = getattr(user, 'org_id', None) or 'org_default'
        agent_dict = AgentService.get_agent_by_id(request.agent_id, org_id)
        if agent_dict:
            process_definition = agent_dict.get('process_definition')
            goal = agent_dict.get('goal') or goal
            name = agent_dict.get('name') or name
    if process_definition is None and not request.agent_id:
        return EnrichFormFieldsResponse(fields=[])
    process_definition = service._ensure_dict(process_definition)
    raw_fields = service._extract_form_fields_from_definition(process_definition)
    if not raw_fields:
        return EnrichFormFieldsResponse(fields=[])
    enriched = await service.enrich_form_fields(name, goal, raw_fields)
    return EnrichFormFieldsResponse(
        fields=[EnrichedFormField(**f) for f in enriched]
    )


@router.post("/summarize", response_model=SummarizeProcessResponse)
async def summarize_process(
    request: SummarizeProcessRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Create a short, business-friendly summary for a workflow.
    Used by the Admin Portal "Play" modal to show what the workflow does
    without exposing the original generation prompt.
    """
    process_definition = request.process_definition
    goal = request.goal or ''
    name = request.name or 'Workflow'
    if request.agent_id:
        from database.services import AgentService
        org_id = getattr(user, 'org_id', None) or 'org_default'
        agent_dict = AgentService.get_agent_by_id(request.agent_id, org_id)
        if agent_dict:
            process_definition = agent_dict.get('process_definition')
            goal = agent_dict.get('goal') or goal
            name = agent_dict.get('name') or name
    if process_definition is None and not request.agent_id:
        return SummarizeProcessResponse(summary='')
    process_definition = service._ensure_dict(process_definition)
    summary = await service.summarize_process(name=name, goal=goal, process_definition=process_definition)
    return SummarizeProcessResponse(summary=summary or '')


@router.put("/agents/{agent_id}/schedule", response_model=UpdateProcessScheduleResponse)
async def update_process_schedule(
    agent_id: str,
    request: UpdateProcessScheduleRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Update a scheduled Process AI Agent's schedule.
    Designed for business admins (delegated) via the Chat Portal.
    """
    user_dict = _user_to_dict(user)
    org_id = str(user_dict.get("org_id") or "").strip()
    if not org_id:
        raise HTTPException(status_code=400, detail="Organization not found")
    try:
        ok = service.update_agent_schedule(
            org_id=org_id,
            agent_id=agent_id,
            user_id=str(user_dict.get("id") or ""),
            user_info=user_dict,
            cron=request.cron,
            timezone=request.timezone,
            enabled=request.enabled,
            is_platform_admin=_is_platform_admin(user),
        )
        return UpdateProcessScheduleResponse(ok=bool(ok))
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to update schedule: %s", e)
        raise HTTPException(status_code=500, detail="Failed to update schedule")


@router.get("/executions", response_model=ProcessExecutionListResponse)
async def list_executions(
    agent_id: Optional[str] = Query(None, description="Filter by workflow"),
    status: Optional[str] = Query(None, description="Filter by status"),
    scope: Optional[str] = Query(
        "auto",
        description="Visibility scope: mine (only your runs), org (all org runs, admins only), auto (admins=org, others=mine)",
    ),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    List workflow runs
    
    Returns your workflow run history.
    """
    user_dict = _user_to_dict(user)
    try:
        scope_norm = (scope or "auto").strip().lower()
        is_platform_admin = _is_platform_admin(user)
        created_by = None
        if scope_norm in ("mine", "my", "me"):
            created_by = user_dict["id"]
        elif scope_norm in ("org", "all"):
            created_by = None if is_platform_admin else user_dict["id"]
        else:
            # auto / unknown → admins see org, others see mine
            created_by = None if is_platform_admin else user_dict["id"]
        items, total = service.list_executions(
            org_id=user_dict["org_id"],
            agent_id=agent_id,
            status=status,
            created_by=created_by,
            limit=limit,
            offset=offset
        )
        return ProcessExecutionListResponse(
            items=items,
            total=total,
            limit=limit,
            offset=offset
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail="Unable to load workflow runs. Please try again."
        )


@router.get("/executions/{execution_id}", response_model=ProcessExecutionResponse)
async def get_execution(
    execution_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Get workflow run details
    
    Returns details of a specific workflow run.
    """
    user_dict = _user_to_dict(user)
    try:
        execution = service.exec_service.get_execution(execution_id)
        if not execution or str(execution.org_id) != user_dict["org_id"]:
            raise ValueError("not found")
        is_platform_admin = _is_platform_admin(user)
        is_creator = str(getattr(execution, "created_by", "")) == user_dict["id"]
        if not is_creator and not is_platform_admin:
            raise HTTPException(
                status_code=403,
                detail=format_error_for_user(ErrorCode.PERMISSION_DENIED),
            )

        # Fail-safe: if an execution has been "running" far longer than its configured limit,
        # mark it as timed_out so Tracking doesn't remain stuck forever (e.g., hung LLM call).
        try:
            if str(getattr(execution, "status", "") or "").lower() == "running":
                started_at = getattr(execution, "started_at", None) or getattr(execution, "created_at", None)
                if started_at:
                    max_s = 3600
                    raw_def = getattr(execution, "process_definition_snapshot", None)
                    if raw_def:
                        try:
                            d = json.loads(raw_def) if isinstance(raw_def, str) else raw_def
                            if isinstance(d, dict):
                                settings = d.get("settings") or {}
                                if isinstance(settings, dict):
                                    max_s = int(settings.get("max_execution_time_seconds") or max_s)
                        except Exception:
                            pass
                    elapsed = (datetime.utcnow() - started_at).total_seconds()
                    # Allow a small buffer for slow services.
                    if elapsed > (max_s + 300):
                        execution = service.exec_service.update_execution_status(
                            str(execution.id),
                            status="timed_out",
                            error_message="This request took longer than expected and was stopped.",
                            error_details={"code": "EXECUTION_TIMEOUT", "max_execution_time_seconds": max_s},
                        )
        except Exception:
            pass

        return service._to_response(execution)
    except ValueError as e:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.EXECUTION_NOT_FOUND)
        )


@router.post("/executions/{execution_id}/resume", response_model=ProcessExecutionResponse)
async def resume_execution(
    execution_id: str,
    request: ProcessResumeRequest = None,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Continue a paused workflow
    
    Continues the workflow from where it was waiting (e.g., after approval).
    """
    user_dict = _user_to_dict(user)
    try:
        return await service.resume_execution(
            execution_id=execution_id,
            user_id=user_dict["id"],
            user_info=user_dict,
            resume_input=request.resume_input if request else {}
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=403, 
            detail=format_error_for_user(ErrorCode.PERMISSION_DENIED)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=format_error_for_user(ErrorCode.EXECUTION_CANNOT_RESUME)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=format_error_for_user(ErrorCode.EXECUTION_FAILED)
        )


@router.post("/executions/{execution_id}/cancel", response_model=ProcessExecutionResponse)
async def cancel_execution(
    execution_id: str,
    request: ProcessCancelRequest = None,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Cancel a workflow run
    
    Stops a running or paused workflow.
    """
    user_dict = _user_to_dict(user)
    try:
        return await service.cancel_execution(
            execution_id=execution_id,
            user_id=user_dict["id"],
            user_info=user_dict,
            reason=request.reason if request else None
        )
    except PermissionError as e:
        raise HTTPException(
            status_code=403, 
            detail=format_error_for_user(ErrorCode.PERMISSION_DENIED)
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail=format_error_for_user(ErrorCode.EXECUTION_CANNOT_CANCEL)
        )


@router.get("/executions/{execution_id}/steps")
async def get_step_executions(
    execution_id: str,
    include_io: bool = Query(False, description="Include step input/output payloads (sanitized)"),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get workflow step history
    
    Shows what happened at each step of the workflow run.
    """
    user_dict = _user_to_dict(user)
    from database.services.process_execution_service import ProcessExecutionService
    from core.process.messages import get_node_type_display, get_status_info, sanitize_for_user
    
    exec_service = ProcessExecutionService(db)
    
    # Verify execution belongs to org
    execution = exec_service.get_execution(execution_id)
    if not execution or str(execution.org_id) != user_dict["org_id"]:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.EXECUTION_NOT_FOUND)
        )

    # End-user privacy: only creator can view steps unless platform admin
    is_platform_admin = _is_platform_admin(user)
    is_creator = str(getattr(execution, "created_by", "")) == user_dict["id"]
    if not is_creator and not is_platform_admin:
        raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
    
    nodes = exec_service.get_node_executions(execution_id)

    def _sanitize_io(value: Any, _depth: int = 0) -> Any:
        if _depth >= 5:
            return "[truncated]"
        if value is None:
            return None
        if isinstance(value, (int, float, bool)):
            return value
        if isinstance(value, str):
            s = value
            if len(s) > 4000:
                return s[:4000] + "…"
            return s
        if isinstance(value, list):
            out = [_sanitize_io(v, _depth=_depth + 1) for v in value[:60]]
            if len(value) > 60:
                out.append("…")
            return out
        if isinstance(value, dict):
            # Special-case: uploaded file reference
            try:
                if value.get("kind") == "uploadedFile" and value.get("id"):
                    return {
                        "kind": "uploadedFile",
                        "id": value.get("id"),
                        "name": value.get("name"),
                        "content_type": value.get("content_type"),
                        "file_type": value.get("file_type"),
                        "size": value.get("size"),
                        "download_url": value.get("download_url"),
                    }
            except Exception:
                pass

            out = {}
            for k, v in list(value.items())[:80]:
                ks = str(k)
                kl = ks.lower()
                # Hide server filesystem paths and other internal fields
                if kl in ("path", "file_path", "filepath", "stored_path", "local_path"):
                    continue
                # Mask secrets/tokens
                if any(t in kl for t in ("token", "authorization", "api_key", "apikey", "secret", "password")):
                    out[ks] = "***MASKED***"
                    continue
                out[ks] = _sanitize_io(v, _depth=_depth + 1)
            if len(value) > 80:
                out["…"] = f"+{len(value) - 80} more"
            return out
        # Fallback: stringify
        try:
            return str(value)
        except Exception:
            return None
    
    return {
        "steps": [
            {
                "id": str(n.id),
                "node_id": n.node_id,
                "node_type": n.node_type,
                "step_name": n.node_name or get_node_type_display(n.node_type),
                "step_type": get_node_type_display(n.node_type),
                "order": n.execution_order,
                "status": get_status_info(n.status),
                "branch_taken": n.branch_taken,
                "error": sanitize_for_user(n.error_message) if n.error_message else None,
                "error_detail": (n.output_data or {}).get("error_detail") if isinstance(n.output_data, dict) else None,
                **({
                    "input": _sanitize_io(n.input_data),
                    "output": _sanitize_io(n.output_data),
                } if include_io else {}),
                "started_at": n.started_at.isoformat() if n.started_at else None,
                "completed_at": n.completed_at.isoformat() if n.completed_at else None,
                "duration_seconds": round(n.duration_ms / 1000, 2) if n.duration_ms else None
            }
            for n in nodes
        ],
        "total": len(nodes)
    }


@router.get("/executions/{execution_id}/pending-approvals", response_model=PendingApprovalDisplayResponse)
async def get_execution_pending_approvals(
    execution_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Request tracking helper: show who the request is waiting with (name/email + routing meaning).
    """
    user_dict = _user_to_dict(user)
    items = service.get_execution_pending_approvals_display(
        execution_id=execution_id,
        org_id=user_dict["org_id"],
        requester_user_id=user_dict["id"],
        is_platform_admin=_is_platform_admin(user),
    )
    return PendingApprovalDisplayResponse(items=items)


@router.post("/executions/{execution_id}/finalize-uploads", response_model=ProcessExecutionResponse)
async def finalize_execution_uploads(
    execution_id: str,
    request: FinalizeExecutionUploadsRequest,
    bg: BackgroundTasks,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
):
    """
    Portal helper: attach uploaded files to an execution and start processing.

    This keeps the submission experience fast: a reference is returned immediately,
    then attachments are uploaded and the execution begins.
    """
    user_dict = _user_to_dict(user)
    try:
        _logger.info("[FinalizeUploads] endpoint called for execution=%s user=%s files=%s",
                      execution_id, user_dict["id"], list((request.files or {}).keys()))
        response, should_run = await service.finalize_execution_uploads(
            execution_id=execution_id,
            org_id=user_dict["org_id"],
            user_id=user_dict["id"],
            files=request.files or {},
            is_platform_admin=_is_platform_admin(user),
        )
        _logger.info("[FinalizeUploads] execution_id=%s should_run=%s status=%s", response.id, should_run, response.status)
        if should_run:
            _logger.info("[FinalizeUploads] scheduling bg.add_task for %s", response.id)
            bg.add_task(_run_engine_background, str(response.id), _get_llm_registry())
        return response
    except PermissionError:
        raise HTTPException(
            status_code=403,
            detail=format_error_for_user(ErrorCode.PERMISSION_DENIED),
        )
    except ValueError as e:
        sanitized = sanitize_for_user(str(e))
        raise HTTPException(
            status_code=400,
            detail=problem_details_rfc9457(
                400, ErrorCode.VALIDATION_FAILED,
                detail_override=sanitized,
            ),
        )
    except Exception:
        logging.getLogger(__name__).exception("Finalize uploads failed")
        raise HTTPException(
            status_code=500,
            detail=problem_details_rfc9457(500, ErrorCode.EXECUTION_FAILED),
        )


# =============================================================================
# APPROVAL ENDPOINTS
# =============================================================================

@router.get("/approvals", response_model=ApprovalListResponse)
async def list_pending_approvals(
    include_org: bool = Query(
        False,
        description="If true (admins only), include all pending approvals in the organization",
    ),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    List your pending approvals
    
    Shows approval requests waiting for your decision.
    For assignees (user/role/group): only their approvals.
    For platform admin/superadmin: all pending approvals in the org (for testing processes run from the platform).
    """
    user_dict = _user_to_dict(user)
    is_platform_admin = (
        security_state.check_permission(user, Permission.SYSTEM_ADMIN.value) or
        security_state.check_permission(user, Permission.USERS_VIEW.value) or
        security_state.check_permission(user, Permission.USERS_EDIT.value)
    )
    approvals = service.get_pending_approvals(
        user_id=user_dict["id"],
        org_id=user_dict["org_id"],
        user_role_ids=user_dict.get("role_ids", []),
        user_group_ids=user_dict.get("group_ids", []),
        user_email=user_dict.get("email"),
        include_all_for_org_admin=(include_org and is_platform_admin),
    )
    return ApprovalListResponse(items=approvals, total=len(approvals))


@router.get("/approvals/{approval_id}", response_model=ApprovalRequestResponse)
async def get_approval(
    approval_id: str,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get approval request details
    
    Shows the details of an approval request for review.
    """
    user_dict = _user_to_dict(user)
    from database.services.process_execution_service import ProcessExecutionService
    
    exec_service = ProcessExecutionService(db)
    approval = exec_service.get_approval_request(approval_id)
    
    if not approval or str(approval.org_id) != user_dict["org_id"]:
        raise HTTPException(
            status_code=404, 
            detail=format_error_for_user(ErrorCode.APPROVAL_NOT_FOUND)
        )

    # Only assignees (or platform admins) can view the approval details
    is_platform_admin = _is_platform_admin(user)
    if not is_platform_admin and not _is_approval_visible_to_user(approval, user_dict):
        raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
    
    return service._approval_to_response(approval)


@router.post("/approvals/{approval_id}/decide", response_model=ApprovalRequestResponse)
async def decide_approval(
    approval_id: str,
    request: ApprovalDecisionRequest,
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Submit your approval decision
    
    Approve or reject the request. The workflow will continue based on your decision.
    """
    user_dict = _user_to_dict(user)
    if request.decision not in ["approved", "rejected"]:
        raise HTTPException(
            status_code=400, 
            detail="Please choose either 'Approve' or 'Reject'."
        )
    
    try:
        # Ensure user is allowed to decide this approval (assignee or platform admin)
        user_dict = _user_to_dict(user)
        approval = service.exec_service.get_approval_request(approval_id)
        if not approval or str(getattr(approval, "org_id", "")) != user_dict["org_id"]:
            raise HTTPException(status_code=404, detail=format_error_for_user(ErrorCode.APPROVAL_NOT_FOUND))
        is_platform_admin = _is_platform_admin(user)
        if not is_platform_admin and not _is_approval_visible_to_user(approval, user_dict):
            raise HTTPException(status_code=403, detail=format_error_for_user(ErrorCode.PERMISSION_DENIED))
        return await service.handle_approval_decision(
            approval_id=approval_id,
            user_id=user_dict["id"],
            decision=request.decision,
            comments=request.comments,
            decision_data=request.decision_data,
            user_info=user_dict
        )
    except ValueError as e:
        raise HTTPException(
            status_code=400, 
            detail="Unable to process your decision. The request may have already been processed."
        )


# =============================================================================
# STATISTICS ENDPOINTS
# =============================================================================

@router.get("/stats", response_model=ProcessStatsResponse)
async def get_workflow_stats(
    agent_id: Optional[str] = Query(None, description="Filter by workflow"),
    days: int = Query(30, ge=1, le=365, description="Time period in days"),
    service: ProcessAPIService = Depends(get_service),
    user: User = Depends(require_auth)
):
    """
    Get workflow statistics
    
    Shows summary statistics for your workflow runs.
    """
    user_dict = _user_to_dict(user)
    return service.get_stats(
        org_id=user_dict["org_id"],
        agent_id=agent_id,
        days=days
    )


# =============================================================================
# WEBHOOK ENDPOINT
# =============================================================================

@router.post("/webhook/{agent_id}")
async def process_webhook(
    agent_id: str,
    payload: Dict[str, Any],
    background_tasks: BackgroundTasks,
    correlation_id: Optional[str] = Query(None),
    service: ProcessAPIService = Depends(get_service),
    db: Session = Depends(get_db)
):
    """
    Webhook to start a workflow
    
    External systems can call this URL to start a workflow.
    The workflow runs in the background and the response is immediate.
    """
    from database.models import Agent
    import uuid as uuid_module
    
    # Get agent
    agent = db.query(Agent).filter(
        Agent.id == uuid_module.UUID(agent_id),
        Agent.agent_type == "process",
        Agent.is_published == True
    ).first()
    
    if not agent:
        raise HTTPException(
            status_code=404, 
            detail="Workflow not found or not published."
        )
    
    # Create execution ID
    execution_id = str(uuid_module.uuid4())
    
    # Start execution in background
    async def run_execution():
        await service.start_execution(
            agent_id=agent_id,
            org_id=str(agent.org_id),
            user_id=str(agent.owner_id),  # Use agent owner as trigger user
            trigger_input=payload,
            trigger_type="http_webhook",
            correlation_id=correlation_id
        )
    
    background_tasks.add_task(run_execution)
    
    return {
        "status": "accepted",
        "message": "Process execution started",
        "agent_id": agent_id,
        "correlation_id": correlation_id
    }


# =============================================================================
# CONFIGURATION ENDPOINTS
# =============================================================================

@router.get("/config/node-types")
async def get_node_types(
    category: Optional[str] = Query(None, description="Filter by category"),
    db: Session = Depends(get_db)
):
    """
    Get available node types for the process builder
    
    Returns all enabled node types that can be used in process definitions.
    This allows dynamic UI configuration without hardcoding.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    settings_service = ProcessSettingsService(db)
    
    if category:
        all_types = settings_service.get_node_types_by_category()
        return {
            "node_types": all_types.get(category, []),
            "category": category
        }
    
    return {
        "node_types": settings_service.get_node_types(),
        "categories": settings_service.get_node_types_by_category()
    }


@router.get("/config/settings")
async def get_org_process_settings(
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get organization's process settings
    
    Returns merged settings (system defaults + org overrides).
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    return settings_service.get_org_settings(user_dict["org_id"])


@router.put("/config/settings")
async def update_org_process_settings(
    updates: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Update organization's process settings
    
    Allows customizing defaults for the organization.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    return settings_service.update_org_settings(
        org_id=user_dict["org_id"],
        updates=updates,
        updated_by=user_dict["id"]
    )


@router.get("/available-models")
async def get_available_models(
    user: User = Depends(require_auth)
):
    """
    Return all configured and active AI models for use in AI Step dropdowns.
    """
    try:
        registry = LLMRegistry()
        models = registry.list_all(active_only=True)
        result = []
        for m in models:
            result.append({
                "id": m.model_id or m.id,
                "name": m.display_name,
                "provider": m.provider,
                "recommended": "gpt-4o" in (m.model_id or m.id).lower()
            })
        # If no models registered, return sensible defaults
        if not result:
            result = [
                {"id": "gpt-4o", "name": "GPT-4o (Recommended)", "provider": "openai", "recommended": True},
                {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Faster)", "provider": "openai", "recommended": False},
                {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet", "provider": "anthropic", "recommended": False}
            ]
        return {"models": result}
    except Exception as e:
        # Fallback defaults if registry fails
        return {"models": [
            {"id": "gpt-4o", "name": "GPT-4o (Recommended)", "provider": "openai", "recommended": True},
            {"id": "gpt-4o-mini", "name": "GPT-4o Mini (Faster)", "provider": "openai", "recommended": False},
            {"id": "claude-sonnet-4-20250514", "name": "Claude Sonnet", "provider": "anthropic", "recommended": False}
        ]}


@router.get("/config/templates")
async def get_process_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get available process templates
    
    Returns templates for quick-starting new processes.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    templates = settings_service.get_templates(
        org_id=user_dict["org_id"],
        category=category,
        include_public=True
    )
    
    return {"templates": templates}


@router.post("/config/templates")
async def create_process_template(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Create a new process template
    
    Save a process definition as a reusable template.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    settings_service = ProcessSettingsService(db)
    
    template = settings_service.create_template(
        name=request.get('name', 'Untitled Template'),
        process_definition=request.get('process_definition', {}),
        description=request.get('description'),
        category=request.get('category', 'general'),
        is_public=request.get('is_public', False),
        org_id=user_dict["org_id"],
        created_by=user_dict["id"]
    )
    
    return template


@router.post("/config/templates/{template_id}/use")
async def use_process_template(
    template_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Use a template to create a new process
    
    Returns the template's process definition for use.
    """
    from database.services.process_settings_service import ProcessSettingsService
    
    settings_service = ProcessSettingsService(db)
    
    try:
        template = settings_service.use_template(template_id)
        return template
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


# =============================================================================
# WIZARD ENDPOINTS (AI-powered workflow creation)
# =============================================================================


async def _analyze_goal_prerequisites(
    goal: str,
    context: Dict[str, Any],
    llm,
) -> Optional[Dict[str, Any]]:
    """
    Use the LLM to intelligently analyze the goal text and identify
    every platform entity the workflow would require.
    Returns structured JSON or None on failure.
    """
    import json as _json

    departments = context.get("departments") or []
    groups = context.get("groups") or []
    roles = context.get("roles") or []
    tools = context.get("tools") or context.get("available_tools") or []
    identity_ctx = context.get("identity_context") or {}

    dept_info = ", ".join(
        f"{d.get('name', '?')}"
        + (f" (manager: {d['manager_name']})" if d.get("manager_name") else " (no manager)")
        for d in departments
    ) if departments else "None created yet"
    group_info = ", ".join(g.get("name", "?") for g in groups) if groups else "None created yet"
    role_info = ", ".join(r.get("name", "?") for r in roles) if roles else "None created yet"
    tool_info = ", ".join(t.get("name", "?") for t in tools) if tools else "None created yet"
    id_status = (
        "Configured" if identity_ctx.get("source")
        and identity_ctx["source"] != "none" else "Not configured"
    )
    has_mgrs = (
        "Yes" if identity_ctx.get("capabilities", {}).get("has_managers")
        else "No"
    )

    system_prompt = (
        "You extract platform entities from workflow descriptions. "
        "Return ONLY valid JSON — no markdown, no explanation. "
        "CRITICAL: Only extract entities that are EXPLICITLY mentioned "
        "or directly implied by the text. Never invent or assume."
    )

    user_prompt = f"""What entities does this workflow EXPLICITLY need?

CURRENTLY AVAILABLE ON THE PLATFORM:
- Departments: {dept_info}
- Teams/Groups: {group_info}
- Roles: {role_info}
- Tools/Integrations: {tool_info}
- Employee Directory: {id_status}
- Managers assigned to employees: {has_mgrs}

WORKFLOW DESCRIPTION:
"{goal}"

Return this exact JSON structure:
{{
  "departments": [{{"name": "ProperName", "why": "quote from description"}}],
  "groups": [{{"name": "ProperName", "why": "quote from description"}}],
  "roles": [],
  "tools": [],
  "needs_manager_routing": false,
  "needs_escalation_hierarchy": false,
  "needs_identity_directory": false
}}

STRICT RULES — READ CAREFULLY:

ENTITY EXTRACTION (MOST IMPORTANT — do this FIRST):
1. departments = ANY organizational unit mentioned by name, even if combined with a job title.
   ALWAYS extract the unit name. Examples across different domains:
   - "Finance Manager" → dept "Finance"
   - "Operations Director" → dept "Operations"
   - "IT Department" → dept "IT"
   - "HR Director" → dept "HR"
   - "Legal Counsel from the Legal department" → dept "Legal"
   - "Marketing team lead" → dept "Marketing"
2. groups = teams or committees mentioned by name.
   - "quality assurance team" → group "Quality Assurance"
   - "procurement committee" → group "Procurement"
   - "review board" → group "Review Board"
   - "safety inspection team" → group "Safety Inspection"
3. roles = specific named roles ONLY if explicitly mentioned as a role to assign
   - "assign to the Compliance Officer role" → role "Compliance Officer"
   - "the Safety Inspector must approve" → role "Safety Inspector"
4. tools = external systems ONLY if the description explicitly says to connect to, send to, or fetch from them
   - "send to SAP", "update Jira", "sync with Salesforce", "post to Slack", "log in ServiceNow"

BOOLEAN FLAGS (set AFTER extracting entities):
5. needs_manager_routing = true if the description mentions routing to a "manager", "supervisor", or direct report chain
6. needs_escalation_hierarchy = true if the description mentions escalation to a higher level (e.g. "department head", "senior manager", "VP", "executive")
7. needs_identity_directory = true if the workflow needs employee profile data (names, emails, employee IDs, custom fields)

CRITICAL — DUAL EXTRACTION:
8. An entity can appear in BOTH an array AND trigger a boolean flag. For example:
   "route to Operations Manager for approval and escalate to Department Head" →
   departments: [{{"name": "Operations", "why": "route to Operations Manager"}}],
   needs_manager_routing: true, needs_escalation_hierarchy: true

QUALITY RULES:
9. ONLY extract entities EXPLICITLY mentioned in the description
10. "why" MUST contain a direct quote proving the entity is needed. No quote = do not include
11. Use proper display names — strip job titles: "Finance Manager" → "Finance"
12. Return empty arrays [] when none found
13. When in doubt, DO NOT include it — false negatives > false positives
14. NEVER invent entities not in the description
15. Works for ANY domain — do not assume domain-specific entities"""

    try:
        from core.llm.base import Message, MessageRole
    except ImportError:
        try:
            from core.llm.models import Message, MessageRole
        except ImportError:
            return None

    messages = [
        Message(role=MessageRole.SYSTEM, content=system_prompt),
        Message(role=MessageRole.USER, content=user_prompt),
    ]

    response = await llm.chat(
        messages=messages, temperature=0.1, max_tokens=600,
    )
    content = getattr(response, "content", None) or str(response)

    text = content.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else text[3:]
        if text.endswith("```"):
            text = text[:-3]
        text = text.strip()

    result = _json.loads(text)

    # ── Anti-hallucination: ground every entity against the goal text ──
    # Each entity name must have at least one significant word present
    # in the original description.  If not, it was likely hallucinated.
    goal_lower = (goal or "").lower()
    _noise_words = {
        "the", "a", "an", "of", "and", "or", "to", "for", "in", "on",
        "at", "by", "is", "it", "as", "if", "be", "do", "no", "not",
        "so", "up", "my", "we", "he", "me", "us",
        "department", "dept", "team", "group", "committee", "board",
        "manager", "director", "head", "lead", "leader", "officer",
        "supervisor", "chief", "unit", "division", "role", "system",
        "tool", "integration", "service",
    }

    def _is_grounded(entity_name: str) -> bool:
        """Check that at least one significant word from the entity
        name actually appears in the goal text.  Handles uppercase
        abbreviations (IT, HR, QA) by checking the original-case goal
        with word-boundary matching."""
        import re as _ground_re

        words = entity_name.lower().split()
        significant = [w for w in words if w not in _noise_words and len(w) >= 2]

        if significant:
            return any(w in goal_lower for w in significant)

        # All lowercase words were filtered as noise — check if any
        # original-case word is a short uppercase abbreviation (e.g.
        # "IT", "HR", "QA") that appears as a standalone word in the
        # original goal text.
        for w in entity_name.split():
            if len(w) >= 2 and w.isupper():
                if _ground_re.search(r'\b' + _ground_re.escape(w) + r'\b', goal):
                    return True

        return False

    for key in ("departments", "groups", "roles", "tools"):
        items = result.get(key)
        if not isinstance(items, list):
            result[key] = []
            continue
        result[key] = [
            item for item in items
            if isinstance(item, dict) and _is_grounded(item.get("name", ""))
        ]

    return result


async def _pre_check_platform_readiness(
    goal: str,
    context: Dict[str, Any],
    user_permissions: List[str] = None,
    llm=None,
) -> List[Dict[str, Any]]:
    """
    LLM-powered pre-generation readiness check.

    Uses the AI to intelligently analyze the goal text and identify
    what platform entities the workflow requires. Then cross-references
    against existing platform state to find gaps.

    Falls back to basic structural checks if no LLM is available.
    After generation, _validate_process_prerequisites does a thorough
    node-by-node scan for any remaining issues.
    """
    perms = set(user_permissions or [])
    is_admin = "full_admin" in perms or "system:admin" in perms

    identity_ctx = context.get("identity_context") or {}
    caps = identity_ctx.get("capabilities", {})
    departments = context.get("departments") or []
    groups = context.get("groups") or []
    roles = context.get("roles") or []
    tools = context.get("tools") or context.get("available_tools") or []

    dept_names_lower = {(d.get("name") or "").lower(): d for d in departments}
    group_names_lower = {(g.get("name") or "").lower(): g for g in groups}
    role_names_lower = {(r.get("name") or "").lower(): r for r in roles}

    issues: List[Dict[str, Any]] = []
    seen: set = set()

    def _can(perm: str) -> bool:
        return is_admin or perm in perms

    def _admin_note(can: bool) -> str:
        if can:
            return ""
        return (
            " You don't have permission to do this yourself."
            " Please ask your system administrator to set this up."
        )

    def _perm_warning(can: bool) -> Optional[str]:
        if can:
            return None
        return (
            "You don't have permission to set this up yourself. "
            "Please ask your system administrator to do it for you."
        )

    def _add(key: str, item: dict):
        if key not in seen:
            seen.add(key)
            issues.append(item)

    # ══════════════════════════════════════════════════════════════════
    # LLM-BASED ANALYSIS — let the AI understand the goal
    # ══════════════════════════════════════════════════════════════════
    llm_analysis = None
    if llm:
        try:
            llm_analysis = await _analyze_goal_prerequisites(
                goal, context, llm,
            )
        except Exception as e:
            print(
                f"⚠️  [Pre-check] LLM analysis failed, "
                f"falling back to structural checks: {e}"
            )

    if llm_analysis:
        # ── Departments ──────────────────────────────────────────────
        for dept in llm_analysis.get("departments") or []:
            name = (dept.get("name") or "").strip()
            if not name:
                continue
            name_lower = name.lower()

            if name_lower not in dept_names_lower:
                can = _can("users:edit")
                _add(f"dept_missing:{name_lower}", {
                    "type": "department", "icon": "building",
                    "entity_name": name,
                    "referenced_by": "Your workflow description",
                    "message": (
                        f"The \"{name}\" department has not been created "
                        f"on the platform yet. This workflow needs it to "
                        f"route work correctly."
                    ),
                    "guidance": (
                        f"Create the \"{name}\" department and assign "
                        f"a manager to it."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access → Organization → People & Departments",
                        f"Click + New Department and name it \"{name}\"",
                        "Choose a department manager",
                        "Save",
                    ] if can else [],
                    "can_create": can,
                    "permission_warning": _perm_warning(can),
                })
            else:
                d = dept_names_lower[name_lower]
                if not d.get("has_manager"):
                    can = _can("users:edit")
                    _add(f"dept_no_mgr:{name_lower}", {
                        "type": "department", "icon": "hierarchy",
                        "entity_name": f"{name} — Manager",
                        "referenced_by": "Your workflow description",
                        "message": (
                            f"The \"{name}\" department exists but has no "
                            f"manager assigned. This workflow routes work "
                            f"to the department manager for "
                            f"approval/decisions."
                        ),
                        "guidance": (
                            f"Assign a manager to the \"{name}\" department."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            f"Select the \"{name}\" department",
                            "Set the Manager field",
                            "Save",
                        ] if can else [],
                        "can_create": can,
                        "permission_warning": _perm_warning(can),
                    })

        # ── Groups / Teams ───────────────────────────────────────────
        for grp in llm_analysis.get("groups") or []:
            name = (grp.get("name") or "").strip()
            if not name:
                continue
            name_lower = name.lower()

            if name_lower not in group_names_lower:
                can = _can("users:edit")
                _add(f"group_missing:{name_lower}", {
                    "type": "group", "icon": "people",
                    "entity_name": name,
                    "referenced_by": "Your workflow description",
                    "message": (
                        f"The \"{name}\" team has not been created on the "
                        f"platform yet. This workflow needs it to route "
                        f"work or notifications."
                    ),
                    "guidance": (
                        f"Create a \"{name}\" team and add the relevant "
                        f"members to it."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access → Groups",
                        f"Click + Create Group and name it \"{name}\"",
                        "Add the team members",
                        "Save",
                    ] if can else [],
                    "can_create": can,
                    "permission_warning": _perm_warning(can),
                })

        # ── Roles ────────────────────────────────────────────────────
        for role in llm_analysis.get("roles") or []:
            name = (role.get("name") or "").strip()
            if not name:
                continue
            name_lower = name.lower()

            if name_lower not in role_names_lower:
                can = _can("users:edit")
                _add(f"role_missing:{name_lower}", {
                    "type": "role", "icon": "shield",
                    "entity_name": name,
                    "referenced_by": "Your workflow description",
                    "message": (
                        f"The \"{name}\" role has not been created on the "
                        f"platform yet. This workflow needs it to assign "
                        f"responsibilities."
                    ),
                    "guidance": (
                        f"Create the \"{name}\" role and assign it to "
                        f"the right people."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access → Roles",
                        f"Click + Create Role and name it \"{name}\"",
                        "Assign the role to the relevant users",
                    ] if can else [],
                    "can_create": can,
                    "permission_warning": _perm_warning(can),
                })

        # ── Tools / Integrations ─────────────────────────────────────
        for tool in llm_analysis.get("tools") or []:
            name = (tool.get("name") or "").strip()
            if not name:
                continue
            can = _can("tools:create")
            _add(f"tool_missing:{name.lower()}", {
                "type": "tool", "icon": "wrench",
                "entity_name": name,
                "referenced_by": "Your workflow description",
                "message": (
                    f"The \"{name}\" integration has not been set up on "
                    f"the platform yet. This workflow needs it to "
                    f"connect to external systems."
                ),
                "guidance": (
                    f"Set up the \"{name}\" integration."
                ) + _admin_note(can),
                "steps": [
                    "Go to Tools in the sidebar",
                    "Click + Create Tool",
                    f"Set it up as \"{name}\"",
                    "Configure the connection details",
                    "Test the connection and save",
                ] if can else [],
                "can_create": can,
                "permission_warning": _perm_warning(can),
            })

        # ── Manager routing ──────────────────────────────────────────
        if llm_analysis.get("needs_manager_routing") and not caps.get("has_managers"):
            can = _can("users:edit")
            _add("no_managers", {
                "type": "identity", "icon": "hierarchy",
                "entity_name": "Manager Assignments",
                "referenced_by": "Your workflow description",
                "message": (
                    "This workflow routes work to managers for approval, "
                    "but no managers have been assigned to any employees "
                    "on the platform yet. The platform cannot determine "
                    "who should approve requests without this."
                ),
                "guidance": (
                    "Assign managers to employees so the platform knows "
                    "who should approve their requests."
                ) + _admin_note(can),
                "steps": [
                    "Go to Users & Access → Organization → People & Departments",
                    "Click on an employee's name",
                    "Set their Manager field to their direct supervisor",
                    "Save, and repeat for other employees",
                ] if can else [],
                "can_create": can,
                "permission_warning": _perm_warning(can),
            })

        # ── Escalation hierarchy ─────────────────────────────────────
        if llm_analysis.get("needs_escalation_hierarchy"):
            can = _can("users:edit")
            if not departments:
                _add("escalation_no_depts", {
                    "type": "identity", "icon": "hierarchy",
                    "entity_name": "Escalation Path",
                    "referenced_by": "Your workflow description",
                    "message": (
                        "This workflow includes escalation routing, but "
                        "no departments have been created on the platform "
                        "yet. Departments and their managers are needed "
                        "for escalation to work."
                    ),
                    "guidance": (
                        "Create the departments referenced in your "
                        "workflow and assign a manager to each one."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access → Organization → People & Departments",
                        "Click + New Department",
                        "Give it a name and assign a manager",
                        "Save, and repeat for each department",
                    ] if can else [],
                    "can_create": can,
                    "permission_warning": _perm_warning(can),
                })
            else:
                depts_no_mgr = [
                    d.get("name", "?") for d in departments
                    if not d.get("has_manager")
                ]
                if depts_no_mgr:
                    names_preview = ", ".join(
                        f"\"{n}\"" for n in depts_no_mgr[:4]
                    )
                    if len(depts_no_mgr) > 4:
                        names_preview += f" and {len(depts_no_mgr) - 4} more"
                    _add("escalation_no_mgrs", {
                        "type": "identity", "icon": "hierarchy",
                        "entity_name": "Escalation Path",
                        "referenced_by": "Your workflow description",
                        "message": (
                            f"This workflow includes escalation routing, "
                            f"but {len(depts_no_mgr)} department(s) have "
                            f"no manager assigned: {names_preview}. "
                            f"Escalation requires department managers to "
                            f"be set."
                        ),
                        "guidance": (
                            "Assign a manager to each department that "
                            "doesn't have one yet."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            "Select each department without a manager",
                            "Set the Manager field",
                            "Save",
                        ] if can else [],
                        "can_create": can,
                        "permission_warning": _perm_warning(can),
                    })

        # ── Identity directory ───────────────────────────────────────
        if llm_analysis.get("needs_identity_directory"):
            id_source = identity_ctx.get("source", "")
            if not id_source or id_source == "none":
                can = _can("system:settings")
                _add("no_identity", {
                    "type": "identity", "icon": "settings",
                    "entity_name": "Employee Directory",
                    "referenced_by": "Your workflow description",
                    "message": (
                        "Your workflow needs employee data (managers, "
                        "departments, profiles), but the Employee Directory "
                        "hasn't been configured yet."
                    ),
                    "guidance": (
                        "Set up the Employee Directory first."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Settings in the sidebar",
                        "Find \"Identity & Employee Directory\"",
                        "Choose your directory source",
                        "Complete the setup and save",
                    ] if can else [],
                    "can_create": can,
                    "permission_warning": _perm_warning(can),
                })

    else:
        # ══════════════════════════════════════════════════════════════
        # FALLBACK — no LLM available, basic structural checks only
        # ══════════════════════════════════════════════════════════════
        id_source = identity_ctx.get("source", "")
        if not id_source or id_source == "none":
            can = _can("system:settings")
            _add("no_identity", {
                "type": "identity", "icon": "settings",
                "entity_name": "Employee Directory",
                "referenced_by": "Your workflow description",
                "message": (
                    "The Employee Directory hasn't been configured yet. "
                    "Most workflows need organizational data to route "
                    "work to the right people."
                ),
                "guidance": (
                    "Set up the Employee Directory first."
                ) + _admin_note(can),
                "steps": [
                    "Go to Settings in the sidebar",
                    "Find \"Identity & Employee Directory\"",
                    "Choose your directory source",
                    "Complete the setup and save",
                ] if can else [],
                "can_create": can,
                "permission_warning": _perm_warning(can),
            })

        if not departments and not groups and not roles:
            can = _can("users:edit")
            _add("no_org_structure", {
                "type": "identity", "icon": "hierarchy",
                "entity_name": "Organization Structure",
                "referenced_by": "Your workflow description",
                "message": (
                    "No organizational structure has been set up yet "
                    "(no departments, teams, or roles). Workflows need "
                    "this to route work to the right people."
                ),
                "guidance": (
                    "Set up your organization structure — create "
                    "departments, assign managers, or create teams."
                ) + _admin_note(can),
                "steps": [
                    "Go to Users & Access → Organization → People & Departments",
                    "Create departments for your organization",
                    "Assign managers to departments",
                    "Assign employees to their departments",
                ] if can else [],
                "can_create": can,
                "permission_warning": _perm_warning(can),
            })

    return issues


def _validate_process_prerequisites(
    process_def: Dict[str, Any],
    context: Dict[str, Any],
    user_permissions: List[str] = None,
) -> List[Dict[str, Any]]:
    """
    Comprehensive post-generation validator.

    Scans every node in a generated process definition to verify that ALL
    referenced platform entities actually exist and are properly configured.

    Checks:
      - Departments (exist? have a manager? have members?)
      - Groups / Teams (exist? have members?)
      - Roles (exist? assigned to anyone?)
      - Tools / Integrations (exist? configured?)
      - Sub-processes / call_process (exist? still published?)
      - Manager assignments (identity directory has managers?)
      - Department structure (any departments exist at all?)
      - Identity directory (is it configured?)
      - Custom profile fields (referenced in forms / templates)
      - Notification recipients (valid targets?)

    Returns a list of business-friendly prerequisite items.
    An empty list means everything the process needs is already in place.
    """
    import re as _re

    nodes = process_def.get("nodes") or []
    if not nodes:
        return []

    perms = set(user_permissions or [])
    is_admin = "full_admin" in perms or "system:admin" in perms

    # ── Build lookup indexes ────────────────────────────────────────
    dept_by_name: Dict[str, dict] = {}
    dept_by_id: Dict[str, dict] = {}
    for d in (context.get("departments") or []):
        dept_by_name[(d.get("name") or "").lower()] = d
        dept_by_id[str(d.get("id", ""))] = d

    group_by_name: Dict[str, dict] = {}
    group_by_id: Dict[str, dict] = {}
    for g in (context.get("groups") or []):
        group_by_name[(g.get("name") or "").lower()] = g
        group_by_id[str(g.get("id", ""))] = g

    role_by_name: Dict[str, dict] = {}
    role_by_id: Dict[str, dict] = {}
    for r in (context.get("roles") or []):
        role_by_name[(r.get("name") or "").lower()] = r
        role_by_id[str(r.get("id", ""))] = r

    tool_by_id: Dict[str, dict] = {}
    for t in (context.get("tools") or context.get("available_tools") or []):
        tid = str(t.get("id") or "")
        if tid:
            tool_by_id[tid] = t

    proc_by_id: Dict[str, dict] = {}
    for p in (context.get("published_processes") or []):
        proc_by_id[str(p.get("id", ""))] = p

    identity_ctx = context.get("identity_context") or {}
    caps = identity_ctx.get("capabilities", {})

    available_attrs = context.get("available_user_attributes") or {}
    known_attr_keys: set = set()
    for f in (available_attrs.get("standard") or []):
        known_attr_keys.add((f.get("key") or "").lower())
    for f in (available_attrs.get("custom") or []):
        known_attr_keys.add((f.get("key") or "").lower())

    prerequisites: List[Dict[str, Any]] = []
    seen: set = set()

    def _can(perm: str) -> bool:
        return is_admin or perm in perms

    def _add(key: str, item: dict):
        if key not in seen:
            seen.add(key)
            prerequisites.append(item)

    def _cfg(node: dict) -> dict:
        c = node.get("config") or {}
        if isinstance(c, dict) and "config" in c:
            c = c["config"]
        if not isinstance(c, dict):
            c = {}
        d = node.get("data") or {}
        if isinstance(d, dict) and "config" in d and not c:
            c = d["config"]
        return c

    def _admin_note(can: bool) -> str:
        return "" if can else " Please reach out to your system administrator to set this up."

    # Regex to find custom field references in templates / prompts
    _ctx_re = _re.compile(r'\{\{\s*(?:trigger_input\.)?_user_context\.(\w+)\s*\}\}')

    # ── Pre-loop: identity directory itself ─────────────────────────
    # We defer adding this until we know the process actually needs identity
    _needs_identity = False

    # ================================================================
    #  MAIN NODE SCAN
    # ================================================================
    for node in nodes:
        if not isinstance(node, dict):
            continue
        node_type = (node.get("type") or "").lower()
        node_label = node.get("name") or node.get("label") or node_type.replace("_", " ").title()
        config = _cfg(node)
        config_text = str(config)

        # ────────────────────────────────────────────────────────────
        # 1. DEPARTMENTS — missing, no manager, no members
        # ────────────────────────────────────────────────────────────
        dept_name_ref = config.get("assignee_department_name") or ""
        dept_id_ref = str(config.get("department_id") or "")

        if dept_name_ref:
            d_lower = dept_name_ref.lower()
            existing = dept_by_name.get(d_lower)
            if not existing:
                can = _can("users:edit")
                _add(f"dept:{d_lower}", {
                    "type": "department", "icon": "building",
                    "entity_name": dept_name_ref,
                    "referenced_by": node_label,
                    "message": (
                        f"This workflow sends work to the \"{dept_name_ref}\" "
                        f"department, but it hasn't been created on the platform yet."
                    ),
                    "guidance": (
                        f"Create the \"{dept_name_ref}\" department and assign "
                        f"a head / manager who will handle approvals."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access in the sidebar",
                        "Open the Organization tab",
                        "Click People & Departments",
                        f"Click + New Department and name it \"{dept_name_ref}\"",
                        "Choose a manager (department head)",
                        "Save",
                    ] if can else [],
                    "can_create": can,
                })
            else:
                # Department exists — does it have a manager?
                dir_type = (config.get("directory_assignee_type") or "").lower()
                if dir_type in ("department_manager", "department_head") and not existing.get("has_manager"):
                    can = _can("users:edit")
                    _add(f"dept_mgr:{d_lower}", {
                        "type": "department", "icon": "building",
                        "entity_name": f"{dept_name_ref} — No Manager",
                        "referenced_by": node_label,
                        "message": (
                            f"The \"{dept_name_ref}\" department exists, but it "
                            f"doesn't have a manager assigned yet. The workflow "
                            f"needs a department manager to handle the approval "
                            f"in \"{node_label}\"."
                        ),
                        "guidance": (
                            f"Open the \"{dept_name_ref}\" department and assign "
                            f"a manager."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            f"Click on \"{dept_name_ref}\"",
                            "Click Edit",
                            "Select a manager from the dropdown",
                            "Save",
                        ] if can else [],
                        "can_create": can,
                    })
                # Does it have members? (relevant for department_members routing)
                if dir_type == "department_members" and existing.get("member_count", 0) == 0:
                    can = _can("users:edit")
                    _add(f"dept_empty:{d_lower}", {
                        "type": "department", "icon": "building",
                        "entity_name": f"{dept_name_ref} — No Members",
                        "referenced_by": node_label,
                        "message": (
                            f"The \"{dept_name_ref}\" department exists but has "
                            f"no members. The step \"{node_label}\" sends to all "
                            f"department members, so at least one person needs to "
                            f"be assigned to this department."
                        ),
                        "guidance": (
                            f"Assign employees to the \"{dept_name_ref}\" department."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Users",
                            "Edit each relevant user's profile",
                            f"Set their department to \"{dept_name_ref}\"",
                            "Save each user",
                        ] if can else [],
                        "can_create": can,
                    })
        elif dept_id_ref and dept_id_ref not in dept_by_id and dept_id_ref not in ("", "None"):
            can = _can("users:edit")
            _add(f"dept_id:{dept_id_ref}", {
                "type": "department", "icon": "building",
                "entity_name": "Department",
                "referenced_by": node_label,
                "message": (
                    f"The step \"{node_label}\" refers to a department that "
                    f"no longer exists on the platform. It may have been deleted."
                ),
                "guidance": (
                    "Open the workflow builder and select an existing "
                    "department for this step."
                ),
                "steps": [], "can_create": False,
            })

        # ────────────────────────────────────────────────────────────
        # 2. NOTIFICATION RECIPIENTS
        # ────────────────────────────────────────────────────────────
        if node_type == "notification":
            recipient = str(config.get("recipient") or "")

            # dept_manager:<id> / dept_members:<id>
            for pfx, label_tpl in [
                ("dept_manager:", "the head of a department"),
                ("dept_members:", "all members of a department"),
            ]:
                if recipient.startswith(pfx):
                    rid = recipient[len(pfx):]
                    if rid and rid not in dept_by_id:
                        can = _can("users:edit")
                        _add(f"notif_dept:{rid}", {
                            "type": "department", "icon": "building",
                            "entity_name": "Department",
                            "referenced_by": node_label,
                            "message": (
                                f"The message \"{node_label}\" is addressed to "
                                f"{label_tpl} that no longer exists."
                            ),
                            "guidance": (
                                "Create the department or update this message "
                                "to send to a different recipient."
                            ) + _admin_note(can),
                            "steps": [], "can_create": can,
                        })
                    elif rid and rid in dept_by_id:
                        dd = dept_by_id[rid]
                        if pfx == "dept_manager:" and not dd.get("has_manager"):
                            can = _can("users:edit")
                            dn = dd.get("name", "this department")
                            _add(f"notif_dept_mgr:{rid}", {
                                "type": "department", "icon": "building",
                                "entity_name": f"{dn} — No Manager",
                                "referenced_by": node_label,
                                "message": (
                                    f"The message \"{node_label}\" is sent to the "
                                    f"manager of \"{dn}\", but no manager has been "
                                    f"assigned to that department yet."
                                ),
                                "guidance": (
                                    f"Assign a manager to the \"{dn}\" department."
                                ) + _admin_note(can),
                                "steps": [
                                    "Go to Users & Access → Organization → People & Departments",
                                    f"Click on \"{dn}\" → Edit",
                                    "Select a manager and save",
                                ] if can else [],
                                "can_create": can,
                            })

            # group:<id>
            if recipient.startswith("group:"):
                gid = recipient[len("group:"):]
                if gid and gid not in group_by_id:
                    can = _can("users:edit")
                    _add(f"notif_group:{gid}", {
                        "type": "group", "icon": "people",
                        "entity_name": "Team / Group",
                        "referenced_by": node_label,
                        "message": (
                            f"The message \"{node_label}\" is addressed to a "
                            f"team that doesn't exist yet."
                        ),
                        "guidance": (
                            "Create the team / group and add members to it."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Groups",
                            "Click + Create Group",
                            "Name it, add the right people, and save",
                        ] if can else [],
                        "can_create": can,
                    })

            # role:<id>
            if recipient.startswith("role:"):
                rid = recipient[len("role:"):]
                if rid and rid not in role_by_id:
                    can = _can("users:edit")
                    _add(f"notif_role:{rid}", {
                        "type": "role", "icon": "shield",
                        "entity_name": "Role",
                        "referenced_by": node_label,
                        "message": (
                            f"The message \"{node_label}\" is addressed to a "
                            f"role that doesn't exist yet."
                        ),
                        "guidance": (
                            "Create the role and assign it to the right people."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Roles",
                            "Click + Create Role",
                            "Name it, then assign it to the relevant users",
                        ] if can else [],
                        "can_create": can,
                    })

            # "manager" or "department_head" recipients require identity data
            if recipient in ("manager", "department_head", "skip_level_2", "skip_level_3"):
                _needs_identity = True

        # ────────────────────────────────────────────────────────────
        # 3. APPROVAL NODES — groups, roles, managers, departments
        # ────────────────────────────────────────────────────────────
        if node_type == "approval":
            source = (config.get("assignee_source") or "").lower()
            dir_type = (config.get("directory_assignee_type") or "").lower()
            _needs_identity = _needs_identity or source == "user_directory"

            # — Groups —
            gid_list = config.get("group_ids") or []
            if source == "platform_group":
                gid_list = config.get("assignee_ids") or gid_list
            if source in ("platform_group",) or dir_type == "group":
                for gid in (gid_list if isinstance(gid_list, list) else [gid_list]):
                    gs = str(gid or "")
                    if gs and gs not in group_by_id:
                        can = _can("users:edit")
                        _add(f"appr_group:{gs}", {
                            "type": "group", "icon": "people",
                            "entity_name": "Team / Group",
                            "referenced_by": node_label,
                            "message": (
                                f"The approval step \"{node_label}\" is assigned to "
                                f"a team / group that hasn't been created yet."
                            ),
                            "guidance": (
                                "Create the team, add the people who should "
                                "review and approve requests, and save."
                            ) + _admin_note(can),
                            "steps": [
                                "Go to Users & Access → Groups",
                                "Click + Create Group",
                                "Give it a clear name that describes the team's purpose",
                                "Add the people who will approve these requests",
                                "Save",
                            ] if can else [],
                            "can_create": can,
                        })

            # — Roles —
            rid_list = config.get("role_ids") or []
            if source == "platform_role":
                rid_list = config.get("assignee_ids") or rid_list
            if source in ("platform_role",) or dir_type == "role":
                for rid in (rid_list if isinstance(rid_list, list) else [rid_list]):
                    rs = str(rid or "")
                    if rs and rs not in role_by_id:
                        can = _can("users:edit")
                        _add(f"appr_role:{rs}", {
                            "type": "role", "icon": "shield",
                            "entity_name": "Role",
                            "referenced_by": node_label,
                            "message": (
                                f"The approval step \"{node_label}\" is assigned "
                                f"to a role that hasn't been created yet."
                            ),
                            "guidance": (
                                "Create the role and assign it to the people "
                                "who should be able to approve these requests."
                            ) + _admin_note(can),
                            "steps": [
                                "Go to Users & Access → Roles",
                                "Click + Create Role",
                                "Name it clearly to reflect the approval responsibility",
                                "Assign the role to the right people",
                            ] if can else [],
                            "can_create": can,
                        })

            # — Static users —
            if source == "platform_user":
                uid_list = config.get("assignee_ids") or config.get("user_ids") or []
                if not uid_list or (isinstance(uid_list, list) and all(not u for u in uid_list)):
                    _add("appr_no_user", {
                        "type": "identity", "icon": "person",
                        "entity_name": "Approver Not Selected",
                        "referenced_by": node_label,
                        "message": (
                            f"The approval step \"{node_label}\" is set to a "
                            f"specific person, but no one has been selected yet."
                        ),
                        "guidance": (
                            "Open the workflow builder, click on this approval "
                            "step, and choose who should approve these requests."
                        ),
                        "steps": [], "can_create": True,
                    })

            # — No departments at all —
            if dir_type == "department_manager" and not dept_name_ref:
                if not dept_by_id:
                    can = _can("users:edit")
                    _add("no_departments", {
                        "type": "department", "icon": "building",
                        "entity_name": "Departments",
                        "referenced_by": node_label,
                        "message": (
                            "This workflow routes approvals through department "
                            "managers, but no departments have been created yet."
                        ),
                        "guidance": (
                            "Create your organization's departments, then "
                            "assign a manager to each one."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            "Click + New Department",
                            "Name it, choose a manager, and save",
                            "Repeat for each department your organization needs",
                        ] if can else [],
                        "can_create": can,
                    })

            # — No managers assigned anywhere —
            if dir_type in ("dynamic_manager", "") and source == "user_directory":
                if not caps.get("has_managers"):
                    can = _can("users:edit")
                    _add("no_managers", {
                        "type": "identity", "icon": "hierarchy",
                        "entity_name": "Manager Assignments",
                        "referenced_by": node_label,
                        "message": (
                            "This workflow sends approvals to the submitter's "
                            "direct manager, but no managers have been assigned "
                            "to any employees yet."
                        ),
                        "guidance": (
                            "Open People & Departments and assign a manager "
                            "to each employee who will use this workflow."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            "Click on an employee's name",
                            "Set their Manager field",
                            "Save, and repeat for other employees",
                        ] if can else [],
                        "can_create": can,
                    })

            # — Management chain (skip-level) without enough depth —
            if dir_type == "management_chain":
                level = config.get("management_level", 2)
                if not caps.get("has_managers"):
                    can = _can("users:edit")
                    _add("no_mgmt_chain", {
                        "type": "identity", "icon": "hierarchy",
                        "entity_name": f"Management Chain (Level {level})",
                        "referenced_by": node_label,
                        "message": (
                            f"This workflow escalates approvals to level-{level} "
                            f"management (manager's manager), but no management "
                            f"hierarchy has been configured yet."
                        ),
                        "guidance": (
                            "Set up the management chain by assigning a manager "
                            "to each employee, ensuring the chain goes at least "
                            f"{level} levels deep."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → People & Departments",
                            "Assign managers to employees (Employee → Manager → Senior Manager)",
                            f"Make sure the chain is at least {level} levels deep",
                        ] if can else [],
                        "can_create": can,
                    })

            # — Escalation targets —
            esc_ids = config.get("escalation_assignee_ids") or []
            esc_source = (config.get("escalation_assignee_source") or "").lower()
            if config.get("escalation_enabled") and esc_source == "platform_group":
                for eid in (esc_ids if isinstance(esc_ids, list) else [esc_ids]):
                    es = str(eid or "")
                    if es and es not in group_by_id:
                        can = _can("users:edit")
                        _add(f"esc_group:{es}", {
                            "type": "group", "icon": "people",
                            "entity_name": "Escalation Team",
                            "referenced_by": node_label,
                            "message": (
                                f"If the approval \"{node_label}\" times out, it "
                                f"escalates to a team that hasn't been created yet."
                            ),
                            "guidance": (
                                "Create the escalation team and add the people "
                                "who should handle overdue approvals."
                            ) + _admin_note(can),
                            "steps": [
                                "Go to Users & Access → Groups",
                                "Create a group for escalation handling",
                                "Add senior staff who should handle overdue items",
                            ] if can else [],
                            "can_create": can,
                        })
            if config.get("escalation_enabled") and esc_source == "platform_role":
                for eid in (esc_ids if isinstance(esc_ids, list) else [esc_ids]):
                    es = str(eid or "")
                    if es and es not in role_by_id:
                        can = _can("users:edit")
                        _add(f"esc_role:{es}", {
                            "type": "role", "icon": "shield",
                            "entity_name": "Escalation Role",
                            "referenced_by": node_label,
                            "message": (
                                f"If the approval \"{node_label}\" times out, it "
                                f"escalates to a role that hasn't been created yet."
                            ),
                            "guidance": (
                                "Create the escalation role and assign it to "
                                "the right people."
                            ) + _admin_note(can),
                            "steps": [
                                "Go to Users & Access → Roles",
                                "Create a role for escalation handling",
                                "Assign it to senior staff",
                            ] if can else [],
                            "can_create": can,
                        })

        # ────────────────────────────────────────────────────────────
        # 4. TOOLS / INTEGRATIONS
        # ────────────────────────────────────────────────────────────
        if node_type == "tool":
            tid = str(config.get("toolId") or config.get("tool_id") or "")
            tname = config.get("toolName") or config.get("tool_name") or ""
            if tid and tid not in tool_by_id:
                can = _can("tools:create")
                label = tname or "External System"
                _add(f"tool:{tid}", {
                    "type": "tool", "icon": "wrench",
                    "entity_name": label,
                    "referenced_by": node_label,
                    "message": (
                        f"The step \"{node_label}\" connects to \"{label}\", "
                        f"but this integration hasn't been set up on the "
                        f"platform yet."
                    ),
                    "guidance": (
                        f"Set up the \"{label}\" integration so the workflow "
                        f"can connect to it."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Tools in the sidebar",
                        "Click + Create Tool",
                        f"Set it up as \"{label}\"",
                        "Configure the connection details",
                        "Test the connection and save",
                    ] if can else [],
                    "can_create": can,
                })

        # ────────────────────────────────────────────────────────────
        # 5. SUB-PROCESS (call_process) REFERENCES
        # ────────────────────────────────────────────────────────────
        if node_type == "call_process":
            pid = str(config.get("processId") or config.get("process_id") or "")
            pname = config.get("processName") or config.get("process_name") or ""
            if pid and pid not in proc_by_id:
                label = pname or "Sub-workflow"
                _add(f"proc:{pid}", {
                    "type": "process", "icon": "workflow",
                    "entity_name": label,
                    "referenced_by": node_label,
                    "message": (
                        f"The step \"{node_label}\" calls another workflow "
                        f"(\"{label}\") that either doesn't exist or hasn't been "
                        f"published yet."
                    ),
                    "guidance": (
                        f"Make sure the \"{label}\" workflow is created and "
                        f"published before running this one."
                    ),
                    "steps": [
                        "Go to Agents in the sidebar",
                        f"Find or create the \"{label}\" workflow",
                        "Make sure it is Published (not Draft)",
                        "Come back and this step will work automatically",
                    ],
                    "can_create": _can("agents:create"),
                })

        # ────────────────────────────────────────────────────────────
        # 6. FORM PREFILL — custom profile fields that may not exist
        # ────────────────────────────────────────────────────────────
        if node_type == "form":
            fields = config.get("fields") or []
            for fld in fields:
                if not isinstance(fld, dict):
                    continue
                prefill = fld.get("prefill")
                if not isinstance(prefill, dict):
                    continue
                pkey = (prefill.get("key") or "").strip()
                psrc = (prefill.get("source") or "").strip()
                if psrc == "currentUser" and pkey and pkey.lower() not in known_attr_keys:
                    flabel = fld.get("label") or fld.get("name") or pkey
                    can = _can("users:edit")
                    _add(f"attr:{pkey.lower()}", {
                        "type": "profile_field", "icon": "field",
                        "entity_name": flabel,
                        "referenced_by": node_label,
                        "message": (
                            f"The form auto-fills the field \"{flabel}\" from "
                            f"the employee's profile, but the attribute "
                            f"\"{pkey}\" hasn't been set up as a profile field yet."
                        ),
                        "guidance": (
                            f"Add \"{pkey}\" as a custom profile field in "
                            f"Organization Settings so employees' profiles "
                            f"can store this information."
                        ) + _admin_note(can),
                        "steps": [
                            "Go to Users & Access → Organization → Settings",
                            "Scroll to Profile Fields",
                            f"Add a new field called \"{pkey}\"",
                            "Choose the field type (text, number, date, etc.)",
                            "Save",
                            "Then update each employee's profile to fill in this field",
                        ] if can else [],
                        "can_create": can,
                    })

        # ────────────────────────────────────────────────────────────
        # 7. TEMPLATE REFERENCES to user context fields
        # ────────────────────────────────────────────────────────────
        for match in _ctx_re.finditer(config_text):
            attr_key = match.group(1)
            if attr_key.lower() not in known_attr_keys:
                can = _can("users:edit")
                friendly = attr_key.replace("_", " ").title()
                _add(f"tpl_attr:{attr_key.lower()}", {
                    "type": "profile_field", "icon": "field",
                    "entity_name": friendly,
                    "referenced_by": node_label,
                    "message": (
                        f"The step \"{node_label}\" uses the employee profile "
                        f"field \"{friendly}\", but this field hasn't been "
                        f"configured as a profile attribute yet."
                    ),
                    "guidance": (
                        f"Add \"{friendly}\" as a custom profile field in "
                        f"Organization Settings."
                    ) + _admin_note(can),
                    "steps": [
                        "Go to Users & Access → Organization → Settings",
                        "Scroll to Profile Fields",
                        f"Add a new field named \"{attr_key}\"",
                        "Save, then populate the field in employee profiles",
                    ] if can else [],
                    "can_create": can,
                })

    # ── Post-loop: identity directory check ─────────────────────────
    if _needs_identity:
        id_source = identity_ctx.get("source", "")
        if not id_source or id_source == "none":
            can = _can("system:settings")
            _add("no_identity", {
                "type": "identity", "icon": "settings",
                "entity_name": "Employee Directory",
                "referenced_by": "Workflow",
                "message": (
                    "This workflow relies on your organization's employee "
                    "directory (for managers, departments, or profile data), "
                    "but the employee directory hasn't been set up yet."
                ),
                "guidance": (
                    "Configure the Employee Directory so the platform knows "
                    "where to find employee information."
                ) + _admin_note(can),
                "steps": [
                    "Go to Settings in the sidebar",
                    "Find \"Identity & Employee Directory\"",
                    "Choose your source (Built-in, Active Directory, HR System, etc.)",
                    "Save the configuration",
                ] if can else [],
                "can_create": can,
            })

    return prerequisites


@router.post("/wizard/generate")
async def generate_workflow_from_goal(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Create a workflow from your description
    
    Just describe what you want the workflow to do in plain language,
    and we'll create it for you!
    
    Example:
        "Create an approval workflow for expense reports over $500"
    """
    from core.process.wizard import ProcessWizard
    from database.services.process_settings_service import ProcessSettingsService
    
    user_dict = _user_to_dict(user)
    goal = (request.get('goal') or '').strip()
    output_format = request.get('output_format') or request.get('format') or 'visual_builder'
    context = request.get('context') or {}
    if not isinstance(context, dict):
        context = {}
    
    if not goal:
        raise HTTPException(
            status_code=400, 
            detail="Please describe what you want the workflow to do."
        )
    
    # Get org settings
    settings_service = ProcessSettingsService(db)
    org_settings = settings_service.get_org_settings(user_dict["org_id"])
    
    # Get LLM if available
    llm = None
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
    # Discover available user attributes + identity configuration for this org
    # This lets the AI know exactly what fields can be auto-filled AND
    # whether identity features (manager, department, custom fields) are actually available
    try:
        from core.identity.service import UserDirectoryService
        _dir_svc = UserDirectoryService()
        available_attrs = _dir_svc.discover_available_attributes(user_dict["org_id"])
        context["available_user_attributes"] = available_attrs
        # Identity context: tells the AI WHAT identity source is configured,
        # whether managers/departments exist, and any warnings
        identity_ctx = _dir_svc.discover_identity_context(user_dict["org_id"])
        context["identity_context"] = identity_ctx
    except Exception as e:
        print(f"⚠️  [Wizard] Failed to discover user attributes/identity: {e}")
    
    # Discover actual departments, groups, and roles so the AI can reference them
    try:
        import uuid as _uuid_mod
        _org_uuid = _uuid_mod.UUID(user_dict["org_id"])

        from database.models.department import Department as DBDepartment
        from database.models.user import User as DBUser
        from sqlalchemy import func as _sqla_func
        _depts = db.query(DBDepartment).filter(DBDepartment.org_id == _org_uuid).all()
        _dept_ids = [d.id for d in _depts]
        _member_counts = {}
        if _dept_ids:
            _mc_rows = (
                db.query(DBUser.department_id, _sqla_func.count(DBUser.id))
                .filter(DBUser.department_id.in_(_dept_ids))
                .group_by(DBUser.department_id)
                .all()
            )
            _member_counts = {str(r[0]): r[1] for r in _mc_rows}
        _dept_list = []
        for d in _depts:
            entry = {
                "id": str(d.id),
                "name": d.name,
                "has_manager": bool(d.manager_id),
                "member_count": _member_counts.get(str(d.id), 0),
            }
            if d.manager_id:
                _mgr = db.query(DBUser).filter(DBUser.id == d.manager_id).first()
                if _mgr:
                    entry["manager_name"] = _mgr.display_name or f"{_mgr.first_name or ''} {_mgr.last_name or ''}".strip()
            _dept_list.append(entry)
        context["departments"] = _dept_list

        from database.models.user_group import UserGroup as DBUserGroup
        _groups = db.query(DBUserGroup).filter(DBUserGroup.org_id == _org_uuid).all()
        context["groups"] = [
            {"id": str(g.id), "name": g.name}
            for g in _groups
        ]

        from database.models.role import Role as DBRole
        _roles = db.query(DBRole).filter(
            (DBRole.org_id == _org_uuid) | (DBRole.org_id.is_(None))
        ).all()
        context["roles"] = [
            {"id": str(r.id), "name": r.name}
            for r in _roles if not getattr(r, "is_system", False)
        ]
    except Exception as e:
        print(f"⚠️  [Wizard] Failed to discover org structure: {e}")

    # Discover published processes so the AI can suggest call_process nodes
    try:
        from database.services.agent_service import AgentService
        all_agents = AgentService.get_all_agents(org_id=user_dict["org_id"])
        published_processes = []
        for ag in all_agents:
            if (
                ag.get("agent_type") == "process"
                and ag.get("status") == "published"
            ):
                # Extract input fields from the process definition's start node
                input_fields = []
                proc_def = ag.get("process_definition")
                if proc_def and isinstance(proc_def, dict):
                    nodes = proc_def.get("nodes") or []
                    for nd in nodes:
                        if nd.get("type") in ("trigger", "start"):
                            cfg = nd.get("config") or {}
                            for fld in (cfg.get("fields") or []):
                                input_fields.append({
                                    "name": fld.get("name"),
                                    "label": fld.get("label"),
                                    "type": fld.get("type", "text"),
                                    "required": fld.get("required", False),
                                })
                            break
                published_processes.append({
                    "id": ag.get("id"),
                    "name": ag.get("name"),
                    "description": ag.get("goal") or ag.get("description") or "",
                    "input_fields": input_fields,
                })
        context["published_processes"] = published_processes
    except Exception as e:
        print(f"⚠️  [Wizard] Failed to discover published processes: {e}")
    
    # ── Resolve user permissions (used by both pre- and post-checks) ──
    user_perms: List[str] = []
    try:
        user_perms = security_state.get_user_permissions(user)
    except Exception:
        user_perms = []

    # ═══════════════════════════════════════════════════════════════════
    # PRE-GENERATION CHECK — runs BEFORE the expensive AI call.
    # Analyzes the goal text against platform state to catch critical
    # gaps early (no identity configured, no departments, no managers,
    # no tools, etc.).  If issues are found, we return immediately
    # WITHOUT generating the workflow.
    # ═══════════════════════════════════════════════════════════════════
    try:
        pre_issues = await _pre_check_platform_readiness(
            goal, context, user_perms, llm,
        )
    except Exception as e:
        print(f"⚠️  [Wizard] Pre-check error (non-blocking): {e}")
        pre_issues = []

    if pre_issues:
        return {
            "success": True,
            "workflow": None,
            "setup_required": pre_issues,
            "message": (
                "Before we can build this workflow, a few things need "
                "to be set up on the platform first."
            ),
        }

    # ═══════════════════════════════════════════════════════════════════
    # GENERATE — platform is ready, proceed with AI generation
    # ═══════════════════════════════════════════════════════════════════
    wizard = ProcessWizard(llm=llm, org_settings=org_settings)

    try:
        process_def = await wizard.generate_from_goal(
            goal=goal,
            additional_context=context,
            output_format=output_format
        )

        # Post-generation: thorough node-by-node validation for edge
        # cases the pre-check couldn't catch (hallucinated IDs, stale
        # references, missing dept managers, empty departments, etc.)
        post_issues: List[Dict[str, Any]] = []
        try:
            post_issues = _validate_process_prerequisites(
                process_def, context, user_perms
            )
        except Exception as e:
            print(f"⚠️  [Wizard] Post-generation validation error (non-blocking): {e}")

        result: Dict[str, Any] = {
            "success": True,
            "workflow": process_def,
            "message": "Your workflow has been created! You can now customize it or run it.",
        }
        if post_issues:
            result["setup_required"] = post_issues
        return result
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail="We couldn't create the workflow. Please try describing it differently."
        )


@router.post("/wizard/suggest-settings")
async def suggest_step_settings(
    request: Dict[str, Any],
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Get AI-suggested settings for a step
    
    Tell us what this step should do, and we'll suggest the best settings.
    """
    from core.process.wizard import ProcessWizard
    from database.services.process_settings_service import ProcessSettingsService
    from core.process.messages import get_node_type_display
    
    user_dict = _user_to_dict(user)
    
    step_type = request.get('step_type')
    if not step_type:
        raise HTTPException(
            status_code=400, 
            detail="Please select a step type first."
        )
    
    # Get org settings
    settings_service = ProcessSettingsService(db)
    org_settings = settings_service.get_org_settings(user_dict["org_id"])
    
    # Get LLM if available
    llm = None
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
    wizard = ProcessWizard(llm=llm, org_settings=org_settings)
    
    try:
        config = await wizard.suggest_node_config(
            node_type=step_type,
            node_name=request.get('step_name', ''),
            purpose=request.get('purpose', ''),
            goal=request.get('workflow_goal', ''),
            existing_variables=request.get('available_data', [])
        )
        
        return {
            "success": True,
            "suggested_settings": config,
            "step_type_name": get_node_type_display(step_type),
            "message": "Here are our suggested settings. Feel free to adjust them!"
        }
    except Exception as e:
        # Return defaults on error
        default_config = wizard._get_default_node_config(step_type)
        return {
            "success": True,
            "suggested_settings": default_config,
            "step_type_name": get_node_type_display(step_type),
            "message": "Here are the default settings for this step type."
        }


# =============================================================================
# BUSINESS SUMMARY — LLM-powered test report translation
# =============================================================================

@router.post("/executions/{execution_id}/business-summary")
async def generate_business_summary(
    execution_id: str,
    user: User = Depends(require_auth),
    db: Session = Depends(get_db)
):
    """
    Generate a business-friendly summary of a process execution using LLM.
    
    Takes the technical execution steps and asks the LLM to translate them
    into clear, business-friendly language that non-technical users can understand.
    """
    from database.services.process_execution_service import ProcessExecutionService
    from core.process.messages import get_node_type_display, get_status_info
    
    user_dict = _user_to_dict(user)
    exec_service = ProcessExecutionService(db)
    
    # Fetch execution
    execution = exec_service.get_execution(execution_id)
    if not execution:
        raise HTTPException(status_code=404, detail="Execution not found")
    
    # Fetch steps with I/O
    nodes = exec_service.get_node_executions(execution_id)
    
    # Resolve process/agent name
    process_name = "Workflow"
    try:
        from database.models.agent import Agent
        agent = db.query(Agent).filter(Agent.id == execution.agent_id).first()
        if agent:
            process_name = agent.name or "Workflow"
    except Exception:
        pass
    
    # Build a compact representation of steps for the LLM
    steps_for_llm = []
    for n in nodes:
        step = {
            "step_name": n.node_name or get_node_type_display(n.node_type),
            "step_type": n.node_type,
            "status": n.status,
            "error": n.error_message if n.error_message else None,
        }
        # Include business-friendly error info if available
        if n.output_data and isinstance(n.output_data, dict):
            ed = n.output_data.get("error_detail")
            if ed and isinstance(ed, dict):
                if ed.get("business_message"):
                    step["business_error"] = ed["business_message"]
                if ed.get("is_user_fixable") is not None:
                    step["is_user_fixable"] = ed["is_user_fixable"]
        # Include key output data (compact)
        if n.output_data:
            out = n.output_data if isinstance(n.output_data, dict) else {}
            # Include relevant output fields but keep it small
            compact_out = {}
            for k in ("output", "data", "branch", "condition_result", "status"):
                if k in out:
                    v = out[k]
                    # Truncate long strings
                    if isinstance(v, str) and len(v) > 300:
                        v = v[:300] + "..."
                    compact_out[k] = v
            if out.get("variables_update"):
                compact_out["variables_update"] = out["variables_update"]
            if compact_out:
                step["output"] = compact_out
        # Include key input config (node name/type context)
        if n.input_data and isinstance(n.input_data, dict):
            cfg = n.input_data.get("config") or {}
            if n.node_type == "condition":
                step["condition"] = {
                    "field": cfg.get("field", ""),
                    "operator": cfg.get("operator", ""),
                    "value": cfg.get("value", ""),
                }
                resolved = n.input_data.get("resolved") or {}
                if resolved.get("expression"):
                    step["condition"]["resolved_expression"] = resolved["expression"]
            elif n.node_type == "notification":
                step["notification"] = {
                    "channel": cfg.get("channel", "email"),
                    "recipient": cfg.get("recipient", ""),
                    "message_preview": (cfg.get("message") or "")[:200],
                }
            elif n.node_type == "approval":
                step["approval_title"] = cfg.get("title") or cfg.get("message") or ""
        if n.branch_taken:
            step["branch_taken"] = n.branch_taken
        steps_for_llm.append(step)
    
    # Build trigger input summary
    trigger_input = {}
    identity_warnings_for_llm = []
    raw_input = execution.trigger_input if execution.trigger_input else {}
    if isinstance(raw_input, dict):
        for k, v in raw_input.items():
            if k == "_identity_warnings":
                identity_warnings_for_llm = v if isinstance(v, list) else []
                continue
            if k.startswith("_"):
                continue  # skip internal fields
            if isinstance(v, dict) and v.get("kind") == "uploadedFile":
                trigger_input[k] = f"[File: {v.get('name', 'uploaded file')}]"
            elif isinstance(v, str) and len(v) > 200:
                trigger_input[k] = v[:200] + "..."
            else:
                trigger_input[k] = v
    
    # Get LLM
    llm = None
    try:
        registry = _get_llm_registry()
        models = registry.list_all(active_only=True)
        if models:
            from core.llm.factory import LLMFactory
            llm = LLMFactory.create(models[0])
    except Exception:
        llm = None
    
    if not llm:
        return {
            "success": False,
            "error": "No LLM available to generate summary",
            "fallback": "technical"
        }
    
    import json as _json
    
    system_prompt = """You are a business process analyst. Your job is to explain what happened during a workflow execution in clear, simple business language.

Rules:
- Write for a non-technical business user (manager, HR, finance, etc.)
- Use plain English, no code, no JSON, no variable names
- Explain what happened at each step in 1-2 sentences
- If something failed, explain what went wrong and what it means for the business
- Use bullet points for the step-by-step summary
- Start with a one-line overall outcome (success/failure and what it means)
- Include any key data points (amounts, names, dates, decisions)
- If a condition was evaluated, explain the business rule in plain language
- For approvals, explain who approved/rejected and why it matters
- For notifications, mention who was notified and about what
- Keep the total summary concise (under 300 words)

ERROR CLASSIFICATION (IMPORTANT — when steps fail):
- If a step failed, classify the error into one of these categories:
  a) CONFIGURATION ISSUE — the user can fix it (e.g., missing field, wrong setting, empty recipient).
     Tell the user exactly what to check or change.
  b) TECHNICAL ISSUE — requires IT support (e.g., service unavailable, code error, unexpected exception).
     Tell the user: "This is a technical issue. Please share the Technical view with your IT team."
  c) DATA ISSUE — the input data was incomplete or invalid (e.g., blurry image, empty file, missing info).
     Tell the user what to fix in their submission.
- NEVER use generic phrases like "something went wrong" — always explain the specific problem.
- NEVER fabricate error explanations — only describe what actually happened based on the step data.

Response format (plain text, NOT JSON):
OUTCOME: <one-line business outcome>

SUMMARY:
• <step 1 explanation>
• <step 2 explanation>
...

KEY DETAILS:
- <any important data points, amounts, decisions>
"""
    
    _id_warnings_text = ""
    if identity_warnings_for_llm:
        _id_warnings_text = (
            "\n\nIdentity warnings (these affected the workflow):\n"
            + "\n".join(f"- {w}" for w in identity_warnings_for_llm)
        )
    
    user_prompt = f"""Here is a workflow execution result. Please explain what happened in business-friendly language.

Workflow: {process_name}
Status: {execution.status}
{f'Error: {execution.error_message}' if execution.error_message else ''}{_id_warnings_text}

Submitted information:
{_json.dumps(trigger_input, indent=2, default=str)}

Steps executed:
{_json.dumps(steps_for_llm, indent=2, default=str)}
"""
    
    try:
        from core.llm.base import Message, MessageRole
        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=user_prompt),
        ]
    except ImportError:
        try:
            from core.llm.models import Message, MessageRole
            messages = [
                Message(role=MessageRole.SYSTEM, content=system_prompt),
                Message(role=MessageRole.USER, content=user_prompt),
            ]
        except ImportError:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ]
    
    try:
        response = await llm.chat(messages=messages, temperature=0.3, max_tokens=1500)
        content = getattr(response, "content", None) or str(response)
        
        return {
            "success": True,
            "summary": content,
            "execution_status": execution.status,
            "process_name": process_name
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to generate summary: {str(e)}",
            "fallback": "technical"
        }
