"""
Identity & User Directory Module
=================================
Provides a unified interface for resolving user attributes regardless of
the identity source (Internal DB, LDAP/AD, HR API).

This is the core abstraction that enables:
- Process automation (approvals, notifications) to resolve managers/departments
- Dynamic user attribute resolution for process nodes
- Built-in Org Chart management
- Enterprise identity provider integration

Architecture:
    UserDirectoryService (unified facade)
        ├── InternalDirectoryProvider (built-in org chart)
        ├── LDAPDirectoryProvider (LDAP/Active Directory)
        └── HRAPIDirectoryProvider (external HR system API)
"""

from .service import UserDirectoryService, UserAttributes

__all__ = ['UserDirectoryService', 'UserAttributes']
