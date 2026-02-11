"""
Identity & Org Chart API Schemas
=================================
Pydantic models for request/response validation.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ============================================================================
# ORG CHART SCHEMAS
# ============================================================================

class UpdateManagerRequest(BaseModel):
    """Request to update a user's manager"""
    manager_id: Optional[str] = None  # None to remove manager


class UpdateEmployeeIdRequest(BaseModel):
    """Request to update a user's employee ID"""
    employee_id: str


class BulkOrgChartUpdate(BaseModel):
    """Single entry in a bulk org chart update"""
    user_id: str
    manager_id: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    job_title: Optional[str] = None


class BulkOrgChartRequest(BaseModel):
    """Request for bulk org chart updates"""
    updates: List[BulkOrgChartUpdate]


class BulkOrgChartResponse(BaseModel):
    """Response for bulk org chart updates"""
    success_count: int
    error_count: int
    errors: List[Dict[str, Any]] = []


# ============================================================================
# USER DIRECTORY SCHEMAS
# ============================================================================

class UserAttributesResponse(BaseModel):
    """User attributes response"""
    user_id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    manager_id: Optional[str] = None
    manager_email: Optional[str] = None
    manager_name: Optional[str] = None
    group_ids: List[str] = []
    group_names: List[str] = []
    role_ids: List[str] = []
    role_names: List[str] = []
    is_manager: bool = False
    direct_report_count: int = 0
    source: str = "internal"


class OrgChartNodeResponse(BaseModel):
    """Org chart node response"""
    user_id: str
    email: str
    display_name: str
    job_title: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    manager_id: Optional[str] = None
    direct_reports: List["OrgChartNodeResponse"] = []
    level: int = 0


class DepartmentResponse(BaseModel):
    """Department info response"""
    id: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    member_count: int = 0
    sub_departments: List["DepartmentResponse"] = []


class CreateDepartmentRequest(BaseModel):
    """Request to create a department"""
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None


class UpdateDepartmentRequest(BaseModel):
    """Request to update a department"""
    name: Optional[str] = None
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None


# ============================================================================
# IDENTITY PROVIDER SCHEMAS
# ============================================================================

class DirectorySourceConfig(BaseModel):
    """Configuration for the identity directory source"""
    directory_source: str = "internal"  # internal, ldap, hr_api, hybrid
    hr_api_config: Optional[Dict[str, Any]] = None


class ResolveAssigneeRequest(BaseModel):
    """Request to resolve process assignees"""
    assignee_config: Dict[str, Any]
    process_context: Dict[str, Any] = {}


class ResolveAssigneeResponse(BaseModel):
    """Response with resolved assignee user IDs"""
    user_ids: List[str]
    resolved_users: List[UserAttributesResponse] = []


# Update forward refs for self-referencing models
OrgChartNodeResponse.model_rebuild()
DepartmentResponse.model_rebuild()
