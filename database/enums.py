"""
Centralized Enum Definitions for AgentForge
Enterprise-grade enum management with validation and mapping
"""
from enum import Enum
from typing import Dict, List, Optional


class ToolType(str, Enum):
    """
    Tool Type Enumeration
    
    Supported tool categories for external integrations.
    This is the single source of truth for tool types.
    """
    # Core Integration Types
    API = "api"
    DATABASE = "database"
    
    # Knowledge & Search
    RAG = "rag"
    WEB_SEARCH = "web_search"
    WEB_SCRAPING = "web_scraping"
    WEBSITE = "website"  # Website monitoring/scraping
    
    # Communication
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    
    # Productivity
    SPREADSHEET = "spreadsheet"
    CALENDAR = "calendar"
    
    # Business
    CRM = "crm"
    
    # Extensibility
    CUSTOM = "custom"
    
    @classmethod
    def values(cls) -> List[str]:
        """Get all valid enum values"""
        return [e.value for e in cls]
    
    @classmethod
    def normalize(cls, value: str) -> Optional['ToolType']:
        """
        Normalize and validate a tool type value.
        Returns None if invalid.
        """
        if not value:
            return None
        
        # Normalize to lowercase
        normalized = value.lower().strip()
        
        # Direct match
        try:
            return cls(normalized)
        except ValueError:
            pass
        
        # Try legacy mapping
        mapped = TOOL_TYPE_LEGACY_MAPPING.get(normalized)
        if mapped:
            return mapped
        
        return None
    
    @classmethod
    def from_legacy(cls, legacy_value: str) -> 'ToolType':
        """
        Convert legacy tool type value to current enum.
        Falls back to CUSTOM if unknown.
        """
        normalized = cls.normalize(legacy_value)
        if normalized:
            return normalized
        
        # Unknown type - use CUSTOM
        return cls.CUSTOM


class AgentStatus(str, Enum):
    """Agent lifecycle status"""
    DRAFT = "draft"
    PUBLISHED = "published"  # Agent is live and available
    ACTIVE = "active"  # Alias for published (backwards compatibility)
    PAUSED = "paused"
    ARCHIVED = "archived"
    DELETED = "deleted"  # Soft delete
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class ConversationStatus(str, Enum):
    """Conversation lifecycle status"""
    ACTIVE = "active"
    ARCHIVED = "archived"
    DELETED = "deleted"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class KBStatus(str, Enum):
    """Knowledge Base status"""
    DRAFT = "draft"
    INDEXING = "indexing"
    ACTIVE = "active"
    ERROR = "error"
    ARCHIVED = "archived"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


class DocumentStatus(str, Enum):
    """Document processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    ERROR = "error"
    
    @classmethod
    def values(cls) -> List[str]:
        return [e.value for e in cls]


# =============================================================================
# LEGACY VALUE MAPPINGS
# =============================================================================

TOOL_TYPE_LEGACY_MAPPING: Dict[str, ToolType] = {
    # Legacy names → Current enum
    "web": ToolType.WEB_SCRAPING,
    "scraper": ToolType.WEB_SCRAPING,
    "scraping": ToolType.WEB_SCRAPING,
    "search": ToolType.WEB_SEARCH,
    "google": ToolType.WEB_SEARCH,
    "bing": ToolType.WEB_SEARCH,
    "site": ToolType.WEBSITE,
    "webpage": ToolType.WEBSITE,
    "http": ToolType.API,
    "rest": ToolType.API,
    "rest_api": ToolType.API,
    "graphql": ToolType.API,
    "sql": ToolType.DATABASE,
    "postgres": ToolType.DATABASE,
    "mysql": ToolType.DATABASE,
    "mongodb": ToolType.DATABASE,
    "vector": ToolType.RAG,
    "embedding": ToolType.RAG,
    "gmail": ToolType.EMAIL,
    "smtp": ToolType.EMAIL,
    "mail": ToolType.EMAIL,
    "sheets": ToolType.SPREADSHEET,
    "excel": ToolType.SPREADSHEET,
    "gcal": ToolType.CALENDAR,
    "salesforce": ToolType.CRM,
    "hubspot": ToolType.CRM,
}


# =============================================================================
# VALIDATION UTILITIES
# =============================================================================

def validate_enum_value(enum_class: type, value: str, field_name: str) -> None:
    """
    Validate that a value is valid for given enum.
    Raises ValueError if invalid.
    
    Args:
        enum_class: The enum class to validate against
        value: The value to validate
        field_name: Name of field (for error message)
    
    Raises:
        ValueError: If value is not valid for enum
    """
    if not value:
        raise ValueError(f"{field_name} cannot be empty")
    
    valid_values = [e.value for e in enum_class]
    if value not in valid_values:
        raise ValueError(
            f"Invalid {field_name}: '{value}'. "
            f"Valid values: {', '.join(valid_values)}"
        )


def get_all_enum_values(enum_class: type) -> List[str]:
    """Get all valid values for an enum class"""
    return [e.value for e in enum_class]


# =============================================================================
# EXPORTS
# =============================================================================

__all__ = [
    'ToolType',
    'AgentStatus',
    'ConversationStatus',
    'KBStatus',
    'DocumentStatus',
    'TOOL_TYPE_LEGACY_MAPPING',
    'validate_enum_value',
    'get_all_enum_values',
]

