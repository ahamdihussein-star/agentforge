"""
Logic Node Executors
Conditional branching, loops, parallel execution, and sub-process invocation

These nodes control the flow of execution:
- CONDITION: If/else branching
- SWITCH: Multi-way branching
- LOOP: For-each iteration
- WHILE: Conditional iteration
- PARALLEL: Parallel execution of branches
- SUB_PROCESS: Invoke another published process
"""

import logging
from typing import Optional, List
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ErrorCategory
from .base import BaseNodeExecutor, register_executor

logger = logging.getLogger(__name__)


@register_executor(NodeType.CONDITION)
class ConditionNodeExecutor(BaseNodeExecutor):
    """
    Condition (If/Else) node executor
    
    Evaluates a condition and routes to true or false branch.
    
    Config:
        expression: Condition to evaluate (e.g., "{{count}} > 10")
        true_branch: Node ID if true
        false_branch: Node ID if false
    """
    
    display_name = "Condition"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute condition node"""
        
        # Get configuration
        expression = self.get_config_value(node, 'expression', '')
        true_branch = self.get_config_value(node, 'true_branch')
        false_branch = self.get_config_value(node, 'false_branch')
        
        logs = [f"Evaluating condition: {expression}"]
        
        # Evaluate condition
        try:
            result = state.evaluate_condition(expression)
            logs.append(f"Condition result: {result}")
        except Exception as e:
            err_str = str(e)
            # Determine if this is a user-fixable config issue or a technical bug
            is_none_comparison = "NoneType" in err_str or "None" in err_str
            if is_none_comparison:
                biz_msg = (
                    f"The decision step \"{node.name}\" could not evaluate because a required value was missing or empty. "
                    "This usually means an earlier step (like data extraction or AI analysis) did not produce the expected result. "
                    "Please check the previous steps in the Technical view."
                )
                is_fixable = False
            else:
                biz_msg = (
                    f"The decision step \"{node.name}\" encountered an error evaluating its rule. "
                    "The condition configuration may need to be updated."
                )
                is_fixable = True
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.VALIDATION,
                    code="CONDITION_EVAL_FAILED",
                    message=f"Failed to evaluate condition '{expression}': {e}",
                    business_message=biz_msg,
                    is_user_fixable=is_fixable,
                    details={'expression': expression, 'error': err_str},
                ),
                logs=logs
            )
        
        # Determine next node
        next_node = true_branch if result else false_branch
        branch_name = 'true' if result else 'false'
        logs.append(f"Taking {branch_name} branch -> {next_node}")
        
        if not next_node:
            return NodeResult.failure(
                error=ExecutionError.validation_error(
                    f"No {branch_name} branch defined"
                ),
                logs=logs
            )
        
        return NodeResult.success(
            output={'condition_result': result, 'branch': branch_name},
            next_node_id=next_node,
            logs=logs
        )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate condition node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        expression = self.get_config_value(node, 'expression')
        if not expression:
            return ExecutionError.validation_error("Condition expression is required")
        
        true_branch = self.get_config_value(node, 'true_branch')
        false_branch = self.get_config_value(node, 'false_branch')
        
        if not true_branch and not false_branch:
            return ExecutionError.validation_error(
                "At least one branch (true or false) must be defined"
            )
        
        return None


@register_executor(NodeType.SWITCH)
class SwitchNodeExecutor(BaseNodeExecutor):
    """
    Switch (multi-way branching) node executor
    
    Evaluates expression and routes based on multiple conditions.
    
    Config:
        expression: Expression to evaluate
        cases: List of {condition, target} pairs
        default: Default target if no case matches
    """
    
    display_name = "Switch"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute switch node"""
        
        expression = self.get_config_value(node, 'expression', '')
        cases = self.get_config_value(node, 'cases', [])
        default_target = self.get_config_value(node, 'default')
        
        logs = [f"Evaluating switch expression: {expression}"]
        
        # Evaluate the main expression
        try:
            value = state.evaluate(expression)
            logs.append(f"Expression value: {value}")
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to evaluate: {e}"),
                logs=logs
            )
        
        # Check each case
        for i, case in enumerate(cases):
            case_condition = case.get('condition', case.get('value'))
            case_target = case.get('target', case.get('next'))
            
            # Check if condition matches
            try:
                # Handle simple value comparison
                if isinstance(case_condition, (str, int, float, bool)):
                    # Direct value comparison
                    if value == case_condition:
                        logs.append(f"Matched case {i}: {case_condition} -> {case_target}")
                        return NodeResult.success(
                            output={'matched_case': i, 'value': value},
                            next_node_id=case_target,
                            logs=logs
                        )
                    # Try as expression
                    elif isinstance(case_condition, str) and '{{' in case_condition:
                        full_expr = f"({expression}) {case_condition}"
                        if state.evaluate_condition(full_expr):
                            logs.append(f"Matched case {i}: {case_condition} -> {case_target}")
                            return NodeResult.success(
                                output={'matched_case': i, 'value': value},
                                next_node_id=case_target,
                                logs=logs
                            )
            except Exception as e:
                logs.append(f"Case {i} evaluation failed: {e}")
                continue
        
        # No case matched, use default
        logs.append(f"No case matched, using default: {default_target}")
        
        if not default_target:
            return NodeResult.failure(
                error=ExecutionError.validation_error("No case matched and no default defined"),
                logs=logs
            )
        
        return NodeResult.success(
            output={'matched_case': 'default', 'value': value},
            next_node_id=default_target,
            logs=logs
        )


@register_executor(NodeType.LOOP)
class LoopNodeExecutor(BaseNodeExecutor):
    """
    Loop (for-each) node executor
    
    Iterates over a collection and executes body nodes for each item.
    
    Config:
        items_expression: Expression that returns array to iterate
        item_variable: Variable name for current item (default: "item")
        index_variable: Variable name for current index (default: "index")
        body_nodes: Node IDs to execute for each item
        max_iterations: Safety limit (default: 1000)
    """
    
    display_name = "Loop"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute loop node - returns control info for engine to iterate"""
        
        items_expr = self.get_config_value(node, 'items_expression', '[]')
        item_var = self.get_config_value(node, 'item_variable', 'item')
        index_var = self.get_config_value(node, 'index_variable', 'index')
        body_nodes = self.get_config_value(node, 'body_nodes', [])
        max_iterations = self.get_config_value(node, 'max_iterations', 1000)
        
        logs = [f"Starting loop with expression: {items_expr}"]
        
        # Get items to iterate
        try:
            items = state.evaluate(items_expr)
            if not isinstance(items, list):
                items = list(items) if items else []
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to get loop items: {e}"),
                logs=logs
            )
        
        logs.append(f"Found {len(items)} items to iterate")
        
        # Check max iterations
        if len(items) > max_iterations:
            return NodeResult.failure(
                error=ExecutionError.validation_error(
                    f"Too many items ({len(items)}), max is {max_iterations}"
                ),
                logs=logs
            )
        
        if not items:
            logs.append("Empty collection, skipping loop")
            return NodeResult.success(
                output={'iterations': 0, 'results': []},
                logs=logs
            )
        
        # Initialize loop state
        state.push_loop(items, item_var, index_var)
        state.set_loop_item()  # Set first item
        
        logs.append(f"Loop initialized, first item set to {item_var}")
        
        # Return with loop control info
        # The engine will handle iteration
        return NodeResult.success(
            output={
                'is_loop_start': True,
                'total_items': len(items),
                'item_variable': item_var,
                'index_variable': index_var,
                'body_nodes': body_nodes,
            },
            next_node_ids=body_nodes[:1] if body_nodes else None,  # Start with first body node
            logs=logs
        )


@register_executor(NodeType.WHILE)
class WhileNodeExecutor(BaseNodeExecutor):
    """
    While loop node executor
    
    Continues executing body while condition is true.
    
    Config:
        condition: Condition to check each iteration
        body_nodes: Nodes to execute each iteration
        max_iterations: Safety limit
    """
    
    display_name = "While"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute while node"""
        
        condition = self.get_config_value(node, 'condition', 'false')
        body_nodes = self.get_config_value(node, 'body_nodes', [])
        max_iterations = self.get_config_value(node, 'max_iterations', 1000)
        
        # Track iteration count in state
        iteration_var = f"_while_{node.id}_count"
        current_count = state.get(iteration_var, 0)
        
        logs = [f"While iteration {current_count + 1}, condition: {condition}"]
        
        # Check iteration limit
        if current_count >= max_iterations:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Max iterations ({max_iterations}) reached"),
                logs=logs
            )
        
        # Evaluate condition
        try:
            should_continue = state.evaluate_condition(condition)
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Condition evaluation failed: {e}"),
                logs=logs
            )
        
        if should_continue:
            logs.append("Condition true, executing body")
            state.set(iteration_var, current_count + 1, changed_by=node.id)
            
            return NodeResult.success(
                output={'iteration': current_count + 1, 'continuing': True},
                next_node_ids=body_nodes[:1] if body_nodes else None,
                variables_update={iteration_var: current_count + 1},
                logs=logs
            )
        else:
            logs.append("Condition false, exiting loop")
            # Clean up iteration counter
            state.delete(iteration_var, changed_by=node.id)
            
            return NodeResult.success(
                output={'iteration': current_count, 'continuing': False},
                logs=logs
            )


@register_executor(NodeType.PARALLEL)
class ParallelNodeExecutor(BaseNodeExecutor):
    """
    Parallel execution node executor
    
    Executes multiple branches in parallel.
    
    Config:
        branches: List of node ID lists, each list is a branch
        merge_strategy: wait_all, wait_any, wait_n
        wait_count: For wait_n, how many to wait for
        fail_fast: Whether to fail if any branch fails
    """
    
    display_name = "Parallel"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute parallel node - returns branch info for engine"""
        
        branches = self.get_config_value(node, 'branches', [])
        merge_strategy = self.get_config_value(node, 'merge_strategy', 'wait_all')
        wait_count = self.get_config_value(node, 'wait_count')
        fail_fast = self.get_config_value(node, 'fail_fast', True)
        
        logs = [f"Starting parallel execution with {len(branches)} branches"]
        logs.append(f"Strategy: {merge_strategy}")
        
        if not branches:
            logs.append("No branches defined")
            return NodeResult.success(
                output={'branches_count': 0},
                logs=logs
            )
        
        # Initialize parallel tracking
        state.start_parallel(node.id, branches)
        
        # Get first node of each branch for parallel execution
        branch_starts = []
        for i, branch in enumerate(branches):
            if branch:
                branch_starts.append(branch[0])
                logs.append(f"Branch {i}: starts with {branch[0]}")
        
        return NodeResult.success(
            output={
                'is_parallel_start': True,
                'parallel_id': node.id,
                'branches': branches,
                'branch_starts': branch_starts,
                'merge_strategy': merge_strategy,
                'wait_count': wait_count,
                'fail_fast': fail_fast,
            },
            next_node_ids=branch_starts,  # All branch starts
            logs=logs
        )


@register_executor(NodeType.SUB_PROCESS)
class SubProcessNodeExecutor(BaseNodeExecutor):
    """
    Sub-process (Call Process) node executor
    
    Invokes another published process as a sub-step. The sub-process
    runs to completion and its output is returned as this node's output.
    
    Config:
        process_id: ID of the published process to invoke
        input_mapping: Dict mapping current variables to sub-process inputs
        wait_for_completion: Whether to block until sub-process finishes
        timeout_seconds: Max time to wait for sub-process
    """
    
    display_name = "Call Process"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute sub-process node — invokes another process via the execution service"""
        
        process_id = self.get_config_value(node, 'process_id', '')
        input_mapping = self.get_config_value(node, 'input_mapping', {})
        wait_for_completion = self.get_config_value(node, 'wait_for_completion', True)
        timeout_seconds = self.get_config_value(node, 'timeout_seconds', 3600)
        
        logs = [f"Invoking sub-process: {process_id}"]
        
        if not process_id:
            return NodeResult.failure(
                error=ExecutionError(
                    code="SUB_PROCESS_NO_ID",
                    message="No process ID configured. Select a published process to run.",
                    category=ErrorCategory.CONFIGURATION
                ),
                logs=["No process_id configured for sub-process node"]
            )
        
        # Build input data from mapping
        input_data = {}
        for target_key, source_expr in input_mapping.items():
            if isinstance(source_expr, str) and source_expr.startswith('{{') and source_expr.endswith('}}'):
                var_name = source_expr[2:-2].strip()
                input_data[target_key] = state.get_variable(var_name)
            else:
                input_data[target_key] = source_expr
        
        logs.append(f"Input mapping: {len(input_mapping)} fields")
        logs.append(f"Wait for completion: {wait_for_completion}")
        
        # The actual sub-process invocation is handled by the engine,
        # which will look for 'is_sub_process' in the output and call
        # the process execution service accordingly.
        return NodeResult.success(
            output={
                'is_sub_process': True,
                'sub_process_id': process_id,
                'sub_process_input': input_data,
                'wait_for_completion': wait_for_completion,
                'timeout_seconds': timeout_seconds,
            },
            logs=logs
        )


@register_executor(NodeType.SUB_PROCESS)
class SubProcessNodeExecutor(BaseNodeExecutor):
    """
    Sub-process node executor

    Invokes another published process as a child execution.
    The parent process waits for the child to complete and captures its output.

    Config:
        process_id: ID of the published process to invoke
        input_mapping: Dict mapping parent variables to child input fields
        wait_for_completion: Whether to block until child finishes (default True)
        timeout_seconds: Max wait time (default 3600)
    """

    display_name = "Call Process"

    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute sub-process node — invoke child process"""

        process_id = self.get_config_value(node, 'process_id', '')
        input_mapping = self.get_config_value(node, 'input_mapping', {})
        wait_for_completion = self.get_config_value(node, 'wait_for_completion', True)
        timeout_seconds = self.get_config_value(node, 'timeout_seconds', 3600)

        logs = [f"Sub-process invocation: process_id={process_id}"]

        if not process_id:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    message="No process_id configured for Call Process node",
                    details={"node_id": node.id}
                ),
                logs=["ERROR: process_id is empty — configure 'Which process to run?'"]
            )

        # Resolve input mapping: substitute variable references from parent state
        resolved_inputs = {}
        for child_key, parent_ref in input_mapping.items():
            if isinstance(parent_ref, str) and parent_ref.startswith('{{') and parent_ref.endswith('}}'):
                var_name = parent_ref[2:-2].strip()
                resolved_inputs[child_key] = state.get_variable(var_name) if hasattr(state, 'get_variable') else parent_ref
            else:
                resolved_inputs[child_key] = parent_ref

        logs.append(f"Resolved inputs: {list(resolved_inputs.keys())}")

        # The actual sub-process invocation is delegated to the engine/service layer.
        # This executor returns metadata so the engine can handle the invocation.
        return NodeResult.success(
            output={
                'is_sub_process': True,
                'sub_process_id': process_id,
                'sub_process_inputs': resolved_inputs,
                'wait_for_completion': wait_for_completion,
                'timeout_seconds': timeout_seconds,
            },
            logs=logs
        )
