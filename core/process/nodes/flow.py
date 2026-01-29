"""
Flow Control Node Executors
Start and End nodes for process flow

These are the simplest nodes:
- START: Entry point, initializes variables
- END: Exit point, returns final output
"""

from typing import Optional
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError
from .base import BaseNodeExecutor, register_executor


@register_executor(NodeType.START)
class StartNodeExecutor(BaseNodeExecutor):
    """
    Start node executor
    
    The entry point of every process.
    - Initializes process variables from trigger input
    - Validates required variables
    """
    
    display_name = "Start"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute start node"""
        
        logs = ["Process started"]
        
        # Map trigger input to variables
        input_mapping = node.input_mapping
        if input_mapping:
            for var_name, source_path in input_mapping.items():
                value = context.trigger_input.get(source_path.replace('{{', '').replace('}}', '').strip())
                if value is not None:
                    state.set(var_name, value, changed_by=node.id)
                    logs.append(f"Set {var_name} from trigger input")
        
        # Also copy all trigger input to variables if no explicit mapping
        if not input_mapping and context.trigger_input:
            for key, value in context.trigger_input.items():
                state.set(key, value, changed_by=node.id)
                logs.append(f"Set {key} from trigger input")
        
        # Log context info
        logs.append(f"Trigger type: {context.trigger_type}")
        logs.append(f"User: {context.user_id}")
        
        return NodeResult.success(
            output={"started": True},
            logs=logs
        )


@register_executor(NodeType.END)
class EndNodeExecutor(BaseNodeExecutor):
    """
    End node executor
    
    The exit point of a process.
    - Collects final output
    - Marks process as complete
    """
    
    display_name = "End"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute end node"""
        
        logs = ["Process completed"]
        
        # Collect output
        output = {}
        
        # Check for explicit output mapping
        output_config = self.get_config_value(node, 'output', None)
        
        if output_config:
            if isinstance(output_config, dict):
                # Map specific variables to output
                for output_key, var_path in output_config.items():
                    value = state.evaluate(var_path) if isinstance(var_path, str) else var_path
                    output[output_key] = value
            elif isinstance(output_config, str):
                # Single variable as output
                output = state.evaluate(output_config)
        else:
            # Default: return all variables
            output = state.get_all()
        
        # Add metadata
        completed_nodes = state.get_completed_nodes()
        logs.append(f"Nodes executed: {len(completed_nodes)}")
        
        return NodeResult.success(
            output=output,
            logs=logs
        )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """End nodes don't need special validation"""
        return super().validate(node)


@register_executor(NodeType.MERGE)
class MergeNodeExecutor(BaseNodeExecutor):
    """
    Merge node executor
    
    Merges results from parallel branches.
    - Waits for all/any branches to complete
    - Combines results based on strategy
    """
    
    display_name = "Merge"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute merge node"""
        
        # Get merge configuration
        merge_strategy = self.get_config_value(node, 'strategy', 'wait_all')
        source_nodes = self.get_config_value(node, 'source_nodes', [])
        output_variable = node.output_variable or 'merged_results'
        
        logs = [f"Merging results from {len(source_nodes)} branches"]
        
        # Collect results from source nodes
        results = []
        for source_id in source_nodes:
            result = state.get_node_output(source_id)
            if result is not None:
                results.append(result)
        
        logs.append(f"Collected {len(results)} results")
        
        # Apply merge strategy
        merged = None
        if merge_strategy == 'concat':
            # Concatenate arrays
            merged = []
            for r in results:
                if isinstance(r, list):
                    merged.extend(r)
                else:
                    merged.append(r)
        elif merge_strategy == 'object':
            # Merge as object
            merged = {}
            for i, r in enumerate(results):
                if isinstance(r, dict):
                    merged.update(r)
                else:
                    merged[f'result_{i}'] = r
        else:
            # Default: keep as array
            merged = results
        
        return NodeResult.success(
            output=merged,
            variables_update={output_variable: merged},
            logs=logs
        )
