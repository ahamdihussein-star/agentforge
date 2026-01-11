"""
Database Services - Business Logic Layer
Implements dual-write pattern for gradual migration from JSON to Database
"""
from .user_service import UserService

__all__ = ['UserService']
