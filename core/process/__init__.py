"""
AgentForge Process Engine
Enterprise-grade workflow/integration process execution

This module provides:
- ProcessEngine: Core execution engine for process-type agents
- Node Executors: Modular executors for each node type
- State Manager: Process state and variable management
- Schemas: Process definition and validation schemas
- Wizard: LLM-powered process generation

Architecture:
- Modular node executors (each node type has its own executor)
- Database-agnostic design
- Full audit trail and checkpoint support
- Integration with platform tools
- LLM-based wizard for goal-to-process generation
"""

from .schemas import (
    ProcessDefinition,
    ProcessNode,
    ProcessEdge,
    ProcessTrigger,
    ProcessVariable,
    NodeConfig,
)

from .state import ProcessState, ProcessContext

from .engine import ProcessEngine

from .result import (
    NodeResult,
    ProcessResult,
    ExecutionError,
)

from .wizard import ProcessWizard

__all__ = [
    # Schemas
    'ProcessDefinition',
    'ProcessNode',
    'ProcessEdge',
    'ProcessTrigger',
    'ProcessVariable',
    'NodeConfig',
    
    # State
    'ProcessState',
    'ProcessContext',
    
    # Engine
    'ProcessEngine',
    
    # Results
    'NodeResult',
    'ProcessResult',
    'ExecutionError',
    
    # Wizard
    'ProcessWizard',
]
