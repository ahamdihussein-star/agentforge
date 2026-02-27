"""
Identity & Org Chart API Router
=================================
Provides REST endpoints for:
- Org chart management (CRUD for manager/employee relationships)
- User directory lookups (get user attributes, manager, reports)
- Department management with hierarchy
- Identity provider configuration
- Process assignee resolution

Security:
- All endpoints require authentication via Bearer token
- Org chart modifications require admin permissions
- Read operations available to all authenticated users
"""

import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query

from .schemas import (
    UpdateManagerRequest, UpdateEmployeeIdRequest,
    UpdateUserDepartmentRequest,
    BulkOrgChartRequest, BulkOrgChartResponse,
    UserAttributesResponse, OrgChartNodeResponse, DepartmentResponse,
    CreateDepartmentRequest, UpdateDepartmentRequest,
    DirectorySourceConfig, ResolveAssigneeRequest, ResolveAssigneeResponse,
    ProfileFieldsSchemaResponse, UpdateProfileFieldsSchemaRequest,
    BulkUserCustomAttributesRequest, BulkUserCustomAttributesResponse,
)
from core.identity.service import UserDirectoryService
from api.security import require_auth, require_admin, User, security_state

router = APIRouter(prefix="/identity", tags=["Identity & Org Chart"])

# Singleton service instance
_directory_service = UserDirectoryService()


def get_directory_service() -> UserDirectoryService:
    return _directory_service


def _extract_user_context(user: User) -> Dict[str, Any]:
    """Extract user_id and org_id from the authenticated User object."""
    org_id = getattr(user, 'org_id', None) or getattr(user, 'organization_id', None) or ''
    return {
        "user_id": str(user.id),
        "org_id": str(org_id),
    }


# ============================================================================
# USER DIRECTORY ENDPOINTS
# ============================================================================

@router.get("/users/{user_id}", response_model=UserAttributesResponse)
async def get_user_attributes(user_id: str, user: User = Depends(require_auth)):
    """
    Get full user attributes from the configured directory source.
    
    Returns unified user attributes regardless of identity source
    (internal, LDAP, or HR API).
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    attrs = service.get_user(user_id, ctx["org_id"])
    
    if not attrs:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserAttributesResponse(**attrs.model_dump())


@router.get("/users/{user_id}/manager", response_model=Optional[UserAttributesResponse])
async def get_user_manager(user_id: str, user: User = Depends(require_auth)):
    """
    Get the direct manager of a user.
    
    Resolves from the configured directory source:
    - Internal: Uses users.manager_id
    - LDAP: Queries the manager attribute
    - HR API: Calls the get_manager endpoint
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    manager = service.get_manager(user_id, ctx["org_id"])
    
    if not manager:
        return None
    
    return UserAttributesResponse(**manager.model_dump())


@router.get("/users/{user_id}/direct-reports", response_model=List[UserAttributesResponse])
async def get_direct_reports(user_id: str, user: User = Depends(require_auth)):
    """Get all direct reports of a manager."""
    ctx = _extract_user_context(user)
    service = get_directory_service()
    reports = service.get_direct_reports(user_id, ctx["org_id"])
    
    return [UserAttributesResponse(**r.model_dump()) for r in reports]


@router.get("/users/{user_id}/management-chain", response_model=List[UserAttributesResponse])
async def get_management_chain(
    user_id: str,
    max_depth: int = Query(default=10, ge=1, le=20),
    user: User = Depends(require_auth)
):
    """
    Get the full management chain from a user up to the top.
    Useful for multi-level approval workflows.
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    chain = service.get_management_chain(user_id, ctx["org_id"], max_depth=max_depth)
    
    return [UserAttributesResponse(**m.model_dump()) for m in chain]


# ============================================================================
# ORG CHART ENDPOINTS
# ============================================================================

@router.get("/org-chart", response_model=List[OrgChartNodeResponse])
async def get_org_chart(
    root_user_id: Optional[str] = None,
    max_depth: int = Query(default=5, ge=1, le=10),
    user: User = Depends(require_auth)
):
    """
    Get the organizational chart tree.
    
    Returns a hierarchical tree of users with their direct reports.
    Use root_user_id to get a subtree starting from a specific user.
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    chart = service.get_org_chart(ctx["org_id"], root_user_id=root_user_id, max_depth=max_depth)
    
    def node_to_response(node):
        return OrgChartNodeResponse(
            user_id=node.user_id,
            email=node.email,
            display_name=node.display_name,
            job_title=node.job_title,
            employee_id=node.employee_id,
            department_id=node.department_id,
            department_name=node.department_name,
            manager_id=node.manager_id,
            direct_reports=[node_to_response(r) for r in node.direct_reports],
            level=node.level,
        )
    
    return [node_to_response(n) for n in chart]


@router.put("/users/{user_id}/manager")
async def update_user_manager(
    user_id: str,
    body: UpdateManagerRequest,
    user: User = Depends(require_admin)
):
    """
    Update a user's direct manager.
    Requires admin permissions (users:edit).
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    success = service.update_user_manager(user_id, body.manager_id, ctx["org_id"], ctx["user_id"])
    
    if not success:
        raise HTTPException(
            status_code=400,
            detail="Failed to update manager. Check for circular references or invalid IDs."
        )
    
    return {"status": "success", "user_id": user_id, "manager_id": body.manager_id}


@router.put("/users/{user_id}/employee-id")
async def update_user_employee_id(
    user_id: str,
    body: UpdateEmployeeIdRequest,
    user: User = Depends(require_admin)
):
    """
    Update a user's employee ID (HR system identifier).
    Requires admin permissions (users:edit).
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    success = service.update_user_employee_id(user_id, body.employee_id, ctx["org_id"])
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "user_id": user_id, "employee_id": body.employee_id}


@router.put("/users/{user_id}/department")
async def update_user_department(
    user_id: str,
    body: UpdateUserDepartmentRequest,
    user: User = Depends(require_admin)
):
    """
    Update a user's department assignment.
    Requires admin permissions (users:edit).
    """
    from database.base import get_session
    from database.models.department import Department
    from database.models.user import User as UserModel

    ctx = _extract_user_context(user)
    dept_id = body.department_id

    # Normalize empty strings
    if isinstance(dept_id, str) and not dept_id.strip():
        dept_id = None

    with get_session() as session:
        db_user = session.query(UserModel).filter(
            UserModel.id == user_id,
            UserModel.org_id == ctx["org_id"]
        ).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="User not found")

        dept_uuid = None
        if dept_id is not None:
            dept = session.query(Department).filter(
                Department.id == dept_id,
                Department.org_id == ctx["org_id"]
            ).first()
            if not dept:
                raise HTTPException(status_code=404, detail="Department not found")
            dept_uuid = dept.id

        db_user.department_id = dept_uuid
        db_user.updated_at = datetime.utcnow()
        session.commit()

    # Keep in-memory security cache in sync so later save_to_disk doesn't overwrite.
    try:
        cached_user = security_state.users.get(user_id)
        if cached_user and getattr(cached_user, "org_id", None) == ctx["org_id"]:
            setattr(cached_user, "department_id", str(dept_uuid) if dept_uuid else None)
    except Exception:
        pass

    return {"status": "success", "user_id": user_id, "department_id": str(dept_uuid) if dept_uuid else None}


@router.post("/org-chart/bulk-update", response_model=BulkOrgChartResponse)
async def bulk_update_org_chart(
    body: BulkOrgChartRequest,
    user: User = Depends(require_admin)
):
    """
    Bulk update organizational hierarchy.
    
    Use this to import org chart data from external systems
    or make batch changes to the hierarchy.
    
    Requires admin permissions (users:edit).
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    result = service.bulk_update_org_chart(
        ctx["org_id"],
        [u.model_dump() for u in body.updates],
        ctx["user_id"]
    )
    
    return BulkOrgChartResponse(**result)


# ============================================================================
# DEPARTMENT ENDPOINTS
# ============================================================================

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(user: User = Depends(require_auth)):
    """Get all departments for the organization."""
    ctx = _extract_user_context(user)
    service = get_directory_service()
    departments = service.get_org_departments(ctx["org_id"])
    
    return [DepartmentResponse(**d.model_dump()) for d in departments]


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(department_id: str, user: User = Depends(require_auth)):
    """Get department details including members and sub-departments."""
    ctx = _extract_user_context(user)
    service = get_directory_service()
    dept = service.get_department_info(department_id, ctx["org_id"])
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return DepartmentResponse(**dept.model_dump())


@router.get("/departments/{department_id}/members", response_model=List[UserAttributesResponse])
async def get_department_members(department_id: str, user: User = Depends(require_auth)):
    """Get all members of a department."""
    ctx = _extract_user_context(user)
    service = get_directory_service()
    members = service.get_department_members(department_id, ctx["org_id"])
    
    return [UserAttributesResponse(**m.model_dump()) for m in members]


@router.post("/departments", response_model=DepartmentResponse)
async def create_department(body: CreateDepartmentRequest, user: User = Depends(require_admin)):
    """
    Create a new department.
    Requires admin permissions.
    """
    from database.base import get_session
    from database.models.department import Department
    
    ctx = _extract_user_context(user)
    
    with get_session() as session:
        dept = Department(
            id=uuid.uuid4(),
            org_id=ctx["org_id"],
            name=body.name,
            description=body.description,
            parent_id=body.parent_id,
            manager_id=body.manager_id,
        )
        session.add(dept)
        session.commit()
        
        return DepartmentResponse(
            id=str(dept.id),
            name=dept.name,
            description=dept.description,
            parent_id=str(dept.parent_id) if dept.parent_id else None,
            manager_id=str(dept.manager_id) if dept.manager_id else None,
            member_count=0,
        )


@router.put("/departments/{department_id}", response_model=DepartmentResponse)
async def update_department(
    department_id: str,
    body: UpdateDepartmentRequest,
    user: User = Depends(require_admin)
):
    """
    Update a department.
    Requires admin permissions.
    """
    from database.base import get_session
    from database.models.department import Department
    
    ctx = _extract_user_context(user)
    
    with get_session() as session:
        dept = session.query(Department).filter(
            Department.id == department_id,
            Department.org_id == ctx["org_id"]
        ).first()
        
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        if body.name is not None:
            dept.name = body.name
        if body.description is not None:
            dept.description = body.description
        if body.parent_id is not None:
            dept.parent_id = body.parent_id
        if body.manager_id is not None:
            dept.manager_id = body.manager_id
        
        dept.updated_at = datetime.utcnow()
        session.commit()
        
        service = get_directory_service()
        return service.get_department_info(department_id, ctx["org_id"])


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, user: User = Depends(require_admin)):
    """
    Delete a department.
    Requires admin permissions. Users in this department will have their department_id cleared.
    """
    from database.base import get_session
    from database.models.department import Department
    from database.models.user import User as UserModel
    
    ctx = _extract_user_context(user)
    
    with get_session() as session:
        dept = session.query(Department).filter(
            Department.id == department_id,
            Department.org_id == ctx["org_id"]
        ).first()
        
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Clear department_id from users
        session.query(UserModel).filter(
            UserModel.department_id == department_id,
            UserModel.org_id == ctx["org_id"]
        ).update({UserModel.department_id: None}, synchronize_session=False)
        
        # Move sub-departments to parent
        session.query(Department).filter(
            Department.parent_id == department_id,
            Department.org_id == ctx["org_id"]
        ).update({Department.parent_id: dept.parent_id}, synchronize_session=False)
        
        session.delete(dept)
        session.commit()
    
    return {"status": "success", "message": f"Department {department_id} deleted"}


# ============================================================================
# IDENTITY PROVIDER CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/directory-config", response_model=DirectorySourceConfig)
async def get_directory_config(user: User = Depends(require_admin)):
    """
    Get the current directory source configuration.
    Requires admin permissions (system:settings).
    """
    from database.base import get_session
    from database.models.organization import Organization
    
    ctx = _extract_user_context(user)
    
    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == ctx["org_id"]).first()
        
        if not org:
            return DirectorySourceConfig()
        
        hr_config = None
        if org.hr_api_config:
            import json
            hr_config = json.loads(org.hr_api_config) if isinstance(org.hr_api_config, str) else org.hr_api_config
        
        return DirectorySourceConfig(
            directory_source=getattr(org, 'directory_source', None) or "internal",
            hr_api_config=hr_config,
        )


@router.put("/directory-config", response_model=DirectorySourceConfig)
async def update_directory_config(body: DirectorySourceConfig, user: User = Depends(require_admin)):
    """
    Update the directory source configuration.
    
    This controls where user attributes (manager, employee_id, department)
    are resolved from:
    
    - **internal**: Built-in org chart (users.manager_id, departments table)
    - **ldap**: LDAP/Active Directory (uses configured LDAP connection)
    - **hr_api**: External HR system REST API
    - **hybrid**: Internal + external enrichment
    
    Requires admin permissions (system:settings).
    """
    from database.base import get_session
    from database.models.organization import Organization
    import json
    
    ctx = _extract_user_context(user)
    
    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == ctx["org_id"]).first()
        
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org.directory_source = body.directory_source
        if body.hr_api_config is not None:
            org.hr_api_config = json.dumps(body.hr_api_config) if isinstance(body.hr_api_config, dict) else body.hr_api_config
        
        org.updated_at = datetime.utcnow()
        session.commit()
    
    return body


# ============================================================================
# ORG-LEVEL PROFILE FIELDS (GLOBAL SCHEMA)
# ============================================================================

@router.get("/profile-fields", response_model=ProfileFieldsSchemaResponse)
async def get_profile_fields_schema(user: User = Depends(require_admin)):
    """Get org-level profile field definitions (global schema)."""
    from database.base import get_session
    from database.models.organization import Organization
    import json

    ctx = _extract_user_context(user)
    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == ctx["org_id"]).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        settings_raw = org.settings or {}
        # Some deployments may store JSON as a string; normalize to dict.
        if isinstance(settings_raw, str):
            try:
                settings_raw = json.loads(settings_raw) if settings_raw.strip() else {}
            except Exception:
                settings_raw = {}
        settings = settings_raw if isinstance(settings_raw, dict) else {}
        fields = settings.get("profile_fields_schema") or []
        if not isinstance(fields, list):
            fields = []
        return ProfileFieldsSchemaResponse(fields=fields)


@router.put("/profile-fields", response_model=ProfileFieldsSchemaResponse)
async def update_profile_fields_schema(body: UpdateProfileFieldsSchemaRequest, user: User = Depends(require_admin)):
    """Update org-level profile field definitions (global schema)."""
    from database.base import get_session
    from database.models.organization import Organization
    import json

    ctx = _extract_user_context(user)
    fields = body.fields or []
    # Basic sanitation: ensure keys are strings and non-empty
    cleaned = []
    seen = set()
    for f in fields:
        key = (getattr(f, "key", None) or "").strip()
        if not key or key in seen:
            continue
        seen.add(key)
        raw_opts = getattr(f, "options", None)
        opts_clean = None
        if isinstance(raw_opts, list):
            tmp = []
            seen_opt = set()
            for o in raw_opts:
                if not isinstance(o, str):
                    continue
                oo = o.strip()
                if not oo or oo.lower() in seen_opt:
                    continue
                seen_opt.add(oo.lower())
                tmp.append(oo)
                if len(tmp) >= 200:
                    break
            if tmp:
                opts_clean = tmp
        cleaned.append({
            "key": key,
            "label": (getattr(f, "label", None) or "").strip() or key.replace("_", " ").replace("-", " ").title(),
            "type": (getattr(f, "type", None) or "string").strip() or "string",
            "description": (getattr(f, "description", None) or "").strip() or None,
            "required": bool(getattr(f, "required", False)),
            "source": "org_schema",
            "options": opts_clean,
        })

    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == ctx["org_id"]).first()
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        settings_raw = org.settings or {}
        if isinstance(settings_raw, str):
            try:
                settings_raw = json.loads(settings_raw) if settings_raw.strip() else {}
            except Exception:
                settings_raw = {}
        old_settings = settings_raw if isinstance(settings_raw, dict) else {}
        # CRITICAL: create a NEW dict so SQLAlchemy detects the JSONB mutation.
        # Assigning the same dict object back does NOT trigger change detection.
        new_settings = {**old_settings, "profile_fields_schema": cleaned}
        org.settings = new_settings
        org.updated_at = datetime.utcnow()
        session.commit()

    # Keep the in-memory security cache in sync to prevent stale org.settings
    # from overwriting profile_fields_schema during later security_state.save_to_disk()
    # (e.g. login/reload flows).
    try:
        cached_org = security_state.organizations.get(ctx["org_id"])
        if cached_org:
            cached_settings = cached_org.settings if isinstance(getattr(cached_org, "settings", None), dict) else {}
            cached_settings["profile_fields_schema"] = cleaned
            cached_org.settings = cached_settings
    except Exception:
        # Never fail the API call because of cache sync issues
        pass
    return ProfileFieldsSchemaResponse(fields=cleaned)


@router.post("/users/bulk-custom-attributes", response_model=BulkUserCustomAttributesResponse)
async def bulk_update_user_custom_attributes(body: BulkUserCustomAttributesRequest, user: User = Depends(require_admin)):
    """
    Bulk set per-user custom attributes (values).

    Enterprise-friendly alternative to editing users one-by-one.
    Values are stored in users.user_metadata (and exposed as profile.custom_attributes).
    """
    from database.base import get_session
    from database.models.user import User as DBUser
    import json

    ctx = _extract_user_context(user)
    mode = (body.mode or "merge").lower()
    if mode not in ("merge", "replace"):
        raise HTTPException(status_code=400, detail="Invalid mode. Use merge or replace.")

    success = 0
    errors: List[Dict[str, Any]] = []

    def _filter_attrs(attrs: Dict[str, Any]) -> Dict[str, Any]:
        out = {}
        for k, v in (attrs or {}).items():
            if not isinstance(k, str):
                continue
            kk = k.strip()
            if not kk or kk.startswith("mfa_") or kk.startswith("_"):
                continue
            out[kk] = v
        return out

    with get_session() as session:
        for item in (body.items or []):
            try:
                target = None
                if item.user_id:
                    target = session.query(DBUser).filter(DBUser.id == item.user_id, DBUser.org_id == ctx["org_id"]).first()
                if not target and item.email:
                    email = item.email.strip().lower()
                    target = session.query(DBUser).filter(DBUser.email == email, DBUser.org_id == ctx["org_id"]).first()
                if not target:
                    raise ValueError("User not found")

                existing = {}
                if hasattr(target, "user_metadata") and target.user_metadata:
                    if isinstance(target.user_metadata, str):
                        try:
                            existing = json.loads(target.user_metadata) or {}
                        except Exception:
                            existing = {}
                    elif isinstance(target.user_metadata, dict):
                        existing = target.user_metadata.copy()

                new_attrs = _filter_attrs(item.attributes)
                if mode == "replace":
                    merged = {k: v for k, v in existing.items() if isinstance(k, str) and (k.startswith("mfa_") or k.startswith("_"))}
                    merged.update(new_attrs)
                else:
                    merged = existing
                    merged.update(new_attrs)

                target.user_metadata = merged
                target.updated_at = datetime.utcnow()
                success += 1
            except Exception as e:
                errors.append({
                    "email": getattr(item, "email", None),
                    "user_id": getattr(item, "user_id", None),
                    "error": str(e),
                })
        session.commit()

    return BulkUserCustomAttributesResponse(
        success_count=success,
        error_count=len(errors),
        errors=errors,
    )


# ============================================================================
# PROCESS INTEGRATION ENDPOINTS
# ============================================================================

@router.post("/resolve-assignees", response_model=ResolveAssigneeResponse)
async def resolve_process_assignees(body: ResolveAssigneeRequest, user: User = Depends(require_auth)):
    """
    Resolve dynamic assignees for process approval/notification nodes.
    
    This is used by the process engine and can also be called directly
    to preview who would be assigned in a workflow.
    
    Supported assignee types:
    - **static**: Fixed user IDs
    - **dynamic_manager**: Manager of the triggering user
    - **department_manager**: Manager of a specific department
    - **department_members**: All members of a department
    - **role**: All users with specific roles
    - **group**: All users in specific groups
    - **management_chain**: Nth-level manager in hierarchy
    - **expression**: Template expression (e.g., {{ trigger_input.manager_id }})
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()
    user_ids = service.resolve_process_assignee(
        body.assignee_config,
        body.process_context,
        ctx["org_id"]
    )
    
    # Optionally resolve full user attributes
    resolved_users = []
    for uid in user_ids:
        attrs = service.get_user(uid, ctx["org_id"])
        if attrs:
            resolved_users.append(UserAttributesResponse(**attrs.model_dump()))
    
    return ResolveAssigneeResponse(
        user_ids=user_ids,
        resolved_users=resolved_users,
    )


# ============================================================================
# PROCESS BUILDER CONTEXT
# ============================================================================

@router.get("/builder-context")
async def get_builder_context(user: User = Depends(require_auth)):
    """
    Return all organizational data the Process Builder needs in a single call.

    Includes user profile fields (standard + custom), management chain
    availability, and departments with their managers.
    """
    ctx = _extract_user_context(user)
    service = get_directory_service()

    attrs = service.discover_available_attributes(ctx["org_id"])
    id_ctx = service.discover_identity_context(ctx["org_id"])
    caps = id_ctx.get("capabilities", {})

    standard_grouped: List[Dict[str, Any]] = []
    _group_map = {
        "email": "profile", "name": "profile", "firstName": "profile",
        "lastName": "profile", "phone": "profile", "jobTitle": "profile",
        "employeeId": "profile",
        "departmentId": "organization",
        "departmentName": "organization", "roles": "organization",
        "groups": "organization",
        "managerId": "hierarchy", "managerName": "hierarchy",
        "managerEmail": "hierarchy", "isManager": "hierarchy",
        "departmentHeadId": "hierarchy",
        "departmentHeadName": "hierarchy",
        "departmentHeadEmail": "hierarchy",
    }
    for f in attrs.get("standard", []):
        field = dict(f)
        field["group"] = _group_map.get(field.get("key", ""), "profile")
        standard_grouped.append(field)

    chain_levels = []
    if caps.get("has_managers"):
        chain_levels = [
            {"level": 1, "label": "Direct Manager", "ref": "manager"},
            {"level": 2, "label": "Manager\u2019s Manager", "ref": "skip_level_2"},
            {"level": 3, "label": "Senior Management (Level 3)", "ref": "skip_level_3"},
        ]

    departments: List[Dict[str, Any]] = []
    try:
        dept_list = service.get_org_departments(ctx["org_id"])
        for d in (dept_list or []):
            departments.append({
                "id": getattr(d, "id", ""),
                "name": getattr(d, "name", ""),
                "manager_id": getattr(d, "manager_id", None),
                "manager_name": getattr(d, "manager_name", None),
                "member_count": getattr(d, "member_count", 0),
            })
    except Exception:
        pass

    # Enrich standard fields with platform-known option lists (no hardcoding per-process).
    # These are org-scoped and safe to show as pickers.
    dept_names = [d.get("name") for d in departments if d.get("name")]
    role_names: List[str] = []
    group_names: List[str] = []
    groups: List[Dict[str, Any]] = []
    roles: List[Dict[str, Any]] = []
    try:
        from database.base import get_session
        from database.models.role import Role
        from database.models.user_group import UserGroup
        with get_session() as session:
            _roles = session.query(Role).filter(Role.org_id == ctx["org_id"]).order_by(Role.name.asc()).all()
            role_names = [r.name for r in _roles if getattr(r, "name", None)]
            roles = [{"id": str(r.id), "name": r.name} for r in _roles if getattr(r, "name", None)]
            _groups = session.query(UserGroup).filter(UserGroup.org_id == ctx["org_id"]).order_by(UserGroup.name.asc()).all()
            group_names = [g.name for g in _groups if getattr(g, "name", None)]
            groups = [{"id": str(g.id), "name": g.name} for g in _groups if getattr(g, "name", None)]
    except Exception:
        role_names = role_names or []
        group_names = group_names or []

    for sf in standard_grouped:
        k = (sf.get("key") or "").strip()
        if not k:
            continue
        if k == "departmentName" and dept_names:
            sf["options"] = dept_names
            sf["type"] = sf.get("type") or "select"
        elif k == "roles" and role_names:
            sf["options"] = role_names
        elif k == "groups" and group_names:
            sf["options"] = group_names
        elif k == "isManager":
            sf["options"] = ["true", "false"]

    return {
        "user_fields": {
            "standard": standard_grouped,
            "custom": attrs.get("custom", []),
        },
        "management_chain": {
            "available": caps.get("has_managers", False),
            "manager_coverage_pct": caps.get("manager_coverage_pct", 0),
            "levels": chain_levels,
        },
        "departments": departments,
        "groups": groups,
        "roles": roles,
    }
