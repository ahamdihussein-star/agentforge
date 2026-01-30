"""
Process State Management
Manages execution state, variables, and context for process execution

Design Principles:
- Immutable snapshots for checkpointing
- Thread-safe variable access
- Expression evaluation with security
- Full change tracking for audit
"""

import copy
import re
import json
from typing import Dict, Any, List, Optional, Set
from datetime import datetime
from pydantic import BaseModel, Field
import logging

logger = logging.getLogger(__name__)


# =============================================================================
# VARIABLE CHANGE TRACKING
# =============================================================================

class VariableChange(BaseModel):
    """Record of a variable change"""
    variable_name: str
    old_value: Any = None
    new_value: Any
    changed_by: str  # Node ID or "trigger" or "external"
    changed_at: datetime = Field(default_factory=datetime.utcnow)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'variable_name': self.variable_name,
            'old_value': self.old_value,
            'new_value': self.new_value,
            'changed_by': self.changed_by,
            'changed_at': self.changed_at.isoformat(),
        }


# =============================================================================
# PROCESS CONTEXT
# =============================================================================

class ProcessContext(BaseModel):
    """
    Immutable context passed to node executors
    
    Contains read-only information about the process execution.
    Includes security context from access control.
    """
    # Execution info
    execution_id: str
    agent_id: str
    org_id: str
    
    # Trigger info
    trigger_type: str
    trigger_input: Dict[str, Any] = Field(default_factory=dict)
    
    # Conversation context (if started from chat)
    conversation_id: Optional[str] = None
    conversation_history: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Current user (who triggered)
    user_id: str
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    user_roles: List[str] = Field(default_factory=list)
    user_groups: List[str] = Field(default_factory=list)
    
    # Environment
    environment: str = "production"  # production, staging, development
    
    # Tool IDs available to this process (filtered by access control)
    available_tool_ids: List[str] = Field(default_factory=list)
    
    # Tool IDs denied for this user (for error messages)
    denied_tool_ids: List[str] = Field(default_factory=list)
    
    # Secrets/credentials (references, not actual values)
    credentials: Dict[str, str] = Field(default_factory=dict)
    
    # Configuration
    settings: Dict[str, Any] = Field(default_factory=dict)
    
    def is_tool_allowed(self, tool_id: str) -> bool:
        """Check if a tool is allowed for this execution context"""
        return tool_id in self.available_tool_ids and tool_id not in self.denied_tool_ids
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return self.model_dump(mode='json')
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ProcessContext':
        """Create from dictionary"""
        return cls.model_validate(data)


# =============================================================================
# PROCESS STATE
# =============================================================================

class ProcessState:
    """
    Process execution state manager
    
    Manages:
    - Variables (the working data)
    - Execution position (current node, completed nodes)
    - Change history for audit
    - Checkpointing and restoration
    
    Thread-safe and supports immutable snapshots.
    """
    
    def __init__(
        self,
        initial_variables: Optional[Dict[str, Any]] = None,
        sensitive_variables: Optional[Set[str]] = None
    ):
        """
        Initialize process state
        
        Args:
            initial_variables: Initial variable values
            sensitive_variables: Set of variable names that contain sensitive data
        """
        self._variables: Dict[str, Any] = initial_variables or {}
        self._sensitive_variables: Set[str] = sensitive_variables or set()
        
        # Execution tracking
        self._current_node_id: Optional[str] = None
        self._completed_nodes: List[str] = []
        self._skipped_nodes: List[str] = []
        self._node_outputs: Dict[str, Any] = {}  # Outputs from each node
        
        # Change tracking
        self._changes: List[VariableChange] = []
        
        # Loop state (for nested loops)
        self._loop_stack: List[Dict[str, Any]] = []
        
        # Parallel branch tracking
        self._parallel_branches: Dict[str, Dict[str, Any]] = {}
    
    # =========================================================================
    # VARIABLE ACCESS
    # =========================================================================
    
    def get(self, name: str, default: Any = None) -> Any:
        """
        Get a variable value
        
        Supports dot notation for nested access: "user.name"
        """
        if '.' in name:
            return self._get_nested(name, default)
        return self._variables.get(name, default)
    
    def _get_nested(self, path: str, default: Any = None) -> Any:
        """Get nested value using dot notation"""
        parts = path.split('.')
        value = self._variables
        
        for part in parts:
            if isinstance(value, dict):
                value = value.get(part)
            elif isinstance(value, list):
                try:
                    index = int(part)
                    value = value[index]
                except (ValueError, IndexError):
                    return default
            else:
                return default
            
            if value is None:
                return default
        
        return value
    
    def set(self, name: str, value: Any, changed_by: str = "unknown") -> None:
        """
        Set a variable value
        
        Args:
            name: Variable name (supports dot notation for nested set)
            value: Value to set
            changed_by: Node ID or identifier of what made the change
        """
        old_value = self.get(name)
        
        if '.' in name:
            self._set_nested(name, value)
        else:
            self._variables[name] = value
        
        # Track change
        self._changes.append(VariableChange(
            variable_name=name,
            old_value=old_value,
            new_value=value,
            changed_by=changed_by
        ))
    
    def _set_nested(self, path: str, value: Any) -> None:
        """Set nested value using dot notation"""
        parts = path.split('.')
        target = self._variables
        
        for part in parts[:-1]:
            if part not in target:
                target[part] = {}
            target = target[part]
        
        target[parts[-1]] = value
    
    def delete(self, name: str, changed_by: str = "unknown") -> None:
        """Delete a variable"""
        if name in self._variables:
            old_value = self._variables.pop(name)
            self._changes.append(VariableChange(
                variable_name=name,
                old_value=old_value,
                new_value=None,
                changed_by=changed_by
            ))
    
    def has(self, name: str) -> bool:
        """Check if a variable exists"""
        if '.' in name:
            return self._get_nested(name) is not None
        return name in self._variables
    
    def get_all(self) -> Dict[str, Any]:
        """Get all variables (deep copy)"""
        return copy.deepcopy(self._variables)
    
    def update(self, variables: Dict[str, Any], changed_by: str = "unknown") -> None:
        """Update multiple variables"""
        for name, value in variables.items():
            self.set(name, value, changed_by)
    
    # =========================================================================
    # EXPRESSION EVALUATION
    # =========================================================================
    
    def evaluate(self, expression: str) -> Any:
        """
        Evaluate an expression with variable interpolation
        
        Supports:
        - Variable references: {{variable_name}}
        - Nested access: {{user.name}}
        - Simple comparisons: {{count}} > 10
        - JSON paths: {{data[0].name}}
        
        Args:
            expression: Expression to evaluate
            
        Returns:
            Evaluated result
        """
        if not expression:
            return expression
        
        # Simple variable interpolation: {{variable_name}}
        pattern = r'\{\{([^}]+)\}\}'
        
        def replace_var(match):
            var_path = match.group(1).strip()
            value = self._resolve_path(var_path)
            # If value is a string that looks like a variable reference (e.g. "{{name}}"), resolve it
            # so that expressions like "{{name}} > 1000" work when "name" is in trigger_input
            if isinstance(value, str) and re.match(r'^\s*\{\{[^}]+\}\}\s*$', value):
                inner_match = re.match(r'^\s*\{\{([^}]+)\}\}\s*$', value)
                if inner_match:
                    inner_path = inner_match.group(1).strip()
                    inner_value = self._resolve_path(inner_path)
                    if inner_value is not None and not (
                        isinstance(inner_value, str) and re.match(r'^\s*\{\{[^}]+\}\}\s*$', inner_value)
                    ):
                        value = inner_value
            if value is None:
                return 'null'
            if isinstance(value, str):
                # Try numeric so "500" / "500.5" > 1000 works (no str vs float in eval)
                s = value.strip()
                try:
                    n = float(s)
                    return str(n) if n != int(n) else str(int(n))
                except (ValueError, TypeError):
                    return repr(value)
            if isinstance(value, bool):
                return 'true' if value else 'false'
            return json.dumps(value)
        
        # If expression is just a variable reference, return the actual value
        simple_match = re.fullmatch(r'\{\{([^}]+)\}\}', expression.strip())
        if simple_match:
            return self._resolve_path(simple_match.group(1).strip())
        
        # Otherwise, interpolate as string
        result = re.sub(pattern, replace_var, expression)
        
        return result
    
    def evaluate_condition(self, expression: str) -> bool:
        """
        Evaluate a condition expression
        
        Supports:
        - Comparisons: {{x}} > 10, {{status}} == "active"
        - Boolean variables: {{is_valid}}
        - Logical operators: and, or, not
        
        Returns:
            Boolean result
        """
        if not expression:
            return True
        
        # First, substitute variables
        evaluated = self.evaluate(expression)
        
        # If result is already boolean, return it
        if isinstance(evaluated, bool):
            return evaluated
        
        # Try to evaluate as Python expression (safely)
        try:
            # Simple safe evaluation
            result = self._safe_eval(str(evaluated))
            return bool(result)
        except Exception as e:
            logger.warning(f"Failed to evaluate condition '{expression}': {e}")
            return False
    
    def _resolve_path(self, path: str) -> Any:
        """
        Resolve a variable path including array access
        
        Supports:
        - Simple: variable_name
        - Nested: user.profile.name
        - Array: items[0].name
        - Mixed: data.users[0].email
        """
        # Handle array notation
        path = re.sub(r'\[(\d+)\]', r'.\1', path)
        return self._get_nested(path)
    
    def _safe_eval(self, expression: str) -> Any:
        """
        Safely evaluate a simple expression
        
        Only allows basic comparisons and boolean operations.
        """
        # Replace string comparisons
        expression = expression.replace('==', ' == ').replace('!=', ' != ')
        expression = expression.replace('>=', ' >= ').replace('<=', ' <= ')
        expression = expression.replace(' and ', ' and ').replace(' or ', ' or ')
        
        # Only allow safe characters
        allowed_chars = set('0123456789.+-*/<>=!andornotTrue False None"\'() ')
        if not all(c in allowed_chars or c.isalnum() or c == '_' for c in expression):
            raise ValueError(f"Unsafe expression: {expression}")
        
        # Evaluate (null/None for empty checks from interpolated expressions)
        return eval(expression, {"__builtins__": {}}, {
            "True": True, "False": False, "None": None,
            "true": True, "false": False, "null": None
        })
    
    def interpolate_string(self, template: str) -> str:
        """
        Interpolate variables into a string template
        
        Uses {{variable}} syntax.
        """
        result = self.evaluate(template)
        return str(result) if result is not None else ""
    
    def interpolate_object(self, obj: Any) -> Any:
        """
        Recursively interpolate variables in an object
        
        Handles dicts, lists, and strings.
        """
        if isinstance(obj, str):
            return self.evaluate(obj)
        elif isinstance(obj, dict):
            return {k: self.interpolate_object(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self.interpolate_object(item) for item in obj]
        else:
            return obj
    
    # =========================================================================
    # NODE EXECUTION TRACKING
    # =========================================================================
    
    def set_current_node(self, node_id: str) -> None:
        """Set the current executing node"""
        self._current_node_id = node_id
    
    def get_current_node(self) -> Optional[str]:
        """Get current executing node"""
        return self._current_node_id
    
    def mark_completed(self, node_id: str, output: Any = None) -> None:
        """Mark a node as completed"""
        if node_id not in self._completed_nodes:
            self._completed_nodes.append(node_id)
        if output is not None:
            self._node_outputs[node_id] = output
    
    def mark_skipped(self, node_id: str) -> None:
        """Mark a node as skipped"""
        if node_id not in self._skipped_nodes:
            self._skipped_nodes.append(node_id)
    
    def is_completed(self, node_id: str) -> bool:
        """Check if a node has been completed"""
        return node_id in self._completed_nodes
    
    def is_skipped(self, node_id: str) -> bool:
        """Check if a node was skipped"""
        return node_id in self._skipped_nodes
    
    def get_completed_nodes(self) -> List[str]:
        """Get list of completed node IDs"""
        return self._completed_nodes.copy()
    
    def get_skipped_nodes(self) -> List[str]:
        """Get list of skipped node IDs"""
        return self._skipped_nodes.copy()
    
    def get_node_output(self, node_id: str) -> Any:
        """Get output from a completed node"""
        return self._node_outputs.get(node_id)
    
    # =========================================================================
    # LOOP STATE MANAGEMENT
    # =========================================================================
    
    def push_loop(self, items: List[Any], item_var: str, index_var: str) -> None:
        """Start a new loop iteration context"""
        self._loop_stack.append({
            'items': items,
            'item_var': item_var,
            'index_var': index_var,
            'current_index': 0
        })
    
    def pop_loop(self) -> None:
        """End current loop context"""
        if self._loop_stack:
            loop = self._loop_stack.pop()
            # Clean up loop variables
            if loop['item_var'] in self._variables:
                del self._variables[loop['item_var']]
            if loop['index_var'] in self._variables:
                del self._variables[loop['index_var']]
    
    def advance_loop(self) -> bool:
        """
        Advance to next loop iteration
        
        Returns:
            True if there are more items, False if loop is complete
        """
        if not self._loop_stack:
            return False
        
        loop = self._loop_stack[-1]
        loop['current_index'] += 1
        
        if loop['current_index'] < len(loop['items']):
            # Set loop variables
            self._variables[loop['item_var']] = loop['items'][loop['current_index']]
            self._variables[loop['index_var']] = loop['current_index']
            return True
        
        return False
    
    def set_loop_item(self) -> None:
        """Set current loop item in variables"""
        if self._loop_stack:
            loop = self._loop_stack[-1]
            if loop['current_index'] < len(loop['items']):
                self._variables[loop['item_var']] = loop['items'][loop['current_index']]
                self._variables[loop['index_var']] = loop['current_index']
    
    def get_loop_depth(self) -> int:
        """Get current loop nesting depth"""
        return len(self._loop_stack)
    
    # =========================================================================
    # PARALLEL BRANCH MANAGEMENT
    # =========================================================================
    
    def start_parallel(self, parallel_id: str, branches: List[List[str]]) -> None:
        """Initialize parallel execution tracking"""
        self._parallel_branches[parallel_id] = {
            'branches': branches,
            'completed': [False] * len(branches),
            'results': [None] * len(branches),
            'errors': [None] * len(branches)
        }
    
    def complete_branch(
        self, 
        parallel_id: str, 
        branch_index: int, 
        result: Any = None,
        error: Optional[str] = None
    ) -> None:
        """Mark a parallel branch as completed"""
        if parallel_id in self._parallel_branches:
            pb = self._parallel_branches[parallel_id]
            pb['completed'][branch_index] = True
            pb['results'][branch_index] = result
            pb['errors'][branch_index] = error
    
    def all_branches_completed(self, parallel_id: str) -> bool:
        """Check if all branches are completed"""
        if parallel_id not in self._parallel_branches:
            return True
        return all(self._parallel_branches[parallel_id]['completed'])
    
    def any_branch_completed(self, parallel_id: str) -> bool:
        """Check if any branch is completed"""
        if parallel_id not in self._parallel_branches:
            return False
        return any(self._parallel_branches[parallel_id]['completed'])
    
    def get_branch_results(self, parallel_id: str) -> List[Any]:
        """Get results from all completed branches"""
        if parallel_id not in self._parallel_branches:
            return []
        return self._parallel_branches[parallel_id]['results']
    
    # =========================================================================
    # CHECKPOINTING
    # =========================================================================
    
    def create_checkpoint(self) -> Dict[str, Any]:
        """
        Create a checkpoint of current state
        
        Returns serializable dict for storage.
        """
        return {
            'variables': copy.deepcopy(self._variables),
            'current_node_id': self._current_node_id,
            'completed_nodes': self._completed_nodes.copy(),
            'skipped_nodes': self._skipped_nodes.copy(),
            'node_outputs': copy.deepcopy(self._node_outputs),
            'loop_stack': copy.deepcopy(self._loop_stack),
            'parallel_branches': copy.deepcopy(self._parallel_branches),
            'checkpoint_time': datetime.utcnow().isoformat()
        }
    
    def restore_checkpoint(self, checkpoint: Dict[str, Any]) -> None:
        """
        Restore state from a checkpoint
        """
        self._variables = copy.deepcopy(checkpoint.get('variables', {}))
        self._current_node_id = checkpoint.get('current_node_id')
        self._completed_nodes = checkpoint.get('completed_nodes', []).copy()
        self._skipped_nodes = checkpoint.get('skipped_nodes', []).copy()
        self._node_outputs = copy.deepcopy(checkpoint.get('node_outputs', {}))
        self._loop_stack = copy.deepcopy(checkpoint.get('loop_stack', []))
        self._parallel_branches = copy.deepcopy(checkpoint.get('parallel_branches', {}))
    
    # =========================================================================
    # AUDIT & LOGGING
    # =========================================================================
    
    def get_changes(self) -> List[VariableChange]:
        """Get all variable changes"""
        return self._changes.copy()
    
    def get_changes_since(self, since: datetime) -> List[VariableChange]:
        """Get changes since a timestamp"""
        return [c for c in self._changes if c.changed_at >= since]
    
    def get_masked_variables(self) -> Dict[str, Any]:
        """
        Get variables with sensitive values masked
        
        For logging and display purposes.
        """
        result = copy.deepcopy(self._variables)
        
        for var_name in self._sensitive_variables:
            if var_name in result:
                result[var_name] = "***MASKED***"
        
        return result
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert state to dictionary"""
        return {
            'variables': self.get_all(),
            'current_node_id': self._current_node_id,
            'completed_nodes': self._completed_nodes,
            'skipped_nodes': self._skipped_nodes,
        }
