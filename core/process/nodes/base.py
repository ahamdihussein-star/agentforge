"""
Base Node Executor
Abstract base class and registry for all node executors

This module defines:
- BaseNodeExecutor: Abstract class all executors inherit from
- NodeExecutorRegistry: Registry for executor lookup by node type
- ExecutorContext: Runtime context passed to executors
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Type, TYPE_CHECKING
from datetime import datetime
import time
import logging
import traceback

from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ExecutionStatus, ErrorCategory

if TYPE_CHECKING:
    from ...tools.base import BaseTool
    from ...llm.base import BaseLLM

logger = logging.getLogger(__name__)


class ExecutorDependencies:
    """
    Dependencies injected into node executors
    
    Contains all external services a node might need.
    """
    
    def __init__(
        self,
        llm: Optional['BaseLLM'] = None,
        tools: Optional[Dict[str, 'BaseTool']] = None,
        http_client: Optional[Any] = None,
        db_connections: Optional[Dict[str, Any]] = None,
        notification_service: Optional[Any] = None,
        approval_service: Optional[Any] = None,
        user_directory: Optional[Any] = None,
    ):
        """
        Initialize dependencies
        
        Args:
            llm: LLM instance for AI tasks
            tools: Map of tool_id -> BaseTool instances
            http_client: HTTP client for API calls
            db_connections: Map of connection_id -> database connections
            notification_service: Service for sending notifications
            approval_service: Service for handling approvals
            user_directory: User Directory Service for identity resolution
        """
        self.llm = llm
        self.tools = tools or {}
        self.http_client = http_client
        self.db_connections = db_connections or {}
        self.notification_service = notification_service
        self.approval_service = approval_service
        self.user_directory = user_directory
    
    def get_tool(self, tool_id: str) -> Optional['BaseTool']:
        """Get a tool by ID"""
        return self.tools.get(tool_id)
    
    def get_db_connection(self, connection_id: str) -> Optional[Any]:
        """Get a database connection by ID"""
        return self.db_connections.get(connection_id)


class BaseNodeExecutor(ABC):
    """
    Abstract base class for all node executors
    
    Each node type has a corresponding executor that:
    1. Validates the node configuration
    2. Executes the node logic
    3. Returns a standardized NodeResult
    
    Executors are stateless - all state is in ProcessState.
    """
    
    # Node type this executor handles
    node_type: NodeType = None
    
    # Display name for logging
    display_name: str = "Node"
    
    def __init__(self, dependencies: ExecutorDependencies):
        """
        Initialize executor with dependencies
        
        Args:
            dependencies: Injected dependencies
        """
        self.deps = dependencies
    
    @abstractmethod
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """
        Execute the node
        
        Args:
            node: Node definition
            state: Current process state
            context: Execution context
            
        Returns:
            NodeResult with outcome
        """
        pass
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """
        Validate node configuration before execution
        
        Override in subclasses for specific validation.
        
        Args:
            node: Node to validate
            
        Returns:
            ExecutionError if invalid, None if valid
        """
        if not node.id:
            return ExecutionError.validation_error("Node ID is required")
        if not node.type:
            return ExecutionError.validation_error("Node type is required")
        return None
    
    async def execute_with_retry(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """
        Execute node with retry logic
        
        Wraps execute() with retry handling based on node config.
        """
        retry_config = node.config.retry
        max_attempts = retry_config.max_attempts if retry_config.enabled else 1
        
        last_error = None
        
        for attempt in range(max_attempts):
            try:
                start_time = time.time()
                
                # Execute the node
                result = await self.execute(node, state, context)
                
                # Add duration if not set
                if result.duration_ms == 0:
                    result.duration_ms = (time.time() - start_time) * 1000
                
                # If success or non-retryable, return
                if result.is_success or result.is_waiting:
                    return result
                
                if result.error and not result.error.is_retryable:
                    return result
                
                last_error = result.error
                
            except Exception as e:
                logger.error(f"Node {node.id} execution error: {e}")
                last_error = ExecutionError.internal_error(
                    message=str(e),
                    stack_trace=traceback.format_exc()
                )
            
            # Retry delay
            if attempt < max_attempts - 1:
                delay = retry_config.delay_seconds * (
                    retry_config.backoff_multiplier ** attempt
                )
                logger.info(f"Retrying node {node.id} in {delay}s (attempt {attempt + 2}/{max_attempts})")
                await self._sleep(delay)
        
        # All retries exhausted
        return NodeResult.failure(
            error=last_error or ExecutionError.internal_error("Max retries exceeded"),
            logs=[f"Failed after {max_attempts} attempts"]
        )
    
    async def execute_with_timeout(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """
        Execute node with timeout handling
        """
        import asyncio
        
        timeout_config = node.config.timeout
        
        if not timeout_config.enabled:
            return await self.execute_with_retry(node, state, context)
        
        try:
            result = await asyncio.wait_for(
                self.execute_with_retry(node, state, context),
                timeout=timeout_config.seconds
            )
            return result
            
        except asyncio.TimeoutError:
            error = ExecutionError.timeout_error(
                message=f"Node {node.id} timed out after {timeout_config.seconds}s",
                timeout_seconds=timeout_config.seconds
            )
            
            if timeout_config.action == "skip":
                return NodeResult.skipped(reason="Timeout - skipped")
            elif timeout_config.action == "retry":
                error.is_retryable = True
            
            return NodeResult.failure(error=error)
    
    async def _sleep(self, seconds: float):
        """Async sleep helper"""
        import asyncio
        await asyncio.sleep(seconds)
    
    def log(self, message: str, level: str = "info"):
        """Log a message"""
        log_func = getattr(logger, level, logger.info)
        log_func(f"[{self.display_name}] {message}")
    
    def get_config_value(
        self, 
        node: ProcessNode, 
        key: str, 
        default: Any = None
    ) -> Any:
        """
        Get a value from node's type_config
        
        Args:
            node: The node
            key: Config key
            default: Default value if not found
        """
        return node.config.type_config.get(key, default)
    
    def interpolate(self, value: Any, state: ProcessState) -> Any:
        """
        Interpolate variables in a value
        
        Handles strings, dicts, and lists recursively.
        """
        return state.interpolate_object(value)


class NodeExecutorRegistry:
    """
    Registry for node executors
    
    Maps node types to executor classes.
    Supports dynamic registration for extensibility.
    """
    
    _executors: Dict[NodeType, Type[BaseNodeExecutor]] = {}
    
    @classmethod
    def register(cls, node_type: NodeType, executor_class: Type[BaseNodeExecutor]):
        """
        Register an executor for a node type
        
        Args:
            node_type: The node type to handle
            executor_class: The executor class
        """
        cls._executors[node_type] = executor_class
        logger.debug(f"Registered executor for {node_type}: {executor_class.__name__}")
    
    @classmethod
    def get(cls, node_type: NodeType) -> Optional[Type[BaseNodeExecutor]]:
        """
        Get executor class for a node type
        
        Args:
            node_type: The node type
            
        Returns:
            Executor class or None if not found
        """
        return cls._executors.get(node_type)
    
    @classmethod
    def create(
        cls, 
        node_type: NodeType, 
        dependencies: ExecutorDependencies
    ) -> Optional[BaseNodeExecutor]:
        """
        Create an executor instance for a node type
        
        Args:
            node_type: The node type
            dependencies: Dependencies to inject
            
        Returns:
            Executor instance or None if not registered
        """
        executor_class = cls.get(node_type)
        if executor_class:
            return executor_class(dependencies)
        return None
    
    @classmethod
    def list_types(cls) -> List[NodeType]:
        """List all registered node types"""
        return list(cls._executors.keys())
    
    @classmethod
    def is_registered(cls, node_type: NodeType) -> bool:
        """Check if a node type is registered"""
        return node_type in cls._executors


def register_executor(node_type: NodeType):
    """
    Decorator to register an executor class
    
    Usage:
        @register_executor(NodeType.AI_TASK)
        class AITaskNodeExecutor(BaseNodeExecutor):
            ...
    """
    def decorator(cls: Type[BaseNodeExecutor]):
        cls.node_type = node_type
        NodeExecutorRegistry.register(node_type, cls)
        return cls
    return decorator
