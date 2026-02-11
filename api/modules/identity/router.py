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
    BulkOrgChartRequest, BulkOrgChartResponse,
    UserAttributesResponse, OrgChartNodeResponse, DepartmentResponse,
    CreateDepartmentRequest, UpdateDepartmentRequest,
    DirectorySourceConfig, ResolveAssigneeRequest, ResolveAssigneeResponse,
)
from core.identity.service import UserDirectoryService
from api.security import require_auth, require_admin, User

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
