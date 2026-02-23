"""
User Directory Service
======================
Unified facade for resolving user identity attributes from any configured source.

Supports three identity sources:
1. Internal (built-in) - Uses AgentForge's own user/department/org tables
2. LDAP/Active Directory - Queries LDAP for user attributes
3. HR API - Calls external HR system REST API

The source is configured per-organization via Organization.directory_source.

Industry Standards Applied:
- SCIM 2.0 compatible attribute naming
- NIST SP 800-63 identity assurance model
- OpenID Connect standard claims mapping
"""

import logging
import uuid as _uuid_mod
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


def _resolve_org_uuid(org_id: str) -> Optional[str]:
    """
    Resolve an org_id from ANY format to the actual DB UUID string.
    
    Handles:
    - Standard UUID string → returned as-is
    - "org_default" → looks up the default organization
    - "org_xxxx" (prefixed format from security_state) → looks up by slug/name
    - None/empty → returns None
    
    Returns the UUID string or None if not resolvable.
    """
    if not org_id:
        return None
    
    # Already a valid UUID?
    try:
        _uuid_mod.UUID(str(org_id))
        return str(org_id)
    except (ValueError, AttributeError):
        pass
    
    # Prefixed format (org_default, org_xxxx)
    try:
        from database.base import get_session
        from database.models.organization import Organization
        
        with get_session() as session:
            if org_id == "org_default":
                org = session.query(Organization).filter(
                    Organization.slug == "default"
                ).first()
                if org:
                    return str(org.id)
            
            # Try to find any org (for single-org deployments)
            # This handles "org_xxxx" format where xxxx doesn't map to anything
            orgs = session.query(Organization).limit(2).all()
            if len(orgs) == 1:
                # Single organization — use it
                logger.info("[_resolve_org_uuid] Single org found, resolving '%s' → '%s'", org_id, str(orgs[0].id))
                return str(orgs[0].id)
            elif len(orgs) > 1:
                # Multiple orgs — try to match by name/slug containing the prefix
                for o in orgs:
                    if org_id.replace("org_", "") in str(o.id).replace("-", ""):
                        return str(o.id)
    except Exception as e:
        logger.warning("[_resolve_org_uuid] Failed to resolve org_id '%s': %s", org_id, e)
    
    return None


# ============================================================================
# USER ATTRIBUTES MODEL (Unified Schema)
# ============================================================================

class UserAttributes(BaseModel):
    """
    Unified user attributes resolved from any identity source.
    
    This is the standard schema returned regardless of whether the data
    comes from the internal DB, LDAP, or an HR API.
    
    Follows SCIM 2.0 / OpenID Connect standard claim naming.
    """
    # Core Identity
    user_id: str  # AgentForge internal user ID
    email: str
    
    # Profile
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    display_name: Optional[str] = None
    job_title: Optional[str] = None
    phone: Optional[str] = None
    
    # Organizational
    employee_id: Optional[str] = None  # HR system identifier
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    manager_id: Optional[str] = None  # AgentForge user ID of manager
    manager_email: Optional[str] = None
    manager_name: Optional[str] = None
    
    # Groups & Roles
    group_ids: List[str] = []
    group_names: List[str] = []
    role_ids: List[str] = []
    role_names: List[str] = []
    
    # Hierarchy position
    is_manager: bool = False  # Has direct reports
    direct_report_count: int = 0
    
    # Source info
    source: str = "internal"  # internal, ldap, hr_api
    last_synced_at: Optional[str] = None
    
    # Extended attributes (for custom fields from HR/LDAP)
    custom_attributes: Dict[str, Any] = {}
    
    @property
    def full_name(self) -> str:
        """Get full display name"""
        if self.display_name:
            return self.display_name
        parts = [self.first_name, self.last_name]
        return " ".join(p for p in parts if p) or self.email.split("@")[0]


class OrgChartNode(BaseModel):
    """Represents a node in the organizational chart"""
    user_id: str
    email: str
    display_name: str
    job_title: Optional[str] = None
    employee_id: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None
    manager_id: Optional[str] = None
    direct_reports: List["OrgChartNode"] = []
    level: int = 0  # Depth in hierarchy (0 = top)


class DepartmentInfo(BaseModel):
    """Department information with members"""
    id: str
    name: str
    description: Optional[str] = None
    parent_id: Optional[str] = None
    manager_id: Optional[str] = None
    manager_name: Optional[str] = None
    member_count: int = 0
    sub_departments: List["DepartmentInfo"] = []


# ============================================================================
# USER DIRECTORY SERVICE (Main Facade)
# ============================================================================

class UserDirectoryService:
    """
    Unified User Directory Service.
    
    Resolves user attributes from the configured identity source for each
    organization. This is the single entry point that processes, approval
    nodes, and other platform features use to look up user information.
    
    Usage:
        directory = UserDirectoryService()
        
        # Get user attributes
        user = await directory.get_user(user_id, org_id)
        
        # Get user's manager
        manager = await directory.get_manager(user_id, org_id)
        
        # Get department members
        members = await directory.get_department_members(dept_id, org_id)
        
        # Resolve dynamic assignee for process approvals
        assignee = await directory.resolve_assignee("{{ trigger_input.manager_id }}", context)
    """
    
    def __init__(self):
        self._providers = {}
    
    # ========================================================================
    # CORE USER OPERATIONS
    # ========================================================================
    
    def get_user(self, user_id: str, org_id: str) -> Optional[UserAttributes]:
        """
        Get user attributes from the configured directory source.
        
        Args:
            user_id: AgentForge user ID
            org_id: Organization ID
            
        Returns:
            UserAttributes or None if not found
        """
        source = self._get_directory_source(org_id)
        
        if source == "internal":
            return self._get_user_internal(user_id, org_id)
        elif source == "ldap":
            return self._get_user_ldap(user_id, org_id)
        elif source == "hr_api":
            return self._get_user_hr_api(user_id, org_id)
        elif source == "hybrid":
            # Try internal first, enrich with external
            user = self._get_user_internal(user_id, org_id)
            if user:
                return self._enrich_from_external(user, org_id)
            return None
        else:
            logger.warning(f"Unknown directory source '{source}' for org {org_id}, falling back to internal")
            return self._get_user_internal(user_id, org_id)
    
    def get_user_by_email(self, email: str, org_id: str) -> Optional[UserAttributes]:
        """Get user attributes by email address."""
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            user = session.query(User).filter(
                User.email == email,
                User.org_id == org_id
            ).first()
            
            if user:
                return self.get_user(str(user.id), org_id)
        return None
    
    def get_user_by_employee_id(self, employee_id: str, org_id: str) -> Optional[UserAttributes]:
        """Get user attributes by HR employee ID."""
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            user = session.query(User).filter(
                User.employee_id == employee_id,
                User.org_id == org_id
            ).first()
            
            if user:
                return self.get_user(str(user.id), org_id)
        
        # If not found internally and directory is external, try external
        source = self._get_directory_source(org_id)
        if source in ("hr_api", "hybrid"):
            return self._get_user_by_employee_id_hr_api(employee_id, org_id)
        
        return None
    
    # ========================================================================
    # MANAGER / HIERARCHY OPERATIONS
    # ========================================================================
    
    def get_manager(self, user_id: str, org_id: str) -> Optional[UserAttributes]:
        """
        Get the direct manager of a user.
        
        This is the key method used by Process approval nodes to resolve
        the "manager" assignee dynamically.
        
        Args:
            user_id: AgentForge user ID
            org_id: Organization ID
            
        Returns:
            UserAttributes of the manager, or None
        """
        user = self.get_user(user_id, org_id)
        if not user or not user.manager_id:
            # Try to resolve via department manager
            if user and user.department_id:
                return self._get_department_manager(user.department_id, org_id)
            return None
        
        return self.get_user(user.manager_id, org_id)
    
    def get_direct_reports(self, manager_id: str, org_id: str) -> List[UserAttributes]:
        """
        Get all direct reports of a manager.
        
        Args:
            manager_id: AgentForge user ID of the manager
            org_id: Organization ID
            
        Returns:
            List of UserAttributes for direct reports
        """
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            reports = session.query(User).filter(
                User.manager_id == manager_id,
                User.org_id == org_id,
                User.status == "active"
            ).all()
            
            return [self._user_to_attributes(u, org_id) for u in reports]
    
    def get_management_chain(self, user_id: str, org_id: str, max_depth: int = 10) -> List[UserAttributes]:
        """
        Get the full management chain from user up to the top.
        Useful for multi-level approval workflows.
        
        Args:
            user_id: Starting user ID
            org_id: Organization ID
            max_depth: Maximum levels to traverse (prevents infinite loops)
            
        Returns:
            List from immediate manager up to top-level (ordered)
        """
        chain = []
        current_id = user_id
        visited = set()
        
        for _ in range(max_depth):
            if current_id in visited:
                break  # Prevent cycles
            visited.add(current_id)
            
            manager = self.get_manager(current_id, org_id)
            if not manager:
                break
            
            chain.append(manager)
            current_id = manager.user_id
        
        return chain
    
    # ========================================================================
    # DEPARTMENT OPERATIONS
    # ========================================================================
    
    def get_department_members(self, department_id: str, org_id: str) -> List[UserAttributes]:
        """
        Get all members of a department.
        
        Args:
            department_id: Department ID
            org_id: Organization ID
            
        Returns:
            List of UserAttributes for department members
        """
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            members = session.query(User).filter(
                User.department_id == department_id,
                User.org_id == org_id,
                User.status == "active"
            ).all()
            
            return [self._user_to_attributes(u, org_id) for u in members]
    
    def get_department_info(self, department_id: str, org_id: str) -> Optional[DepartmentInfo]:
        """Get department information including manager and member count."""
        from database.base import get_session
        from database.models.department import Department
        from database.models.user import User
        
        with get_session() as session:
            dept = session.query(Department).filter(
                Department.id == department_id,
                Department.org_id == org_id
            ).first()
            
            if not dept:
                return None
            
            # Count members
            member_count = session.query(User).filter(
                User.department_id == department_id,
                User.org_id == org_id,
                User.status == "active"
            ).count()
            
            # Get manager name
            manager_name = None
            if dept.manager_id:
                manager = session.query(User).filter(User.id == dept.manager_id).first()
                if manager:
                    manager_name = manager.display_name or f"{manager.first_name or ''} {manager.last_name or ''}".strip()
            
            # Get sub-departments
            sub_depts = session.query(Department).filter(
                Department.parent_id == department_id,
                Department.org_id == org_id
            ).all()
            
            return DepartmentInfo(
                id=str(dept.id),
                name=dept.name,
                description=dept.description,
                parent_id=str(dept.parent_id) if dept.parent_id else None,
                manager_id=str(dept.manager_id) if dept.manager_id else None,
                manager_name=manager_name,
                member_count=member_count,
                sub_departments=[
                    DepartmentInfo(
                        id=str(sd.id),
                        name=sd.name,
                        parent_id=str(sd.parent_id) if sd.parent_id else None,
                        manager_id=str(sd.manager_id) if sd.manager_id else None,
                    )
                    for sd in sub_depts
                ]
            )
    
    def get_org_departments(self, org_id: str) -> List[DepartmentInfo]:
        """Get all departments for an organization."""
        from database.base import get_session
        from database.models.department import Department
        from database.models.user import User
        from sqlalchemy import func
        
        with get_session() as session:
            depts = session.query(Department).filter(
                Department.org_id == org_id
            ).all()
            
            result = []
            for dept in depts:
                member_count = session.query(User).filter(
                    User.department_id == dept.id,
                    User.org_id == org_id,
                    User.status == "active"
                ).count()
                
                manager_name = None
                if dept.manager_id:
                    mgr = session.query(User).filter(User.id == dept.manager_id).first()
                    if mgr:
                        manager_name = mgr.display_name or f"{mgr.first_name or ''} {mgr.last_name or ''}".strip()
                
                result.append(DepartmentInfo(
                    id=str(dept.id),
                    name=dept.name,
                    description=dept.description,
                    parent_id=str(dept.parent_id) if dept.parent_id else None,
                    manager_id=str(dept.manager_id) if dept.manager_id else None,
                    manager_name=manager_name,
                    member_count=member_count,
                ))
            
            return result
    
    # ========================================================================
    # ORG CHART OPERATIONS
    # ========================================================================
    
    def get_org_chart(self, org_id: str, root_user_id: Optional[str] = None, max_depth: int = 5) -> List[OrgChartNode]:
        """
        Build the organizational chart tree.
        
        Args:
            org_id: Organization ID
            root_user_id: Start from this user (None = top of org)
            max_depth: Maximum depth to traverse
            
        Returns:
            List of top-level OrgChartNode with nested direct_reports
        """
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            # Get all active users in the org
            users = session.query(User).filter(
                User.org_id == org_id,
                User.status == "active"
            ).all()
            
            # Build lookup maps
            user_map = {}
            children_map = {}  # manager_id -> [user objects]
            
            for u in users:
                uid = str(u.id)
                user_map[uid] = u
                mgr_id = str(u.manager_id) if u.manager_id else None
                if mgr_id:
                    if mgr_id not in children_map:
                        children_map[mgr_id] = []
                    children_map[mgr_id].append(u)
            
            def build_node(user, depth=0):
                uid = str(user.id)
                reports = children_map.get(uid, [])
                return OrgChartNode(
                    user_id=uid,
                    email=user.email,
                    display_name=user.display_name or f"{user.first_name or ''} {user.last_name or ''}".strip() or user.email,
                    job_title=user.job_title,
                    employee_id=user.employee_id,
                    department_id=str(user.department_id) if user.department_id else None,
                    manager_id=str(user.manager_id) if user.manager_id else None,
                    direct_reports=[
                        build_node(r, depth + 1) for r in reports
                    ] if depth < max_depth else [],
                    level=depth,
                )
            
            if root_user_id and root_user_id in user_map:
                return [build_node(user_map[root_user_id])]
            
            # Find top-level users (no manager or manager not in org)
            top_users = [
                u for u in users
                if not u.manager_id or str(u.manager_id) not in user_map
            ]
            
            return [build_node(u) for u in top_users]
    
    def update_user_manager(self, user_id: str, manager_id: Optional[str], org_id: str, updated_by: str) -> bool:
        """
        Update a user's direct manager.
        
        Args:
            user_id: User to update
            manager_id: New manager ID (None to remove manager)
            org_id: Organization ID
            updated_by: ID of user making the change
            
        Returns:
            True if successful
        """
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            user = session.query(User).filter(
                User.id == user_id,
                User.org_id == org_id
            ).first()
            
            if not user:
                return False
            
            # Prevent self-assignment
            if manager_id and str(manager_id) == str(user_id):
                logger.warning(f"Cannot set user {user_id} as their own manager")
                return False
            
            # Prevent circular chains
            if manager_id:
                chain = set()
                current = manager_id
                while current:
                    if str(current) == str(user_id):
                        logger.warning(f"Circular management chain detected for user {user_id}")
                        return False
                    if str(current) in chain:
                        break
                    chain.add(str(current))
                    mgr = session.query(User).filter(User.id == current).first()
                    current = mgr.manager_id if mgr else None
            
            user.manager_id = manager_id
            user.updated_at = datetime.utcnow()
            session.commit()
            
            # Keep in-memory security cache in sync so save_to_disk() doesn't overwrite
            try:
                from core.security.state import security_state
                cached = security_state.users.get(user_id)
                if cached and getattr(cached, 'org_id', None) == org_id:
                    cached.manager_id = str(manager_id) if manager_id else None
            except Exception:
                pass
            
            logger.info(f"Updated manager for user {user_id} to {manager_id} by {updated_by}")
            return True
    
    def update_user_employee_id(self, user_id: str, employee_id: str, org_id: str) -> bool:
        """Update a user's employee ID (HR system identifier)."""
        from database.base import get_session
        from database.models.user import User
        
        with get_session() as session:
            user = session.query(User).filter(
                User.id == user_id,
                User.org_id == org_id
            ).first()
            
            if not user:
                return False
            
            user.employee_id = employee_id
            user.updated_at = datetime.utcnow()
            session.commit()
            
            # Keep in-memory security cache in sync
            try:
                from core.security.state import security_state
                cached = security_state.users.get(user_id)
                if cached and getattr(cached, 'org_id', None) == org_id:
                    cached.employee_id = employee_id
            except Exception:
                pass
            
            return True
    
    def bulk_update_org_chart(self, org_id: str, updates: List[Dict[str, Any]], updated_by: str) -> Dict[str, Any]:
        """
        Bulk update organizational hierarchy.
        
        Args:
            org_id: Organization ID
            updates: List of {user_id, manager_id, employee_id, department_id}
            updated_by: ID of user making the change
            
        Returns:
            Summary of updates {success_count, error_count, errors}
        """
        from database.base import get_session
        from database.models.user import User
        
        success_count = 0
        error_count = 0
        errors = []
        
        with get_session() as session:
            for update in updates:
                user_id = update.get("user_id")
                if not user_id:
                    error_count += 1
                    errors.append({"user_id": None, "error": "Missing user_id"})
                    continue
                
                user = session.query(User).filter(
                    User.id == user_id,
                    User.org_id == org_id
                ).first()
                
                if not user:
                    error_count += 1
                    errors.append({"user_id": user_id, "error": "User not found"})
                    continue
                
                try:
                    if "manager_id" in update:
                        user.manager_id = update["manager_id"]
                    if "employee_id" in update:
                        user.employee_id = update["employee_id"]
                    if "department_id" in update:
                        user.department_id = update["department_id"]
                    if "job_title" in update:
                        user.job_title = update["job_title"]
                    
                    user.updated_at = datetime.utcnow()
                    success_count += 1
                except Exception as e:
                    error_count += 1
                    errors.append({"user_id": user_id, "error": str(e)})
            
            session.commit()
        
        logger.info(f"Bulk org chart update: {success_count} success, {error_count} errors")
        return {
            "success_count": success_count,
            "error_count": error_count,
            "errors": errors
        }
    
    # ========================================================================
    # PROCESS INTEGRATION METHODS
    # ========================================================================
    
    def resolve_process_assignee(
        self,
        assignee_config: Dict[str, Any],
        process_context: Dict[str, Any],
        org_id: str
    ) -> List[str]:
        """
        Resolve dynamic assignees for process approval/notification nodes.
        
        This method handles all assignee resolution patterns:
        1. Static user IDs
        2. Dynamic expressions ({{ trigger_input.manager_id }})
        3. Role-based (all users with a specific role)
        4. Department-based (department manager, all members)
        5. Manager of triggering user
        6. Custom HR lookup
        
        Args:
            assignee_config: Configuration from the process node, e.g.:
                {
                    "type": "dynamic_manager",  # or "static", "role", "department_manager", "expression"
                    "user_ids": [...],  # for static
                    "role_ids": [...],  # for role-based
                    "expression": "{{ trigger_input.manager_id }}",  # for expression
                }
            process_context: Runtime context with trigger_input, variables, user info
            org_id: Organization ID
            
        Returns:
            List of resolved user IDs
        """
        # Backward-compatible aliases:
        # - process nodes commonly use "directory_assignee_type"
        # - older callers may set "type"
        assignee_type = assignee_config.get("type") or assignee_config.get("directory_assignee_type") or "static"

        def _resolve_department_id() -> Optional[str]:
            """
            Resolve a department ID from config or context.

            Supports:
            - department_id (preferred if present)
            - department_name (case-insensitive lookup within org)
            - if neither is provided, use triggering user's department when applicable
            """
            dept_id = assignee_config.get("department_id") or assignee_config.get("departmentId")
            if isinstance(dept_id, str) and not dept_id.strip():
                dept_id = None
            if dept_id:
                return dept_id

            dept_name = assignee_config.get("department_name") or assignee_config.get("departmentName")
            if isinstance(dept_name, str):
                dept_name = dept_name.strip()
            else:
                dept_name = None

            if dept_name:
                try:
                    from database.base import get_session
                    from database.models.department import Department
                    with get_session() as session:
                        dept = session.query(Department).filter(
                            Department.org_id == org_id,
                            Department.name.ilike(dept_name)
                        ).first()
                        if dept:
                            return str(dept.id)
                except Exception:
                    # Never fail assignee resolution due to lookup edge cases
                    pass

            # Fallback to triggering user's department where meaningful
            trigger_user_id = process_context.get("user_id")
            if trigger_user_id:
                user = self.get_user(trigger_user_id, org_id)
                return user.department_id if user else None
            return None
        
        if assignee_type == "static":
            return assignee_config.get("user_ids", [])
        
        elif assignee_type == "role":
            # Get all users with the specified roles
            return self._get_users_by_roles(assignee_config.get("role_ids", []), org_id)
        
        elif assignee_type == "dynamic_manager":
            # Get the manager of the user who triggered the process
            trigger_user_id = process_context.get("user_id") or process_context.get("trigger_input", {}).get("requested_by")
            if trigger_user_id:
                manager = self.get_manager(trigger_user_id, org_id)
                if manager:
                    return [manager.user_id]
            return []
        
        elif assignee_type == "department_manager":
            # Get the department manager
            dept_id = _resolve_department_id()
            if dept_id:
                mgr = self._get_department_manager(dept_id, org_id)
                if mgr:
                    return [mgr.user_id]
            return []
        
        elif assignee_type == "department_members":
            # Get all members of a department
            dept_id = _resolve_department_id()
            if dept_id:
                members = self.get_department_members(dept_id, org_id)
                return [m.user_id for m in members]
            return []
        
        elif assignee_type == "management_chain":
            # Get the management chain up to a certain level
            trigger_user_id = process_context.get("user_id")
            level = assignee_config.get("level", 1)  # 1 = immediate manager, 2 = skip-level
            if trigger_user_id:
                chain = self.get_management_chain(trigger_user_id, org_id, max_depth=level)
                if chain and len(chain) >= level:
                    return [chain[level - 1].user_id]
                elif chain:
                    return [chain[-1].user_id]
            return []
        
        elif assignee_type == "expression":
            # Resolve a template expression
            expression = assignee_config.get("expression", "")
            resolved = self._resolve_expression(expression, process_context)
            if resolved:
                return [resolved] if isinstance(resolved, str) else resolved
            return []
        
        elif assignee_type == "group":
            # Get all users in specified groups
            return self._get_users_by_groups(assignee_config.get("group_ids", []), org_id)
        
        else:
            logger.warning(f"Unknown assignee type: {assignee_type}")
            return assignee_config.get("user_ids", [])
    
    def discover_available_attributes(self, org_id: str) -> Dict[str, Any]:
        """
        Discover ALL user attributes available for this organization.
        
        Returns standard attributes + any custom attributes found across users.
        Used by the AI wizard to know exactly what fields can be pre-filled.
        
        Args:
            org_id: Organization ID
            
        Returns:
            Dict with 'standard' (always available) and 'custom' (org-specific) attribute lists
        """
        standard_attrs = [
            {"key": "email", "label": "Email", "type": "string"},
            {"key": "name", "label": "Full Name", "type": "string"},
            {"key": "firstName", "label": "First Name", "type": "string"},
            {"key": "lastName", "label": "Last Name", "type": "string"},
            {"key": "phone", "label": "Phone", "type": "string"},
            {"key": "jobTitle", "label": "Job Title", "type": "string"},
            {"key": "employeeId", "label": "Employee ID", "type": "string"},
            {"key": "departmentId", "label": "Department ID", "type": "string"},
            {"key": "departmentName", "label": "Department", "type": "string"},
            {"key": "managerId", "label": "Manager ID", "type": "string"},
            {"key": "managerName", "label": "Manager Name", "type": "string"},
            {"key": "managerEmail", "label": "Manager Email", "type": "string"},
            {"key": "departmentHeadId", "label": "Department Head ID", "type": "string"},
            {"key": "departmentHeadName", "label": "Department Head Name", "type": "string"},
            {"key": "departmentHeadEmail", "label": "Department Head Email", "type": "string"},
            {"key": "roles", "label": "Roles", "type": "array"},
            {"key": "groups", "label": "Groups", "type": "array"},
            {"key": "isManager", "label": "Is Manager", "type": "boolean"},
        ]
        
        # Discover custom attributes by scanning users in this org
        custom_attrs_found = {}
        try:
            from database.base import get_session
            from database.models.user import User
            from database.models.organization import Organization
            
            with get_session() as session:
                # 1) Include org-level schema-defined fields (global definitions)
                try:
                    org = session.query(Organization).filter(Organization.id == org_id).first()
                    settings_raw = (org.settings or {}) if org else {}
                    # Some DB states may store JSON as a string; normalize.
                    try:
                        import json as _json
                        if isinstance(settings_raw, str):
                            settings_raw = _json.loads(settings_raw) if settings_raw.strip() else {}
                    except Exception:
                        settings_raw = {}
                    settings = settings_raw if isinstance(settings_raw, dict) else {}
                    schema_fields = settings.get("profile_fields_schema") or []
                    if isinstance(schema_fields, list):
                        for f in schema_fields:
                            if not isinstance(f, dict):
                                continue
                            k = (f.get("key") or "").strip()
                            if not k:
                                continue
                            custom_attrs_found[k] = {
                                "key": k,
                                "label": f.get("label") or k.replace("_", " ").replace("-", " ").title(),
                                "type": f.get("type") or "string",
                                "source": f.get("source") or "org_schema",
                                "description": f.get("description"),
                                "required": bool(f.get("required", False)),
                                "options": f.get("options") if isinstance(f.get("options"), list) else None,
                            }
                except Exception:
                    # Schema fields are optional; never fail discovery because of them
                    pass

                # 2) Discover additional custom attributes by scanning users in this org
                users = session.query(User).filter(
                    User.org_id == org_id,
                    User.status == "active"
                ).limit(100).all()
                
                for u in users:
                    if hasattr(u, 'user_metadata') and isinstance(u.user_metadata, dict):
                        for k, v in u.user_metadata.items():
                            if k not in custom_attrs_found and v is not None:
                                # Infer type from first non-None value
                                val_type = "string"
                                if isinstance(v, bool):
                                    val_type = "boolean"
                                elif isinstance(v, (int, float)):
                                    val_type = "number"
                                elif isinstance(v, list):
                                    val_type = "array"
                                custom_attrs_found[k] = {
                                    "key": k,
                                    "label": k.replace("_", " ").replace("-", " ").title(),
                                    "type": val_type,
                                    "source": "custom"
                                }
        except Exception as e:
            logger.warning(f"Failed to discover custom attributes: {e}")
        
        return {
            "standard": standard_attrs,
            "custom": list(custom_attrs_found.values()),
            "all_keys": [a["key"] for a in standard_attrs] + list(custom_attrs_found.keys())
        }
    
    def discover_identity_context(self, org_id: str) -> Dict[str, Any]:
        """
        Discover the identity configuration and health for an organization.
        
        Used by the AI wizard to understand HOW user identity is configured,
        so it can generate correct process configurations (approval routing,
        notification recipients, etc.).
        
        Returns:
            Dict with identity source type, capabilities, and health indicators
        """
        result = {
            "source": "internal",
            "source_label": "Built-in Identity Directory",
            "is_configured": True,
            "capabilities": {
                "has_managers": False,
                "has_departments": False,
                "has_custom_attributes": False,
                "manager_coverage_pct": 0,
            },
            "warnings": [],
        }
        
        try:
            # Get the configured source
            config = self._get_org_config(org_id)
            if config:
                source = config.get("directory_source", "internal")
                result["source"] = source
                source_labels = {
                    "internal": "Built-in Identity Directory",
                    "ldap": "LDAP / Active Directory",
                    "hr_api": "HR System API",
                    "hybrid": "Hybrid (Internal + External)",
                }
                result["source_label"] = source_labels.get(source, source)
                if source == "ldap" and not config.get("ldap_config_id"):
                    result["warnings"].append(
                        "LDAP is selected as identity source but no LDAP configuration is set up. "
                        "Falling back to built-in directory."
                    )
                if source == "hr_api" and not config.get("hr_api_config"):
                    result["warnings"].append(
                        "HR API is selected as identity source but no HR API configuration exists. "
                        "Falling back to built-in directory."
                    )
            
            # Check actual data health
            from database.base import get_session
            from database.models.user import User
            
            with get_session() as session:
                total_users = session.query(User).filter(
                    User.org_id == org_id,
                    User.status == "active"
                ).count()
                
                if total_users == 0:
                    result["is_configured"] = False
                    result["warnings"].append("No active users found in this organization.")
                else:
                    # Check manager coverage
                    # Note: manager_id is UUID — only check IS NOT NULL (no empty string compare)
                    users_with_manager = session.query(User).filter(
                        User.org_id == org_id,
                        User.status == "active",
                        User.manager_id.isnot(None),
                    ).count()
                    
                    pct = round(users_with_manager / total_users * 100) if total_users else 0
                    result["capabilities"]["has_managers"] = users_with_manager > 0
                    result["capabilities"]["manager_coverage_pct"] = pct
                    
                    if users_with_manager == 0:
                        result["warnings"].append(
                            "No users have managers assigned. "
                            "Approval routing to 'dynamic_manager' and notifications to 'manager' will not work. "
                            "Assign managers in the Identity Directory."
                        )
                    elif pct < 50:
                        result["warnings"].append(
                            f"Only {pct}% of users have managers assigned ({users_with_manager}/{total_users}). "
                            "Some users' processes may fail at manager approval/notification steps."
                        )
                    
                    # Check department coverage
                    from database.models.department import Department
                    dept_count = session.query(Department).filter(
                        Department.org_id == org_id
                    ).count()
                    result["capabilities"]["has_departments"] = dept_count > 0
                    
                    if dept_count == 0:
                        result["warnings"].append(
                            "No departments configured. Department-based routing will not work."
                        )
                    
                    # Check custom attributes
                    users_with_custom = 0
                    sample_users = session.query(User).filter(
                        User.org_id == org_id,
                        User.status == "active"
                    ).limit(20).all()
                    for u in sample_users:
                        if hasattr(u, 'user_metadata') and isinstance(u.user_metadata, dict) and u.user_metadata:
                            users_with_custom += 1
                    result["capabilities"]["has_custom_attributes"] = users_with_custom > 0
                    
                    result["total_users"] = total_users
                    result["users_with_managers"] = users_with_manager
                    result["departments_count"] = dept_count
        
        except Exception as e:
            logger.warning(f"Failed to discover identity context: {e}")
            result["warnings"].append(f"Could not query identity data: {e}")
        
        return result
    
    def enrich_process_context(self, user_id: str, org_id: str) -> Dict[str, Any]:
        """
        Enrich process context with ALL available user directory information.
        
        Called when a process starts to provide user context to all nodes.
        This is FULLY DYNAMIC — every attribute from the identity source
        (Built-in, LDAP, HR System) is included, including custom_attributes
        which are flattened into the top level so any field is accessible
        via {{ trigger_input._user_context.<field> }}.
        
        Args:
            user_id: The user who triggered the process
            org_id: Organization ID
            
        Returns:
            Dict of ALL user context data for process variables
        """
        logger.info("[enrich_process_context] Looking up user_id=%s, org_id=%s", user_id, org_id)
        user = self.get_user(user_id, org_id)
        if not user:
            logger.warning("[enrich_process_context] get_user returned None for user_id=%s, org_id=%s", user_id, org_id)
            return {"user_id": user_id}
        logger.info("[enrich_process_context] Found user: email=%s, manager_id=%s, manager_email=%s",
                     user.email, user.manager_id, user.manager_email)
        
        # Start with ALL standard attributes from UserAttributes
        context = {
            # Core identity
            "user_id": user.user_id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "display_name": (
                user.display_name
                or f"{user.first_name or ''} {user.last_name or ''}".strip()
                or (user.email.split("@")[0] if user.email else None)
            ),
            "phone": user.phone,
            # Professional
            "job_title": user.job_title,
            "employee_id": user.employee_id,
            # Organizational
            "department_id": user.department_id,
            "department_name": user.department_name,
            "manager_id": user.manager_id,
            "manager_email": user.manager_email,
            "manager_name": user.manager_name,
            # Groups & Roles (IDs and names for both programmatic and display use)
            "group_ids": user.group_ids,
            "group_names": user.group_names,
            "role_ids": user.role_ids,
            "role_names": user.role_names,
            # Hierarchy info
            "is_manager": user.is_manager,
            "direct_report_count": user.direct_report_count,
            # Identity source metadata
            "identity_source": user.source,
        }
        
        # FLATTEN custom_attributes into the context so ANY HR/LDAP field
        # is directly accessible (e.g., national_id, hire_date, office_location, 
        # cost_center, badge_number, etc.)
        if user.custom_attributes and isinstance(user.custom_attributes, dict):
            for attr_key, attr_val in user.custom_attributes.items():
                # Don't overwrite standard fields
                if attr_key not in context:
                    context[attr_key] = attr_val
            # Also keep the original dict for structured access
            context["custom_attributes"] = user.custom_attributes

        # Add department head (department manager) details when available.
        # This stays org-scoped and fully dynamic, enabling workflows like:
        # "route to department head" or templates like "{{ trigger_input._user_context.departmentHeadEmail }}".
        try:
            dept_id = context.get("department_id")
            if dept_id:
                dept = self.get_department_info(str(dept_id), org_id)
                mgr_id = getattr(dept, "manager_id", None) if dept else None
                if mgr_id:
                    mgr = self.get_user(str(mgr_id), org_id)
                    context["department_head_id"] = str(mgr_id)
                    if mgr:
                        context["department_head_email"] = mgr.email
                        context["department_head_name"] = (
                            mgr.display_name
                            or f"{mgr.first_name or ''} {mgr.last_name or ''}".strip()
                            or mgr.email
                        )
        except Exception:
            # Never fail context enrichment; department head is optional.
            pass
        
        return {k: v for k, v in context.items() if v is not None}
    
    # ========================================================================
    # INTERNAL DIRECTORY PROVIDER
    # ========================================================================
    
    def _get_user_internal(self, user_id: str, org_id: str) -> Optional[UserAttributes]:
        """Resolve user from internal database."""
        from database.base import get_session
        from database.models.user import User
        from database.models.department import Department
        from database.models.user_group import UserGroup
        from database.models.role import Role
        
        # ── Normalize org_id ────────────────────────────────────────
        # The security_state may pass "org_default" or "org_xxxx" format
        # but the DB uses UUID columns. Resolve to actual UUID first.
        resolved_org_id = _resolve_org_uuid(org_id)
        if resolved_org_id and resolved_org_id != org_id:
            logger.info("[_get_user_internal] Resolved org_id: '%s' → '%s'", org_id, resolved_org_id)
            org_id = resolved_org_id
        # ── End normalize ───────────────────────────────────────────
        
        with get_session() as session:
            user = None
            try:
                user = session.query(User).filter(
                    User.id == user_id,
                    User.org_id == org_id
                ).first()
                if not user:
                    # Fallback: try by user_id only (handles org_id=NULL in DB)
                    user = session.query(User).filter(User.id == user_id).first()
                    if user:
                        logger.warning(
                            "[_get_user_internal] User found by id=%s but org_id mismatch: "
                            "DB has org_id=%s, query had org_id=%s. Using the found user.",
                            user_id, user.org_id, org_id
                        )
                    else:
                        logger.warning("[_get_user_internal] User id=%s not found in DB at all", user_id)
            except Exception as ex:
                logger.warning("[_get_user_internal] Primary query failed: %s", ex)
                # Fallback: use raw SQL with explicit cast for type safety
                try:
                    session.rollback()
                    from sqlalchemy import text as _text
                    row = session.execute(
                        _text("SELECT id FROM users WHERE id::text = :uid LIMIT 1"),
                        {"uid": str(user_id)}
                    ).first()
                    if row:
                        user = session.query(User).get(row.id)
                    else:
                        logger.warning("[_get_user_internal] Fallback also found no user for id=%s", user_id)
                except Exception as e2:
                    logger.warning("_get_user_internal fallback failed: %s", e2)
            
            if not user:
                return None
            
            return self._user_to_attributes(user, org_id, session=session)
    
    def _user_to_attributes(self, user, org_id: str, session=None) -> UserAttributes:
        """Convert a User DB model to UserAttributes."""
        from database.base import get_session as _get_session
        from database.models.department import Department
        from database.models.user_group import UserGroup
        from database.models.role import Role
        from database.models.user import User
        
        own_session = session is None
        if own_session:
            session = _get_session().__enter__()
        
        try:
            # Resolve department name
            dept_name = None
            if user.department_id:
                dept = session.query(Department).filter(Department.id == user.department_id).first()
                if dept:
                    dept_name = dept.name
            
            # Resolve manager info
            # Use raw SQL with explicit cast to avoid VARCHAR/UUID type mismatch
            manager_email = None
            manager_name = None
            if user.manager_id:
                try:
                    from sqlalchemy import text as _text
                    mgr_row = session.execute(
                        _text("SELECT id, email, display_name, first_name, last_name FROM users WHERE id::text = :mid AND org_id = :oid LIMIT 1"),
                        {"mid": str(user.manager_id), "oid": str(org_id)}
                    ).first()
                    if mgr_row:
                        manager_email = mgr_row.email
                        manager_name = mgr_row.display_name or f"{mgr_row.first_name or ''} {mgr_row.last_name or ''}".strip()
                        logger.info("Resolved manager for user %s: email=%s, name=%s", str(user.id)[:8], manager_email, manager_name)
                except Exception as e:
                    logger.warning("Failed to resolve manager by id %s: %s", str(user.manager_id)[:8], e)
                    try:
                        session.rollback()
                    except Exception:
                        pass
            
            # Check if user is a manager (has direct reports)
            # Use text() with explicit cast to avoid VARCHAR/UUID type mismatch
            report_count = 0
            try:
                from sqlalchemy import text as _text
                report_count = session.execute(
                    _text("SELECT count(*) FROM users WHERE manager_id::text = :uid AND org_id = :oid AND status = 'active'"),
                    {"uid": str(user.id), "oid": str(org_id)}
                ).scalar() or 0
            except Exception as e:
                logger.warning("Failed to count direct reports: %s", e)
                try:
                    session.rollback()
                except Exception:
                    pass
            
            # Resolve group names
            group_names = []
            if user.group_ids:
                groups = session.query(UserGroup).filter(
                    UserGroup.id.in_(user.group_ids)
                ).all()
                group_names = [g.name for g in groups]
            
            # Resolve role names
            role_names = []
            if user.role_ids:
                roles = session.query(Role).filter(
                    Role.id.in_(user.role_ids)
                ).all()
                role_names = [r.name for r in roles]
            
            # Merge custom attributes from user_metadata (dynamic custom fields)
            # These are set by admins via the UI and are org-specific
            # Filter out internal keys (mfa_*, system keys)
            custom_attrs = {}
            raw_meta = None
            if hasattr(user, 'user_metadata') and isinstance(user.user_metadata, dict):
                raw_meta = user.user_metadata
            elif hasattr(user, 'profile') and hasattr(user.profile, 'custom_attributes') and isinstance(getattr(user.profile, 'custom_attributes', None), dict):
                raw_meta = user.profile.custom_attributes
            if raw_meta:
                custom_attrs = {
                    k: v for k, v in raw_meta.items()
                    if v is not None and not k.startswith('mfa_') and not k.startswith('_')
                }
            
            _display = (
                user.display_name
                or f"{user.first_name or ''} {user.last_name or ''}".strip()
                or (user.email.split("@")[0] if user.email else None)
            )
            return UserAttributes(
                user_id=str(user.id),
                email=user.email,
                first_name=user.first_name,
                last_name=user.last_name,
                display_name=_display,
                job_title=user.job_title,
                phone=user.phone,
                employee_id=user.employee_id,
                department_id=str(user.department_id) if user.department_id else None,
                department_name=dept_name,
                manager_id=str(user.manager_id) if user.manager_id else None,
                manager_email=manager_email,
                manager_name=manager_name,
                group_ids=[str(g) for g in (user.group_ids or [])],
                group_names=group_names,
                role_ids=[str(r) for r in (user.role_ids or [])],
                role_names=role_names,
                is_manager=report_count > 0,
                direct_report_count=report_count,
                custom_attributes=custom_attrs,
                source="internal",
            )
        finally:
            if own_session:
                session.close()
    
    def _get_department_manager(self, department_id: str, org_id: str) -> Optional[UserAttributes]:
        """Get the manager of a department."""
        from database.base import get_session
        from database.models.department import Department
        
        with get_session() as session:
            dept = session.query(Department).filter(
                Department.id == department_id,
                Department.org_id == org_id
            ).first()
            
            if dept and dept.manager_id:
                return self.get_user(str(dept.manager_id), org_id)
        
        return None
    
    # ========================================================================
    # LDAP DIRECTORY PROVIDER
    # ========================================================================
    
    def _get_user_ldap(self, user_id: str, org_id: str) -> Optional[UserAttributes]:
        """
        Resolve user from LDAP/Active Directory.
        
        First looks up the user in internal DB to get the external_id,
        then queries LDAP for additional attributes.
        """
        from database.base import get_session
        from database.models.user import User
        
        # Get internal user to find LDAP external_id
        with get_session() as session:
            user = session.query(User).filter(
                User.id == user_id,
                User.org_id == org_id
            ).first()
            
            if not user:
                return None
            
            # Start with internal data
            attrs = self._user_to_attributes(user, org_id, session=session)
        
        # Try to enrich from LDAP
        try:
            ldap_attrs = self._query_ldap(user.external_id or user.email, org_id)
            if ldap_attrs:
                # Merge LDAP data (LDAP takes precedence for directory attributes)
                if ldap_attrs.get("manager_dn"):
                    manager_user = self._resolve_ldap_manager(ldap_attrs["manager_dn"], org_id)
                    if manager_user:
                        attrs.manager_id = manager_user.user_id
                        attrs.manager_email = manager_user.email
                        attrs.manager_name = manager_user.full_name
                
                if ldap_attrs.get("department"):
                    attrs.department_name = ldap_attrs["department"]
                if ldap_attrs.get("employee_id"):
                    attrs.employee_id = ldap_attrs["employee_id"]
                if ldap_attrs.get("job_title"):
                    attrs.job_title = ldap_attrs["job_title"]
                
                attrs.source = "ldap"
                attrs.custom_attributes.update(ldap_attrs.get("custom", {}))
        except Exception as e:
            logger.warning(f"LDAP lookup failed for user {user_id}: {e}, using internal data")
        
        return attrs
    
    def _query_ldap(self, identifier: str, org_id: str) -> Optional[Dict[str, Any]]:
        """Query LDAP server for user attributes."""
        # TODO: Implement actual LDAP query using LDAPConfig from org
        # This is a placeholder that should use the existing LDAPService
        logger.debug(f"LDAP query for {identifier} in org {org_id} (not yet implemented)")
        return None
    
    def _resolve_ldap_manager(self, manager_dn: str, org_id: str) -> Optional[UserAttributes]:
        """Resolve a manager from LDAP DN to an internal user."""
        # TODO: Implement LDAP DN resolution
        logger.debug(f"LDAP manager DN resolution for {manager_dn} (not yet implemented)")
        return None
    
    # ========================================================================
    # HR API DIRECTORY PROVIDER
    # ========================================================================
    
    def _get_user_hr_api(self, user_id: str, org_id: str) -> Optional[UserAttributes]:
        """
        Resolve user from external HR API.
        
        Uses the HR API configuration from Organization.hr_api_config
        to make REST API calls to the HR system.
        """
        from database.base import get_session
        from database.models.user import User
        
        # Get internal user first
        with get_session() as session:
            user = session.query(User).filter(
                User.id == user_id,
                User.org_id == org_id
            ).first()
            
            if not user:
                return None
            
            # Start with internal data
            attrs = self._user_to_attributes(user, org_id, session=session)
        
        # Try to enrich from HR API
        try:
            hr_data = self._call_hr_api("get_user", user.employee_id or user.email, org_id)
            if hr_data:
                attrs = self._merge_hr_data(attrs, hr_data, org_id)
                attrs.source = "hr_api"
        except Exception as e:
            logger.warning(f"HR API lookup failed for user {user_id}: {e}, using internal data")
        
        return attrs
    
    def _get_user_by_employee_id_hr_api(self, employee_id: str, org_id: str) -> Optional[UserAttributes]:
        """Look up user by employee ID in HR API."""
        try:
            hr_data = self._call_hr_api("get_user", employee_id, org_id)
            if hr_data:
                # Create UserAttributes from HR data
                config = self._get_hr_api_config(org_id)
                mapping = config.get("attribute_mapping", {}) if config else {}
                
                return UserAttributes(
                    user_id=employee_id,  # Will be resolved to internal ID if available
                    email=hr_data.get(mapping.get("email", "email"), ""),
                    first_name=hr_data.get(mapping.get("first_name", "firstName")),
                    last_name=hr_data.get(mapping.get("last_name", "lastName")),
                    employee_id=employee_id,
                    manager_id=hr_data.get(mapping.get("manager_id", "managerId")),
                    department_name=hr_data.get(mapping.get("department", "department")),
                    job_title=hr_data.get(mapping.get("job_title", "jobTitle")),
                    source="hr_api",
                )
        except Exception as e:
            logger.warning(f"HR API employee lookup failed for {employee_id}: {e}")
        return None
    
    def _call_hr_api(self, endpoint_key: str, identifier: str, org_id: str) -> Optional[Dict[str, Any]]:
        """
        Call the HR API with the configured credentials and endpoint.
        
        This is designed to be easily extended for different HR systems
        (SAP SuccessFactors, Workday, BambooHR, etc.)
        """
        config = self._get_hr_api_config(org_id)
        if not config:
            return None
        
        import urllib.request
        import urllib.error
        import json
        
        base_url = config.get("base_url", "").rstrip("/")
        endpoints = config.get("endpoints", {})
        auth_config = config.get("auth_config", {})
        auth_type = config.get("auth_type", "bearer")
        
        endpoint_template = endpoints.get(endpoint_key)
        if not endpoint_template:
            logger.warning(f"HR API endpoint '{endpoint_key}' not configured for org {org_id}")
            return None
        
        # Build URL
        url = f"{base_url}{endpoint_template}".replace("{employee_id}", str(identifier)).replace("{email}", str(identifier))
        
        # Build request
        req = urllib.request.Request(url)
        req.add_header("Content-Type", "application/json")
        req.add_header("Accept", "application/json")
        
        # Add auth
        if auth_type == "bearer":
            req.add_header("Authorization", f"Bearer {auth_config.get('token', '')}")
        elif auth_type == "api_key":
            header_name = auth_config.get("header_name", "X-API-Key")
            req.add_header(header_name, auth_config.get("api_key", ""))
        
        try:
            with urllib.request.urlopen(req, timeout=10) as response:
                return json.loads(response.read().decode())
        except urllib.error.URLError as e:
            logger.error(f"HR API call failed: {e}")
            return None
        except Exception as e:
            logger.error(f"HR API call error: {e}")
            return None
    
    def _merge_hr_data(self, attrs: UserAttributes, hr_data: Dict[str, Any], org_id: str) -> UserAttributes:
        """Merge HR API response data into UserAttributes."""
        config = self._get_hr_api_config(org_id)
        mapping = config.get("attribute_mapping", {}) if config else {}
        
        # Map HR fields to our standard fields (HR takes precedence for org data)
        if mapping.get("employee_id") and hr_data.get(mapping["employee_id"]):
            attrs.employee_id = str(hr_data[mapping["employee_id"]])
        if mapping.get("manager_id") and hr_data.get(mapping["manager_id"]):
            # Try to resolve HR manager ID to internal user ID
            hr_manager_id = str(hr_data[mapping["manager_id"]])
            internal_manager = self.get_user_by_employee_id(hr_manager_id, org_id)
            if internal_manager:
                attrs.manager_id = internal_manager.user_id
                attrs.manager_email = internal_manager.email
                attrs.manager_name = internal_manager.full_name
        if mapping.get("department") and hr_data.get(mapping["department"]):
            attrs.department_name = str(hr_data[mapping["department"]])
        if mapping.get("job_title") and hr_data.get(mapping["job_title"]):
            attrs.job_title = str(hr_data[mapping["job_title"]])
        
        # Store unmapped fields as custom attributes
        mapped_fields = set(mapping.values())
        for key, value in hr_data.items():
            if key not in mapped_fields and value is not None:
                attrs.custom_attributes[key] = value
        
        return attrs
    
    # ========================================================================
    # HYBRID PROVIDER
    # ========================================================================
    
    def _enrich_from_external(self, attrs: UserAttributes, org_id: str) -> UserAttributes:
        """Enrich internal user data with external source (LDAP or HR API)."""
        config = self._get_org_config(org_id)
        if not config:
            return attrs
        
        # Try LDAP first if configured
        if config.get("ldap_config_id"):
            try:
                ldap_attrs = self._query_ldap(attrs.email, org_id)
                if ldap_attrs:
                    attrs.source = "hybrid"
                    # Merge LDAP data similar to _get_user_ldap
            except Exception as e:
                logger.debug(f"LDAP enrichment failed: {e}")
        
        # Try HR API if configured
        hr_config = self._get_hr_api_config(org_id)
        if hr_config and attrs.employee_id:
            try:
                hr_data = self._call_hr_api("get_user", attrs.employee_id, org_id)
                if hr_data:
                    attrs = self._merge_hr_data(attrs, hr_data, org_id)
                    attrs.source = "hybrid"
            except Exception as e:
                logger.debug(f"HR API enrichment failed: {e}")
        
        return attrs
    
    # ========================================================================
    # HELPER METHODS
    # ========================================================================
    
    def _get_directory_source(self, org_id: str) -> str:
        """Get the configured directory source for an organization."""
        config = self._get_org_config(org_id)
        if config:
            return config.get("directory_source", "internal")
        return "internal"
    
    def _get_org_config(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Get organization configuration."""
        from database.base import get_session
        from database.models.organization import Organization
        
        with get_session() as session:
            org = session.query(Organization).filter(
                Organization.id == org_id
            ).first()
            
            if org:
                return {
                    "directory_source": org.directory_source or "internal",
                    "ldap_config_id": str(org.ldap_config_id) if org.ldap_config_id else None,
                    "hr_api_config": org.hr_api_config,
                }
        return None
    
    def _get_hr_api_config(self, org_id: str) -> Optional[Dict[str, Any]]:
        """Get HR API configuration for an organization."""
        config = self._get_org_config(org_id)
        return config.get("hr_api_config") if config else None
    
    def _get_users_by_roles(self, role_ids: List[str], org_id: str) -> List[str]:
        """Get all user IDs that have any of the specified roles."""
        from database.base import get_session
        from database.models.user import User
        
        if not role_ids:
            return []
        
        with get_session() as session:
            users = session.query(User).filter(
                User.org_id == org_id,
                User.status == "active"
            ).all()
            
            result = []
            for user in users:
                user_roles = user.role_ids or []
                if any(str(r) in [str(rid) for rid in user_roles] for r in role_ids):
                    result.append(str(user.id))
            
            return result
    
    def _get_users_by_groups(self, group_ids: List[str], org_id: str) -> List[str]:
        """Get all user IDs in any of the specified groups."""
        from database.base import get_session
        from database.models.user_group import UserGroup
        
        if not group_ids:
            return []
        
        with get_session() as session:
            groups = session.query(UserGroup).filter(
                UserGroup.id.in_(group_ids),
                UserGroup.org_id == org_id
            ).all()
            
            user_ids = set()
            for group in groups:
                for uid in (group.user_ids or []):
                    user_ids.add(str(uid))
            
            return list(user_ids)
    
    def _resolve_expression(self, expression: str, context: Dict[str, Any]) -> Any:
        """
        Resolve a template expression like {{ trigger_input.manager_id }}.
        
        Supports:
        - {{ trigger_input.field }}
        - {{ variables.field }}
        - {{ context.user_id }}
        - {{ state.field }}
        """
        import re
        
        # Extract the path from {{ ... }}
        match = re.match(r'\{\{\s*(.+?)\s*\}\}', expression.strip())
        if not match:
            return expression  # Return as-is if not a template
        
        path = match.group(1)
        parts = path.split(".")
        
        # Navigate the context
        current = context
        for part in parts:
            if isinstance(current, dict) and part in current:
                current = current[part]
            else:
                logger.warning(f"Could not resolve expression path '{path}' at '{part}'")
                return None
        
        return current
