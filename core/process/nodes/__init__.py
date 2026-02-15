"""
Process Node Executors
Modular executors for each node type

Each node type has its own executor class that:
- Validates configuration
- Executes the node logic
- Returns standardized results

Design Principles:
- Single Responsibility: Each executor handles one node type
- Dependency Injection: Tools and services passed in
- Testable: Each executor can be tested in isolation
- Extensible: Easy to add new node types
"""

from .base import BaseNodeExecutor, NodeExecutorRegistry
from .flow import StartNodeExecutor, EndNodeExecutor
from .logic import (
    ConditionNodeExecutor,
    SwitchNodeExecutor,
    LoopNodeExecutor,
    ParallelNodeExecutor,
    SubProcessNodeExecutor,
)
from .task import (
    AITaskNodeExecutor,
    ToolCallNodeExecutor,
    ScriptNodeExecutor,
)
from .integration import (
    HTTPRequestNodeExecutor,
    DatabaseQueryNodeExecutor,
)
from .human import (
    ApprovalNodeExecutor,
    HumanTaskNodeExecutor,
    NotificationNodeExecutor,
)
from .data import (
    TransformNodeExecutor,
    ValidateNodeExecutor,
    FilterNodeExecutor,
    MapNodeExecutor,
)
from .timing import (
    DelayNodeExecutor,
)

__all__ = [
    # Base
    'BaseNodeExecutor',
    'NodeExecutorRegistry',
    
    # Flow
    'StartNodeExecutor',
    'EndNodeExecutor',
    
    # Logic
    'ConditionNodeExecutor',
    'SwitchNodeExecutor',
    'LoopNodeExecutor',
    'ParallelNodeExecutor',
    'SubProcessNodeExecutor',
    
    # Task
    'AITaskNodeExecutor',
    'ToolCallNodeExecutor',
    'ScriptNodeExecutor',
    
    # Integration
    'HTTPRequestNodeExecutor',
    'DatabaseQueryNodeExecutor',
    
    # Human
    'ApprovalNodeExecutor',
    'HumanTaskNodeExecutor',
    'NotificationNodeExecutor',
    
    # Data
    'TransformNodeExecutor',
    'ValidateNodeExecutor',
    'FilterNodeExecutor',
    'MapNodeExecutor',
    
    # Timing
    'DelayNodeExecutor',
]
