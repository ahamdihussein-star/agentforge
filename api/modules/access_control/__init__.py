"""
Access Control Module
Enterprise-grade 3-level access control for AI agents

Levels:
1. Agent Access - Who can use the agent
2. Task Access - Which tasks users can use
3. Tool Access - Which tools the agent can use for users

This module is designed as a self-contained unit that can be
extracted to a microservice when needed.
"""

from .router import router
from .service import AccessControlService
from .schemas import (
    AgentAccessCreate,
    AgentAccessUpdate,
    AgentAccessResponse,
    TaskAccessConfig,
    ToolAccessConfig,
    AccessCheckResult,
)

__all__ = [
    "router",
    "AccessControlService",
    "AgentAccessCreate",
    "AgentAccessUpdate", 
    "AgentAccessResponse",
    "TaskAccessConfig",
    "ToolAccessConfig",
    "AccessCheckResult",
]

