"""
AgentForge Policy Engine - Complete Enterprise Implementation
=============================================================
Evaluates access policies using:
- Role-Based Access Control (RBAC)
- Attribute-Based Access Control (ABAC)
- Resource-specific permissions
"""

import re
from datetime import datetime
from typing import Dict, List, Optional, Any, Set, Tuple, TYPE_CHECKING

from .models import (
    User, UserStatus, Role, Policy, PolicyRule, PolicyCondition,
    ResourceType, Permission, ToolPermission, KnowledgeBasePermission, DatabasePermission
)

if TYPE_CHECKING:
    from .state import SecurityState


class PolicyEngine:
    """
    Central policy evaluation engine.
    Combines RBAC (roles) with ABAC (attribute-based policies) for fine-grained access control.
    """
    
    def __init__(self, security_state: 'SecurityState'):
        self.state = security_state
    
    def evaluate_access(
        self,
        user: User,
        action: str,
        resource_type: ResourceType,
        resource_id: Optional[str] = None,
        context: Dict[str, Any] = None
    ) -> Tuple[bool, Optional[str]]:
        """
        Evaluate if a user can perform an action on a resource.
        
        Args:
            user: The user requesting access
            action: The action being performed (e.g., "view", "edit", "delete", "execute")
            resource_type: Type of resource being accessed
            resource_id: Optional specific resource ID
            context: Additional context (e.g., request info, time)
        
        Returns:
            Tuple of (allowed: bool, reason: Optional[str])
        """
        context = context or {}
        
        # 1. Check user status first
        if user.status != UserStatus.ACTIVE:
            return False, f"User account is {user.status.value}"
        
        # 2. Super admin bypass - has all permissions
        if Permission.SYSTEM_ADMIN.value in self._get_user_permissions(user):
            return True, None
        
        # 3. Get all user permissions from roles, groups, and direct assignments
        user_permissions = self._get_user_permissions(user)
        
        # 4. Check basic permission requirement
        required_permission = f"{resource_type.value}:{action}"
        has_base_permission = required_permission in user_permissions
        
        if not has_base_permission:
            # Check for wildcard permissions (e.g., "agents:*" allows "agents:view")
            category = resource_type.value
            wildcard_perm = f"{category}:*"
            if wildcard_perm not in user_permissions:
                return False, f"Missing permission: {required_permission}"
        
        # 5. Get and evaluate ABAC policies
        policies = self._get_applicable_policies(user, action, resource_type, resource_id)
        
        # Sort by priority (lower = higher priority)
        policies = sorted(policies, key=lambda p: p.priority)
        
        # Evaluate policies - explicit deny takes precedence
        for policy in policies:
            if not policy.is_active:
                continue
            
            matches = self._evaluate_policy(policy, user, context)
            if matches:
                if policy.effect == "deny":
                    return False, f"Denied by policy: {policy.name}"
                # Allow policies just confirm access, continue checking for denies
        
        # 6. Check resource-specific permissions if resource_id provided
        if resource_id:
            resource_allowed, resource_reason = self._check_resource_permission(
                user, action, resource_type, resource_id, context
            )
            if not resource_allowed:
                return False, resource_reason
        
        # 7. All checks passed
        return True, None
    
    def _get_user_permissions(self, user: User) -> Set[str]:
        """
        Get all permissions for a user from:
        - Direct permissions assigned to user
        - Permissions from assigned roles
        - Permissions from role inheritance (parent roles)
        - Permissions from group memberships
        """
        permissions = set(user.direct_permissions)
        
        # Add permissions from directly assigned roles
        for role_id in user.role_ids:
            role = self.state.roles.get(role_id)
            if role:
                permissions.update(role.permissions)
                
                # Add inherited permissions from parent roles
                parent_id = role.parent_id
                visited = set()  # Prevent infinite loops
                while parent_id and parent_id not in visited:
                    visited.add(parent_id)
                    parent_role = self.state.roles.get(parent_id)
                    if parent_role:
                        permissions.update(parent_role.permissions)
                        parent_id = parent_role.parent_id
                    else:
                        break
        
        # Add permissions from group memberships
        for group_id in user.group_ids:
            group = self.state.groups.get(group_id)
            if group:
                # Groups can have roles assigned
                for role_id in group.role_ids:
                    role = self.state.roles.get(role_id)
                    if role:
                        permissions.update(role.permissions)
        
        return permissions
    
    def _get_applicable_policies(
        self,
        user: User,
        action: str,
        resource_type: ResourceType,
        resource_id: Optional[str]
    ) -> List[Policy]:
        """Get all policies that might apply to this access request"""
        applicable = []
        
        for policy in self.state.policies.values():
            # Must be same org
            if policy.org_id != user.org_id:
                continue
            
            # Check resource type matches
            if policy.resource_type != resource_type:
                continue
            
            # Check action matches (empty = all actions)
            if policy.actions and action not in policy.actions:
                continue
            
            # Check resource ID matches (if policy specifies resources)
            if policy.resource_ids and resource_id:
                if resource_id not in policy.resource_ids:
                    continue
            
            # Check if policy applies to this user
            applies_to_user = self._policy_applies_to_user(policy, user)
            
            if applies_to_user:
                applicable.append(policy)
        
        return applicable
    
    def _policy_applies_to_user(self, policy: Policy, user: User) -> bool:
        """Check if a policy applies to a specific user"""
        # If no specific targets, policy applies to everyone (uses conditions)
        if not policy.user_ids and not policy.role_ids and not policy.group_ids:
            return True
        
        # Check direct user assignment
        if user.id in policy.user_ids:
            return True
        
        # Check role assignment
        if any(role_id in policy.role_ids for role_id in user.role_ids):
            return True
        
        # Check group assignment
        if any(group_id in policy.group_ids for group_id in user.group_ids):
            return True
        
        return False
    
    def _evaluate_policy(
        self,
        policy: Policy,
        user: User,
        context: Dict[str, Any]
    ) -> bool:
        """Evaluate if a policy's conditions are met"""
        # If no rules, policy always applies (to its targets)
        if not policy.rules:
            return True
        
        # Evaluate each rule - any matching rule is enough
        for rule in policy.rules:
            if self._evaluate_rule(rule, user, context):
                return True
        
        return False
    
    def _evaluate_rule(
        self,
        rule: PolicyRule,
        user: User,
        context: Dict[str, Any]
    ) -> bool:
        """Evaluate a single policy rule"""
        results = []
        
        for condition in rule.conditions:
            result = self._evaluate_condition(condition, user, context)
            results.append(result)
        
        if rule.logic.upper() == "AND":
            return all(results) if results else True
        else:  # OR
            return any(results) if results else True
    
    def _evaluate_condition(
        self,
        condition: PolicyCondition,
        user: User,
        context: Dict[str, Any]
    ) -> bool:
        """Evaluate a single condition"""
        # Get the attribute value
        value = self._get_attribute_value(condition.attribute, user, context)
        target = condition.value
        
        # Handle None values
        if value is None:
            return condition.operator in ["eq", "is"] and target is None
        
        # Compare based on operator
        op = condition.operator.lower()
        
        try:
            if op == "eq" or op == "equals" or op == "==":
                return value == target
            elif op == "ne" or op == "not_equals" or op == "!=":
                return value != target
            elif op == "in":
                return value in target if isinstance(target, (list, set, tuple)) else str(value) in str(target)
            elif op == "not_in":
                return value not in target if isinstance(target, (list, set, tuple)) else str(value) not in str(target)
            elif op == "gt" or op == ">":
                return value > target
            elif op == "lt" or op == "<":
                return value < target
            elif op == "gte" or op == ">=":
                return value >= target
            elif op == "lte" or op == "<=":
                return value <= target
            elif op == "contains":
                return str(target).lower() in str(value).lower()
            elif op == "not_contains":
                return str(target).lower() not in str(value).lower()
            elif op == "starts_with":
                return str(value).lower().startswith(str(target).lower())
            elif op == "ends_with":
                return str(value).lower().endswith(str(target).lower())
            elif op == "regex" or op == "matches":
                return bool(re.match(str(target), str(value), re.IGNORECASE))
            elif op == "is_empty":
                return not value or (isinstance(value, (list, dict, str)) and len(value) == 0)
            elif op == "is_not_empty":
                return value and (not isinstance(value, (list, dict, str)) or len(value) > 0)
            elif op == "between":
                if isinstance(target, (list, tuple)) and len(target) >= 2:
                    return target[0] <= value <= target[1]
        except (TypeError, ValueError):
            pass
        
        return False
    
    def _get_attribute_value(
        self,
        attribute: str,
        user: User,
        context: Dict[str, Any]
    ) -> Any:
        """Get an attribute value from user, context, or environment"""
        parts = attribute.split('.')
        
        if not parts:
            return None
        
        root = parts[0].lower()
        path = parts[1:] if len(parts) > 1 else []
        
        if root == "user":
            return self._get_nested_value(user, path)
        
        elif root == "profile":
            return self._get_nested_value(user.profile, path)
        
        elif root == "context":
            return self._get_nested_value(context, path)
        
        elif root == "request":
            return self._get_nested_value(context.get('request', {}), path)
        
        elif root == "resource":
            return self._get_nested_value(context.get('resource', {}), path)
        
        elif root == "time" or root == "datetime":
            return self._get_time_value(path)
        
        elif root == "env" or root == "environment":
            import os
            return os.environ.get('.'.join(path), None) if path else None
        
        # Try direct context lookup
        return context.get(attribute)
    
    def _get_nested_value(self, obj: Any, path: List[str]) -> Any:
        """Get a nested value from an object or dict"""
        current = obj
        
        for part in path:
            if current is None:
                return None
            
            if hasattr(current, part):
                current = getattr(current, part)
            elif isinstance(current, dict):
                current = current.get(part)
            else:
                return None
        
        return current
    
    def _get_time_value(self, path: List[str]) -> Any:
        """Get time-based values for conditions"""
        now = datetime.utcnow()
        
        if not path:
            return now.isoformat()
        
        attr = path[0].lower()
        
        if attr == "hour":
            return now.hour
        elif attr == "minute":
            return now.minute
        elif attr == "day" or attr == "weekday":
            return now.weekday()  # 0=Monday, 6=Sunday
        elif attr == "day_of_month":
            return now.day
        elif attr == "month":
            return now.month
        elif attr == "year":
            return now.year
        elif attr == "date":
            return now.date().isoformat()
        elif attr == "time":
            return now.time().isoformat()
        elif attr == "timestamp":
            return now.timestamp()
        elif attr == "is_weekend":
            return now.weekday() >= 5
        elif attr == "is_business_hours":
            return 9 <= now.hour < 17 and now.weekday() < 5
        
        return None
    
    def _check_resource_permission(
        self,
        user: User,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Check resource-specific permissions"""
        
        if resource_type == ResourceType.TOOL:
            return self._check_tool_permission(user, action, resource_id, context)
        elif resource_type == ResourceType.KNOWLEDGE_BASE:
            return self._check_kb_permission(user, action, resource_id, context)
        elif resource_type == ResourceType.DATABASE:
            return self._check_db_permission(user, action, resource_id, context)
        
        # No specific permission rules for this resource type
        return True, None
    
    def _check_tool_permission(
        self,
        user: User,
        action: str,
        tool_id: str,
        context: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Check tool-specific permission"""
        
        # Find applicable tool permission
        applicable_perms = [
            p for p in self.state.tool_permissions.values()
            if p.tool_id == tool_id and p.org_id == user.org_id
        ]
        
        if not applicable_perms:
            # No specific permission = use base RBAC
            return True, None
        
        for perm in applicable_perms:
            # Check if user is in the permission's scope
            user_in_scope = (
                user.id in perm.user_ids or
                any(role_id in perm.role_ids for role_id in user.role_ids) or
                any(group_id in perm.group_ids for group_id in user.group_ids)
            )
            
            if not user_in_scope:
                continue
            
            # Check specific action permissions
            if action == "view" and not perm.can_view:
                return False, "View permission denied for this tool"
            if action == "execute" and not perm.can_execute:
                return False, "Execute permission denied for this tool"
            if action == "edit" and not perm.can_edit:
                return False, "Edit permission denied for this tool"
            if action == "delete" and not perm.can_delete:
                return False, "Delete permission denied for this tool"
            
            # Check denied actions
            if action in perm.denied_actions:
                return False, f"Action '{action}' is explicitly denied"
            
            # Check allowed actions (if specified, action must be in list)
            if perm.allowed_actions and action not in perm.allowed_actions:
                return False, f"Action '{action}' is not in allowed actions"
            
            # Check time restrictions
            if perm.allowed_hours_start is not None and perm.allowed_hours_end is not None:
                current_hour = datetime.utcnow().hour
                if not (perm.allowed_hours_start <= current_hour <= perm.allowed_hours_end):
                    return False, f"Tool access only allowed between {perm.allowed_hours_start}:00 and {perm.allowed_hours_end}:00 UTC"
            
            # Check day restrictions
            if perm.allowed_days:
                current_day = datetime.utcnow().weekday()
                if current_day not in perm.allowed_days:
                    return False, "Tool access not allowed on this day"
            
            # Check IP restrictions
            request_ip = context.get('ip_address') or context.get('request', {}).get('ip')
            if request_ip:
                if perm.denied_ips and request_ip in perm.denied_ips:
                    return False, "Access denied from this IP address"
                if perm.allowed_ips and request_ip not in perm.allowed_ips:
                    return False, "Access not allowed from this IP address"
            
            # Permission found and all checks passed
            return True, None
        
        # No applicable permission found for user
        return False, "No permission granted for this tool"
    
    def _check_kb_permission(
        self,
        user: User,
        action: str,
        kb_id: str,
        context: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Check knowledge base permission"""
        
        applicable_perms = [
            p for p in self.state.kb_permissions.values()
            if p.kb_id == kb_id and p.org_id == user.org_id
        ]
        
        if not applicable_perms:
            return True, None
        
        for perm in applicable_perms:
            user_in_scope = (
                user.id in perm.user_ids or
                any(role_id in perm.role_ids for role_id in user.role_ids) or
                any(group_id in perm.group_ids for group_id in user.group_ids)
            )
            
            if not user_in_scope:
                continue
            
            # Check action permissions
            if action == "search" and not perm.can_search:
                return False, "Search permission denied"
            if action == "view" and not perm.can_view_full_content:
                return False, "View permission denied"
            if action == "download" and not perm.can_download:
                return False, "Download permission denied"
            if action == "upload" and not perm.can_upload:
                return False, "Upload permission denied"
            if action == "edit" and not perm.can_edit:
                return False, "Edit permission denied"
            if action == "delete" and not perm.can_delete:
                return False, "Delete permission denied"
            
            # Check document-level restrictions
            document_id = context.get('document_id')
            if document_id:
                if perm.denied_document_ids and document_id in perm.denied_document_ids:
                    return False, "Access to this document is denied"
                if perm.allowed_document_ids and document_id not in perm.allowed_document_ids:
                    return False, "Access to this document is not allowed"
            
            # Check category restrictions
            category = context.get('category')
            if category:
                if perm.denied_categories and category in perm.denied_categories:
                    return False, "Access to this category is denied"
                if perm.allowed_categories and category not in perm.allowed_categories:
                    return False, "Access to this category is not allowed"
            
            # Check classification level
            classification = context.get('classification')
            if classification:
                from .models import DataClassification
                classification_order = [
                    DataClassification.PUBLIC,
                    DataClassification.INTERNAL,
                    DataClassification.CONFIDENTIAL,
                    DataClassification.RESTRICTED
                ]
                try:
                    doc_level = classification_order.index(DataClassification(classification))
                    max_level = classification_order.index(perm.max_classification)
                    if doc_level > max_level:
                        return False, f"Document classification ({classification}) exceeds your clearance level"
                except (ValueError, KeyError):
                    pass
            
            return True, None
        
        return False, "No permission granted for this knowledge base"
    
    def _check_db_permission(
        self,
        user: User,
        action: str,
        tool_id: str,
        context: Dict[str, Any]
    ) -> Tuple[bool, Optional[str]]:
        """Check database permission"""
        
        applicable_perms = [
            p for p in self.state.db_permissions.values()
            if p.tool_id == tool_id and p.org_id == user.org_id
        ]
        
        if not applicable_perms:
            return True, None
        
        for perm in applicable_perms:
            user_in_scope = (
                user.id in perm.user_ids or
                any(role_id in perm.role_ids for role_id in user.role_ids) or
                any(group_id in perm.group_ids for group_id in user.group_ids)
            )
            
            if not user_in_scope:
                continue
            
            # Check operation permissions
            if action == "select" and not perm.can_select:
                return False, "SELECT permission denied"
            if action == "insert" and not perm.can_insert:
                return False, "INSERT permission denied"
            if action == "update" and not perm.can_update:
                return False, "UPDATE permission denied"
            if action == "delete" and not perm.can_delete:
                return False, "DELETE permission denied"
            if action == "execute" and not perm.can_execute_procedures:
                return False, "Stored procedure execution denied"
            
            # Check table-level restrictions
            table_name = context.get('table')
            if table_name:
                if perm.denied_tables and table_name in perm.denied_tables:
                    return False, f"Access to table '{table_name}' is denied"
                if perm.allowed_tables and table_name not in perm.allowed_tables:
                    return False, f"Access to table '{table_name}' is not allowed"
            
            return True, None
        
        return False, "No permission granted for this database"
    
    def has_permission(self, user: User, permission: str) -> bool:
        """Quick check if user has a specific permission string"""
        permissions = self._get_user_permissions(user)
        return permission in permissions or Permission.SYSTEM_ADMIN.value in permissions
    
    def get_allowed_resources(
        self,
        user: User,
        resource_type: ResourceType,
        action: str = "view"
    ) -> List[str]:
        """Get list of resource IDs the user can access"""
        # This would query actual resources and filter
        # Implementation depends on how resources are stored
        allowed = []
        
        if resource_type == ResourceType.TOOL:
            for perm in self.state.tool_permissions.values():
                if perm.org_id == user.org_id:
                    user_in_scope = (
                        user.id in perm.user_ids or
                        any(r in perm.role_ids for r in user.role_ids) or
                        any(g in perm.group_ids for g in user.group_ids)
                    )
                    if user_in_scope and perm.can_view:
                        allowed.append(perm.tool_id)
        
        return allowed
    
    def get_effective_permissions(self, user: User) -> Dict[str, Any]:
        """Get a detailed breakdown of user's effective permissions"""
        permissions = self._get_user_permissions(user)
        
        # Group by category
        by_category = {}
        for perm in permissions:
            if ':' in perm:
                category, action = perm.split(':', 1)
            else:
                category, action = 'other', perm
            
            if category not in by_category:
                by_category[category] = []
            by_category[category].append(action)
        
        # Get role details
        roles = []
        for role_id in user.role_ids:
            role = self.state.roles.get(role_id)
            if role:
                roles.append({
                    "id": role.id,
                    "name": role.name,
                    "permissions_count": len(role.permissions)
                })
        
        return {
            "user_id": user.id,
            "permissions": list(permissions),
            "permissions_count": len(permissions),
            "by_category": by_category,
            "roles": roles,
            "direct_permissions": user.direct_permissions,
            "is_super_admin": Permission.SYSTEM_ADMIN.value in permissions
        }
