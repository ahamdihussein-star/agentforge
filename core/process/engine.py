"""
Process Engine
The core engine for executing process-type agents

This is the main orchestrator that:
- Loads and validates process definitions
- Executes nodes in correct order
- Manages state and checkpoints
- Handles errors and retries
- Creates audit trail

Design Principles:
- Modular: Node execution delegated to executors
- Stateless engine: All state in ProcessState
- Resumable: Full checkpoint support
- Observable: Emits events for monitoring
"""

import time
import uuid
import logging
import traceback
from typing import Dict, Any, List, Optional, AsyncIterator, TYPE_CHECKING
from datetime import datetime

from .schemas import ProcessDefinition, ProcessNode, NodeType
from .state import ProcessState, ProcessContext
from .result import NodeResult, ProcessResult, ExecutionError, ExecutionStatus, ErrorCategory
from .nodes.base import NodeExecutorRegistry, ExecutorDependencies, BaseNodeExecutor

if TYPE_CHECKING:
    from ..llm.base import BaseLLM
    from ..tools.base import BaseTool

logger = logging.getLogger(__name__)


class ProcessEvent:
    """Event emitted during process execution"""
    
    def __init__(
        self,
        event_type: str,
        data: Dict[str, Any] = None,
        node_id: str = None,
        timestamp: datetime = None
    ):
        self.type = event_type
        self.data = data or {}
        self.node_id = node_id
        self.timestamp = timestamp or datetime.utcnow()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'type': self.type,
            'data': self.data,
            'node_id': self.node_id,
            'timestamp': self.timestamp.isoformat()
        }


class ProcessEngine:
    """
    Process Execution Engine
    
    Executes process definitions step by step.
    Manages state, handles errors, and creates audit trail.
    
    Usage:
        engine = ProcessEngine(
            process_definition=process_def,
            context=context,
            dependencies=deps
        )
        result = await engine.execute(trigger_input)
        
        # Or with streaming
        async for event in engine.execute_stream(trigger_input):
            print(event)
    """
    
    def __init__(
        self,
        process_definition: ProcessDefinition,
        context: ProcessContext,
        dependencies: ExecutorDependencies,
        state: Optional[ProcessState] = None,
        execution_id: Optional[str] = None
    ):
        """
        Initialize the process engine
        
        Args:
            process_definition: The process definition to execute
            context: Execution context
            dependencies: External dependencies (LLM, tools, etc.)
            state: Optional existing state (for resumption)
            execution_id: Optional execution ID (for resumption)
        """
        self.definition = process_definition
        self.context = context
        self.deps = dependencies
        
        # Initialize or restore state
        self.state = state or ProcessState(
            initial_variables=self._get_initial_variables(),
            sensitive_variables=self._get_sensitive_variables()
        )
        
        # Execution tracking
        self.execution_id = execution_id or str(uuid.uuid4())
        self.started_at: Optional[datetime] = None
        self.total_tokens = 0
        self.nodes_executed = 0
        
        # Settings from definition
        self.settings = process_definition.settings
        self.max_nodes = self.settings.max_node_executions
        self.max_time = self.settings.max_execution_time_seconds
        
        # Node executor cache
        self._executors: Dict[NodeType, BaseNodeExecutor] = {}
    
    def _get_initial_variables(self) -> Dict[str, Any]:
        """Get initial variable values from definition"""
        variables = {}
        for var in self.definition.variables:
            if var.default is not None:
                variables[var.name] = var.default
        return variables
    
    def _get_sensitive_variables(self) -> set:
        """Get set of sensitive variable names"""
        return {var.name for var in self.definition.variables if var.sensitive}
    
    def _get_executor(self, node_type: NodeType) -> Optional[BaseNodeExecutor]:
        """Get or create executor for node type"""
        if node_type not in self._executors:
            executor = NodeExecutorRegistry.create(node_type, self.deps)
            if executor:
                self._executors[node_type] = executor
        return self._executors.get(node_type)
    
    async def execute(
        self,
        trigger_input: Dict[str, Any] = None
    ) -> ProcessResult:
        """
        Execute the process
        
        Args:
            trigger_input: Input data from trigger
            
        Returns:
            ProcessResult with final outcome
        """
        self.started_at = datetime.utcnow()
        trigger_input = trigger_input or {}
        
        logger.info(f"Starting process execution: {self.execution_id}")
        
        # Update context with trigger input
        self.context.trigger_input = trigger_input
        
        try:
            # Find start node
            start_node = self.definition.get_start_node()
            if not start_node:
                return ProcessResult.failure(
                    error=ExecutionError.validation_error("Process has no START node"),
                    execution_id=self.execution_id
                )
            
            # Execute from start node
            current_node = start_node
            
            while current_node:
                # Check execution limits
                if self.nodes_executed >= self.max_nodes:
                    return ProcessResult.failure(
                        error=ExecutionError(
                            category=ErrorCategory.RESOURCE,
                            code="MAX_NODES_EXCEEDED",
                            message=f"Exceeded maximum nodes ({self.max_nodes})"
                        ),
                        nodes_executed=self.state.get_completed_nodes(),
                        execution_id=self.execution_id
                    )
                
                elapsed = (datetime.utcnow() - self.started_at).total_seconds()
                if elapsed > self.max_time:
                    return ProcessResult.failure(
                        error=ExecutionError.timeout_error(
                            f"Process exceeded max time ({self.max_time}s)",
                            self.max_time
                        ),
                        nodes_executed=self.state.get_completed_nodes(),
                        execution_id=self.execution_id
                    )
                
                # Execute current node
                result = await self._execute_node(current_node)
                
                # Handle result
                if result.is_failure:
                    return ProcessResult.failure(
                        error=result.error,
                        failed_node_id=current_node.id,
                        nodes_executed=self.state.get_completed_nodes(),
                        total_duration_ms=(datetime.utcnow() - self.started_at).total_seconds() * 1000,
                        execution_id=self.execution_id
                    )
                
                if result.is_waiting:
                    # Process needs to pause (e.g. approval); pass metadata so API can create DB record
                    return ProcessResult.waiting(
                        waiting_for=result.waiting_for,
                        resume_node_id=current_node.id,
                        nodes_executed=self.state.get_completed_nodes(),
                        final_variables=self.state.get_all(),
                        execution_id=self.execution_id,
                        waiting_metadata=result.waiting_metadata
                    )
                
                # Update state with result
                self.state.mark_completed(current_node.id, result.output)
                if result.variables_update:
                    self.state.update(result.variables_update, changed_by=current_node.id)
                
                self.nodes_executed += 1
                self.total_tokens += result.tokens_used
                
                # Checkpoint if needed
                if self.settings.checkpoint_enabled:
                    if self.nodes_executed % self.settings.checkpoint_interval_nodes == 0:
                        await self._save_checkpoint()
                
                # Find next node
                current_node = await self._get_next_node(current_node, result)
            
            # Process completed
            total_duration = (datetime.utcnow() - self.started_at).total_seconds() * 1000
            
            return ProcessResult.success(
                output=self.state.get_all(),
                final_variables=self.state.get_all(),
                nodes_executed=self.state.get_completed_nodes(),
                total_duration_ms=total_duration,
                execution_id=self.execution_id
            )
            
        except Exception as e:
            logger.error(f"Process execution error: {e}")
            logger.error(traceback.format_exc())
            
            return ProcessResult.failure(
                error=ExecutionError.internal_error(str(e), traceback.format_exc()),
                nodes_executed=self.state.get_completed_nodes(),
                execution_id=self.execution_id
            )
    
    async def execute_stream(
        self,
        trigger_input: Dict[str, Any] = None
    ) -> AsyncIterator[ProcessEvent]:
        """
        Execute process with streaming events
        
        Yields ProcessEvent for each step.
        """
        self.started_at = datetime.utcnow()
        trigger_input = trigger_input or {}
        
        yield ProcessEvent(
            'process_started',
            {'execution_id': self.execution_id, 'process_name': self.definition.name}
        )
        
        self.context.trigger_input = trigger_input
        
        try:
            start_node = self.definition.get_start_node()
            if not start_node:
                yield ProcessEvent('error', {'message': 'No START node'})
                return
            
            current_node = start_node
            
            while current_node:
                # Check limits
                if self.nodes_executed >= self.max_nodes:
                    yield ProcessEvent('error', {'message': 'Max nodes exceeded'})
                    return
                
                yield ProcessEvent(
                    'node_started',
                    {'node_id': current_node.id, 'node_name': current_node.name, 'node_type': current_node.type.value},
                    node_id=current_node.id
                )
                
                # Execute node
                result = await self._execute_node(current_node)
                
                yield ProcessEvent(
                    'node_completed',
                    {
                        'node_id': current_node.id,
                        'status': result.status.value,
                        'duration_ms': result.duration_ms,
                        'output_preview': str(result.output)[:200] if result.output else None
                    },
                    node_id=current_node.id
                )
                
                if result.is_failure:
                    yield ProcessEvent(
                        'process_failed',
                        {'error': result.error.to_dict() if result.error else None, 'node_id': current_node.id}
                    )
                    return
                
                if result.is_waiting:
                    yield ProcessEvent(
                        'process_waiting',
                        {'waiting_for': result.waiting_for, 'node_id': current_node.id}
                    )
                    return
                
                # Update state
                self.state.mark_completed(current_node.id, result.output)
                if result.variables_update:
                    self.state.update(result.variables_update, changed_by=current_node.id)
                
                self.nodes_executed += 1
                self.total_tokens += result.tokens_used
                
                # Get next node
                current_node = await self._get_next_node(current_node, result)
            
            # Completed
            total_duration = (datetime.utcnow() - self.started_at).total_seconds() * 1000
            
            yield ProcessEvent(
                'process_completed',
                {
                    'execution_id': self.execution_id,
                    'nodes_executed': self.nodes_executed,
                    'total_duration_ms': total_duration,
                    'output': self.state.get_all()
                }
            )
            
        except Exception as e:
            yield ProcessEvent('error', {'message': str(e), 'traceback': traceback.format_exc()})
    
    async def _execute_node(self, node: ProcessNode) -> NodeResult:
        """Execute a single node"""
        
        logger.debug(f"Executing node: {node.id} ({node.type})")
        # [ProcessDebug] Config passed to executor (for approval/condition debugging)
        tc = getattr(node.config, "type_config", None) or {}
        if node.type.value in ("approval", "human_task", "condition"):
            logger.info(
                "[ProcessDebug] Executing node id=%s type=%s assignee_ids=%s approvers=%s expression=%s",
                node.id, node.type.value, tc.get("assignee_ids"), tc.get("approvers"), tc.get("expression")
            )
        
        # Skip if disabled
        if not node.config.enabled:
            logger.debug(f"Node {node.id} is disabled, skipping")
            return NodeResult.skipped(reason="Node is disabled")
        
        # Validate node
        executor = self._get_executor(node.type)
        if not executor:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    code="NO_EXECUTOR",
                    message=f"No executor registered for node type: {node.type}"
                )
            )
        
        validation_error = executor.validate(node)
        if validation_error:
            return NodeResult.failure(error=validation_error)
        
        # Set current node in state
        self.state.set_current_node(node.id)
        
        # Execute with timeout and retry handling
        try:
            result = await executor.execute_with_timeout(node, self.state, self.context)
            return result
            
        except Exception as e:
            logger.error(f"Node {node.id} execution failed: {e}")
            
            if node.config.skip_on_error:
                return NodeResult.skipped(reason=f"Error: {e}")
            
            return NodeResult.failure(
                error=ExecutionError.internal_error(str(e), traceback.format_exc())
            )
    
    async def _get_next_node(
        self, 
        current_node: ProcessNode, 
        result: NodeResult
    ) -> Optional[ProcessNode]:
        """Determine the next node to execute"""
        
        # End node - no next
        if current_node.type == NodeType.END:
            return None
        
        # Result specifies next node (for branching)
        if result.next_node_id:
            return self.definition.get_node(result.next_node_id)
        
        # Node has explicit next
        if current_node.next:
            if isinstance(current_node.next, str):
                return self.definition.get_node(current_node.next)
            elif isinstance(current_node.next, list) and current_node.next:
                return self.definition.get_node(current_node.next[0])
        
        # Use edges from definition
        edges = self.definition.get_outgoing_edges(current_node.id)
        
        if not edges:
            return None
        
        # Check conditional edges first
        for edge in edges:
            if edge.condition:
                if self.state.evaluate_condition(edge.condition):
                    return self.definition.get_node(edge.target)
            elif edge.edge_type == 'default' or not edge.condition:
                # Use first non-conditional edge as default
                return self.definition.get_node(edge.target)
        
        # Fall back to first edge
        return self.definition.get_node(edges[0].target)
    
    async def _save_checkpoint(self) -> None:
        """
        Save execution checkpoint to database
        
        This allows process resumption after:
        - Server restart
        - Human approval wait
        - External event wait
        """
        checkpoint = self.state.create_checkpoint()
        checkpoint['execution_id'] = self.execution_id
        checkpoint['nodes_executed'] = self.nodes_executed
        checkpoint['total_tokens'] = self.total_tokens
        
        # Save to database via callback if provided
        if hasattr(self, '_checkpoint_callback') and self._checkpoint_callback:
            try:
                await self._checkpoint_callback(
                    execution_id=self.execution_id,
                    checkpoint_data=checkpoint,
                    variables=self.state.get_all(),
                    completed_nodes=self.state.get_completed_nodes()
                )
                logger.debug(f"Checkpoint saved to database at node count: {self.nodes_executed}")
            except Exception as e:
                logger.error(f"Failed to save checkpoint: {e}")
        else:
            logger.debug(f"Checkpoint created (no callback) at node count: {self.nodes_executed}")
    
    def set_checkpoint_callback(self, callback) -> None:
        """Set callback for checkpoint persistence"""
        self._checkpoint_callback = callback
        
    async def resume(
        self,
        checkpoint_data: Dict[str, Any],
        resume_input: Dict[str, Any] = None
    ) -> ProcessResult:
        """
        Resume execution from a checkpoint
        
        Args:
            checkpoint_data: Checkpoint data to restore
            resume_input: Optional input for resumption (e.g., approval result)
            
        Returns:
            ProcessResult
        """
        logger.info(f"Resuming process execution: {self.execution_id}")
        
        # Restore state
        self.state.restore_checkpoint(checkpoint_data)
        self.nodes_executed = checkpoint_data.get('nodes_executed', 0)
        self.total_tokens = checkpoint_data.get('total_tokens', 0)
        
        # Apply resume input to state
        if resume_input:
            self.state.update(resume_input, changed_by='resume')
        
        # Get current node
        current_node_id = self.state.get_current_node()
        if not current_node_id:
            return ProcessResult.failure(
                error=ExecutionError.validation_error("No current node in checkpoint"),
                execution_id=self.execution_id
            )
        
        # Find the node after the waiting node
        current_node = self.definition.get_node(current_node_id)
        if not current_node:
            return ProcessResult.failure(
                error=ExecutionError.validation_error(f"Node not found: {current_node_id}"),
                execution_id=self.execution_id
            )
        
        # Mark waiting node as complete and continue
        self.state.mark_completed(current_node_id, resume_input)
        
        # Get next node
        next_node = await self._get_next_node(current_node, NodeResult.success(output=resume_input))
        
        if not next_node:
            # Process was at end
            return ProcessResult.success(
                output=self.state.get_all(),
                final_variables=self.state.get_all(),
                nodes_executed=self.state.get_completed_nodes(),
                execution_id=self.execution_id
            )
        
        # Continue execution from next node
        self.started_at = datetime.utcnow()
        return await self._continue_from_node(next_node)
    
    async def _continue_from_node(self, start_node: ProcessNode) -> ProcessResult:
        """Continue execution from a specific node"""
        current_node = start_node
        
        while current_node:
            if self.nodes_executed >= self.max_nodes:
                return ProcessResult.failure(
                    error=ExecutionError(
                        category=ErrorCategory.RESOURCE,
                        code="MAX_NODES_EXCEEDED",
                        message=f"Exceeded maximum nodes ({self.max_nodes})"
                    ),
                    nodes_executed=self.state.get_completed_nodes(),
                    execution_id=self.execution_id
                )
            
            result = await self._execute_node(current_node)
            
            if result.is_failure:
                return ProcessResult.failure(
                    error=result.error,
                    failed_node_id=current_node.id,
                    nodes_executed=self.state.get_completed_nodes(),
                    execution_id=self.execution_id
                )
            
            if result.is_waiting:
                return ProcessResult.waiting(
                    waiting_for=result.waiting_for,
                    resume_node_id=current_node.id,
                    nodes_executed=self.state.get_completed_nodes(),
                    final_variables=self.state.get_all(),
                    execution_id=self.execution_id,
                    waiting_metadata=result.waiting_metadata
                )
            
            self.state.mark_completed(current_node.id, result.output)
            if result.variables_update:
                self.state.update(result.variables_update, changed_by=current_node.id)
            
            self.nodes_executed += 1
            current_node = await self._get_next_node(current_node, result)
        
        return ProcessResult.success(
            output=self.state.get_all(),
            final_variables=self.state.get_all(),
            nodes_executed=self.state.get_completed_nodes(),
            execution_id=self.execution_id
        )
    
    def get_checkpoint(self) -> Dict[str, Any]:
        """Get current checkpoint data"""
        checkpoint = self.state.create_checkpoint()
        checkpoint['execution_id'] = self.execution_id
        checkpoint['nodes_executed'] = self.nodes_executed
        checkpoint['total_tokens'] = self.total_tokens
        return checkpoint
