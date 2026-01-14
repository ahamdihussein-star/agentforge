"""
Feature Flags System
Safe way to enable/disable new features without breaking existing code
"""
import os
from typing import Dict, Any

class FeatureFlags:
    """
    Feature flags for gradual migration and safe rollouts.
    
    Usage:
        if FeatureFlags.NEW_AGENT_MODULE:
            use_new_code()
        else:
            use_old_code()
    """
    
    # API Modularization
    NEW_AGENT_MODULE = os.getenv("FEATURE_NEW_AGENT_MODULE", "false").lower() == "true"
    NEW_TOOLS_MODULE = os.getenv("FEATURE_NEW_TOOLS_MODULE", "false").lower() == "true"
    NEW_KNOWLEDGE_MODULE = os.getenv("FEATURE_NEW_KNOWLEDGE_MODULE", "false").lower() == "true"
    NEW_SETTINGS_MODULE = os.getenv("FEATURE_NEW_SETTINGS_MODULE", "false").lower() == "true"
    
    # Frontend Modularization
    NEW_FRONTEND_COMPONENTS = os.getenv("FEATURE_NEW_FRONTEND_COMPONENTS", "false").lower() == "true"
    
    # Service Layer
    NEW_SERVICE_LAYER = os.getenv("FEATURE_NEW_SERVICE_LAYER", "false").lower() == "true"
    
    # Gradual Migration
    USE_MODULAR_API = os.getenv("FEATURE_USE_MODULAR_API", "false").lower() == "true"
    
    @classmethod
    def get_all_flags(cls) -> Dict[str, bool]:
        """Get all feature flags as dictionary"""
        return {
            "new_agent_module": cls.NEW_AGENT_MODULE,
            "new_tools_module": cls.NEW_TOOLS_MODULE,
            "new_knowledge_module": cls.NEW_KNOWLEDGE_MODULE,
            "new_settings_module": cls.NEW_SETTINGS_MODULE,
            "new_frontend_components": cls.NEW_FRONTEND_COMPONENTS,
            "new_service_layer": cls.NEW_SERVICE_LAYER,
            "use_modular_api": cls.USE_MODULAR_API,
        }
    
    @classmethod
    def is_enabled(cls, flag_name: str) -> bool:
        """Check if a feature flag is enabled"""
        return getattr(cls, flag_name.upper(), False)

