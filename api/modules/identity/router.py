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
- All endpoints require authentication
- Org chart modifications require admin permissions
- Read operations available to all authenticated users
"""

import uuid
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query

from .schemas import (
    UpdateManagerRequest, UpdateEmployeeIdRequest,
    BulkOrgChartRequest, BulkOrgChartResponse,
    UserAttributesResponse, OrgChartNodeResponse, DepartmentResponse,
    CreateDepartmentRequest, UpdateDepartmentRequest,
    DirectorySourceConfig, ResolveAssigneeRequest, ResolveAssigneeResponse,
)
from core.identity.service import UserDirectoryService

router = APIRouter(prefix="/identity", tags=["Identity & Org Chart"])

# Singleton service instance
_directory_service = UserDirectoryService()


def get_directory_service() -> UserDirectoryService:
    return _directory_service


# ============================================================================
# Helper: Extract user/org from request (matches existing auth pattern)
# ============================================================================

async def _get_auth_context(request) -> dict:
    """
    Extract authenticated user context from request.
    Uses the same auth mechanism as the rest of the API.
    """
    # Import here to avoid circular imports
    from api.security import get_current_user
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    user_id = user.get("id") or user.get("user_id")
    org_id = user.get("org_id", "")
    
    return {
        "user_id": str(user_id),
        "org_id": str(org_id),
        "permissions": user.get("permissions", []),
        "role_ids": user.get("role_ids", []),
    }


def _has_admin_permission(permissions: list) -> bool:
    """Check if user has admin-level permissions for org chart management."""
    admin_perms = {"system:admin", "users:edit", "users:view"}
    return bool(set(permissions) & admin_perms)


# ============================================================================
# USER DIRECTORY ENDPOINTS
# ============================================================================

@router.get("/users/{user_id}", response_model=UserAttributesResponse)
async def get_user_attributes(user_id: str, request=None):
    """
    Get full user attributes from the configured directory source.
    
    Returns unified user attributes regardless of identity source
    (internal, LDAP, or HR API).
    """
    from fastapi import Request as FastAPIRequest
    # Auth context would be injected by middleware in production
    # For now, extract org_id from the user_id lookup or headers
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    attrs = service.get_user(user_id, org_id)
    
    if not attrs:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserAttributesResponse(**attrs.model_dump())


@router.get("/users/{user_id}/manager", response_model=Optional[UserAttributesResponse])
async def get_user_manager(user_id: str, request=None):
    """
    Get the direct manager of a user.
    
    Resolves from the configured directory source:
    - Internal: Uses users.manager_id
    - LDAP: Queries the manager attribute
    - HR API: Calls the get_manager endpoint
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    manager = service.get_manager(user_id, org_id)
    
    if not manager:
        return None
    
    return UserAttributesResponse(**manager.model_dump())


@router.get("/users/{user_id}/direct-reports", response_model=List[UserAttributesResponse])
async def get_direct_reports(user_id: str, request=None):
    """Get all direct reports of a manager."""
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    reports = service.get_direct_reports(user_id, org_id)
    
    return [UserAttributesResponse(**r.model_dump()) for r in reports]


@router.get("/users/{user_id}/management-chain", response_model=List[UserAttributesResponse])
async def get_management_chain(
    user_id: str,
    max_depth: int = Query(default=10, ge=1, le=20),
    request=None
):
    """
    Get the full management chain from a user up to the top.
    Useful for multi-level approval workflows.
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    chain = service.get_management_chain(user_id, org_id, max_depth=max_depth)
    
    return [UserAttributesResponse(**m.model_dump()) for m in chain]


# ============================================================================
# ORG CHART ENDPOINTS
# ============================================================================

@router.get("/org-chart", response_model=List[OrgChartNodeResponse])
async def get_org_chart(
    root_user_id: Optional[str] = None,
    max_depth: int = Query(default=5, ge=1, le=10),
    request=None
):
    """
    Get the organizational chart tree.
    
    Returns a hierarchical tree of users with their direct reports.
    Use root_user_id to get a subtree starting from a specific user.
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    chart = service.get_org_chart(org_id, root_user_id=root_user_id, max_depth=max_depth)
    
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
async def update_user_manager(user_id: str, body: UpdateManagerRequest, request=None):
    """
    Update a user's direct manager.
    Requires admin permissions (users:edit).
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    updated_by = request.headers.get("X-User-Id", "") if request else ""
    
    service = get_directory_service()
    success = service.update_user_manager(user_id, body.manager_id, org_id, updated_by)
    
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update manager. Check for circular references or invalid IDs.")
    
    return {"status": "success", "user_id": user_id, "manager_id": body.manager_id}


@router.put("/users/{user_id}/employee-id")
async def update_user_employee_id(user_id: str, body: UpdateEmployeeIdRequest, request=None):
    """
    Update a user's employee ID (HR system identifier).
    Requires admin permissions (users:edit).
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    success = service.update_user_employee_id(user_id, body.employee_id, org_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"status": "success", "user_id": user_id, "employee_id": body.employee_id}


@router.post("/org-chart/bulk-update", response_model=BulkOrgChartResponse)
async def bulk_update_org_chart(body: BulkOrgChartRequest, request=None):
    """
    Bulk update organizational hierarchy.
    
    Use this to import org chart data from external systems
    or make batch changes to the hierarchy.
    
    Requires admin permissions (users:edit).
    """
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    updated_by = request.headers.get("X-User-Id", "") if request else ""
    
    service = get_directory_service()
    result = service.bulk_update_org_chart(
        org_id,
        [u.model_dump() for u in body.updates],
        updated_by
    )
    
    return BulkOrgChartResponse(**result)


# ============================================================================
# DEPARTMENT ENDPOINTS
# ============================================================================

@router.get("/departments", response_model=List[DepartmentResponse])
async def list_departments(request=None):
    """Get all departments for the organization."""
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    departments = service.get_org_departments(org_id)
    
    return [DepartmentResponse(**d.model_dump()) for d in departments]


@router.get("/departments/{department_id}", response_model=DepartmentResponse)
async def get_department(department_id: str, request=None):
    """Get department details including members and sub-departments."""
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    dept = service.get_department_info(department_id, org_id)
    
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    return DepartmentResponse(**dept.model_dump())


@router.get("/departments/{department_id}/members", response_model=List[UserAttributesResponse])
async def get_department_members(department_id: str, request=None):
    """Get all members of a department."""
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    members = service.get_department_members(department_id, org_id)
    
    return [UserAttributesResponse(**m.model_dump()) for m in members]


@router.post("/departments", response_model=DepartmentResponse)
async def create_department(body: CreateDepartmentRequest, request=None):
    """
    Create a new department.
    Requires admin permissions.
    """
    from database.base import get_session
    from database.models.department import Department
    
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    with get_session() as session:
        dept = Department(
            id=uuid.uuid4(),
            org_id=org_id,
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
async def update_department(department_id: str, body: UpdateDepartmentRequest, request=None):
    """
    Update a department.
    Requires admin permissions.
    """
    from database.base import get_session
    from database.models.department import Department
    
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    with get_session() as session:
        dept = session.query(Department).filter(
            Department.id == department_id,
            Department.org_id == org_id
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
        return service.get_department_info(department_id, org_id)


@router.delete("/departments/{department_id}")
async def delete_department(department_id: str, request=None):
    """
    Delete a department.
    Requires admin permissions. Users in this department will have their department_id cleared.
    """
    from database.base import get_session
    from database.models.department import Department
    from database.models.user import User
    
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    with get_session() as session:
        dept = session.query(Department).filter(
            Department.id == department_id,
            Department.org_id == org_id
        ).first()
        
        if not dept:
            raise HTTPException(status_code=404, detail="Department not found")
        
        # Clear department_id from users
        session.query(User).filter(
            User.department_id == department_id,
            User.org_id == org_id
        ).update({User.department_id: None}, synchronize_session=False)
        
        # Move sub-departments to parent
        session.query(Department).filter(
            Department.parent_id == department_id,
            Department.org_id == org_id
        ).update({Department.parent_id: dept.parent_id}, synchronize_session=False)
        
        session.delete(dept)
        session.commit()
    
    return {"status": "success", "message": f"Department {department_id} deleted"}


# ============================================================================
# IDENTITY PROVIDER CONFIGURATION ENDPOINTS
# ============================================================================

@router.get("/directory-config", response_model=DirectorySourceConfig)
async def get_directory_config(request=None):
    """
    Get the current directory source configuration.
    Requires admin permissions (system:settings).
    """
    from database.base import get_session
    from database.models.organization import Organization
    
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == org_id).first()
        
        if not org:
            return DirectorySourceConfig()
        
        return DirectorySourceConfig(
            directory_source=org.directory_source or "internal",
            hr_api_config=org.hr_api_config,
        )


@router.put("/directory-config", response_model=DirectorySourceConfig)
async def update_directory_config(body: DirectorySourceConfig, request=None):
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
    
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    with get_session() as session:
        org = session.query(Organization).filter(Organization.id == org_id).first()
        
        if not org:
            raise HTTPException(status_code=404, detail="Organization not found")
        
        org.directory_source = body.directory_source
        if body.hr_api_config is not None:
            org.hr_api_config = body.hr_api_config
        
        org.updated_at = datetime.utcnow()
        session.commit()
    
    return body


# ============================================================================
# PROCESS INTEGRATION ENDPOINTS
# ============================================================================

@router.post("/resolve-assignees", response_model=ResolveAssigneeResponse)
async def resolve_process_assignees(body: ResolveAssigneeRequest, request=None):
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
    org_id = request.headers.get("X-Org-Id", "") if request else ""
    
    service = get_directory_service()
    user_ids = service.resolve_process_assignee(
        body.assignee_config,
        body.process_context,
        org_id
    )
    
    # Optionally resolve full user attributes
    resolved_users = []
    for uid in user_ids:
        attrs = service.get_user(uid, org_id)
        if attrs:
            resolved_users.append(UserAttributesResponse(**attrs.model_dump()))
    
    return ResolveAssigneeResponse(
        user_ids=user_ids,
        resolved_users=resolved_users,
    )
