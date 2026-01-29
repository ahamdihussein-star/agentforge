"""
Data Node Executors
Data transformation, validation, filtering, and mapping

These nodes manipulate data:
- TRANSFORM: General data transformation
- VALIDATE: Data validation
- FILTER: Filter arrays
- MAP: Transform array items
- AGGREGATE: Aggregate data
"""

import json
import re
from typing import Optional, Dict, Any, List
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ErrorCategory
from .base import BaseNodeExecutor, register_executor


@register_executor(NodeType.TRANSFORM)
class TransformNodeExecutor(BaseNodeExecutor):
    """
    Transform node executor
    
    Performs data transformation using various strategies.
    
    Config:
        transform_type: map, filter, aggregate, script, jq
        input_expression: Expression to get input data
        mapping: Field mapping for map transform
        filter_expression: Expression for filter transform
        script_language: python or javascript
        script: Transform script
        jq_expression: JQ-like expression
    """
    
    display_name = "Transform"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute transform node"""
        
        transform_type = self.get_config_value(node, 'transform_type', 'map')
        input_expr = self.get_config_value(node, 'input_expression')
        mapping = self.get_config_value(node, 'mapping', {})
        
        logs = [f"Executing {transform_type} transform"]
        
        # Get input data
        if input_expr:
            try:
                input_data = state.evaluate(input_expr)
            except Exception as e:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Failed to get input: {e}"),
                    logs=logs
                )
        else:
            # Use all variables as input
            input_data = state.get_all()
        
        logs.append(f"Input type: {type(input_data).__name__}")
        
        # Execute transform based on type
        try:
            if transform_type == 'map':
                result = self._transform_map(input_data, mapping, state)
            elif transform_type == 'rename':
                result = self._transform_rename(input_data, mapping)
            elif transform_type == 'pick':
                fields = self.get_config_value(node, 'fields', [])
                result = self._transform_pick(input_data, fields)
            elif transform_type == 'omit':
                fields = self.get_config_value(node, 'fields', [])
                result = self._transform_omit(input_data, fields)
            elif transform_type == 'flatten':
                result = self._transform_flatten(input_data)
            elif transform_type == 'merge':
                sources = self.get_config_value(node, 'sources', [])
                result = self._transform_merge(sources, state)
            elif transform_type == 'script':
                script = self.get_config_value(node, 'script', '')
                result = self._transform_script(input_data, script)
            else:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Unknown transform type: {transform_type}"),
                    logs=logs
                )
            
            logs.append(f"Transform complete, output type: {type(result).__name__}")
            
            variables_update = {}
            if node.output_variable:
                variables_update[node.output_variable] = result
            
            return NodeResult.success(
                output=result,
                variables_update=variables_update,
                logs=logs
            )
            
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.internal_error(f"Transform failed: {e}"),
                logs=logs
            )
    
    def _transform_map(self, data: Any, mapping: Dict[str, str], state: ProcessState) -> Dict:
        """Map transform - create new object from mapping"""
        result = {}
        for target_key, source_expr in mapping.items():
            if isinstance(source_expr, str) and '{{' in source_expr:
                result[target_key] = state.evaluate(source_expr)
            elif isinstance(data, dict) and source_expr in data:
                result[target_key] = data[source_expr]
            else:
                result[target_key] = state.evaluate(source_expr) if isinstance(source_expr, str) else source_expr
        return result
    
    def _transform_rename(self, data: Dict, mapping: Dict[str, str]) -> Dict:
        """Rename keys in an object"""
        if not isinstance(data, dict):
            return data
        
        result = {}
        for key, value in data.items():
            new_key = mapping.get(key, key)
            result[new_key] = value
        return result
    
    def _transform_pick(self, data: Dict, fields: List[str]) -> Dict:
        """Pick specific fields from an object"""
        if not isinstance(data, dict):
            return data
        
        return {k: v for k, v in data.items() if k in fields}
    
    def _transform_omit(self, data: Dict, fields: List[str]) -> Dict:
        """Omit specific fields from an object"""
        if not isinstance(data, dict):
            return data
        
        return {k: v for k, v in data.items() if k not in fields}
    
    def _transform_flatten(self, data: Any) -> Any:
        """Flatten nested structure"""
        if isinstance(data, list):
            result = []
            for item in data:
                if isinstance(item, list):
                    result.extend(item)
                else:
                    result.append(item)
            return result
        return data
    
    def _transform_merge(self, sources: List[str], state: ProcessState) -> Dict:
        """Merge multiple sources into one object"""
        result = {}
        for source in sources:
            value = state.evaluate(source)
            if isinstance(value, dict):
                result.update(value)
        return result
    
    def _transform_script(self, data: Any, script: str) -> Any:
        """Execute transform script"""
        # Create safe execution environment
        safe_globals = {
            '__builtins__': {
                'len': len, 'str': str, 'int': int, 'float': float,
                'bool': bool, 'list': list, 'dict': dict, 'tuple': tuple,
                'set': set, 'range': range, 'enumerate': enumerate,
                'zip': zip, 'map': map, 'filter': filter, 'sorted': sorted,
                'sum': sum, 'min': min, 'max': max, 'abs': abs, 'round': round,
                'isinstance': isinstance, 'type': type,
                'None': None, 'True': True, 'False': False,
            },
            'json': json,
            're': re,
        }
        
        local_vars = {'data': data, 'result': None}
        exec(script, safe_globals, local_vars)
        return local_vars.get('result', data)


@register_executor(NodeType.VALIDATE)
class ValidateNodeExecutor(BaseNodeExecutor):
    """
    Validate node executor
    
    Validates data against rules or schema.
    
    Config:
        input_expression: Expression to get input data
        validation_type: schema, rules, expression
        schema: JSON Schema for validation
        rules: List of validation rules
        expression: Boolean expression
        fail_on_invalid: Whether to fail or just return validation result
    """
    
    display_name = "Validate"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute validate node"""
        
        input_expr = self.get_config_value(node, 'input_expression')
        validation_type = self.get_config_value(node, 'validation_type', 'rules')
        schema = self.get_config_value(node, 'schema')
        rules = self.get_config_value(node, 'rules', [])
        expression = self.get_config_value(node, 'expression')
        fail_on_invalid = self.get_config_value(node, 'fail_on_invalid', False)
        
        logs = [f"Validating with {validation_type}"]
        
        # Get input data
        if input_expr:
            data = state.evaluate(input_expr)
        else:
            data = state.get_all()
        
        logs.append(f"Validating: {type(data).__name__}")
        
        # Run validation
        is_valid = True
        errors = []
        
        try:
            if validation_type == 'rules':
                is_valid, errors = self._validate_rules(data, rules, state)
            elif validation_type == 'expression':
                is_valid = state.evaluate_condition(expression)
                if not is_valid:
                    errors.append({'message': 'Expression evaluated to false'})
            elif validation_type == 'schema':
                is_valid, errors = self._validate_schema(data, schema)
            else:
                errors.append({'message': f'Unknown validation type: {validation_type}'})
                is_valid = False
                
        except Exception as e:
            is_valid = False
            errors.append({'message': f'Validation error: {e}'})
        
        logs.append(f"Valid: {is_valid}, Errors: {len(errors)}")
        
        # Build result
        validation_result = {
            'is_valid': is_valid,
            'errors': errors,
            'data': data
        }
        
        variables_update = {}
        if node.output_variable:
            variables_update[node.output_variable] = validation_result
        
        # Check if we should fail
        if not is_valid and fail_on_invalid:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.VALIDATION,
                    code="VALIDATION_FAILED",
                    message=f"Validation failed with {len(errors)} error(s)",
                    details={'errors': errors}
                ),
                logs=logs
            )
        
        return NodeResult.success(
            output=validation_result,
            variables_update=variables_update,
            logs=logs
        )
    
    def _validate_rules(
        self, 
        data: Any, 
        rules: List[Dict], 
        state: ProcessState
    ) -> tuple:
        """Validate using rule definitions"""
        errors = []
        
        for rule in rules:
            field = rule.get('field')
            rule_type = rule.get('type', 'required')
            message = rule.get('message')
            
            # Get field value
            value = None
            if field:
                if isinstance(data, dict):
                    value = data.get(field)
                else:
                    value = getattr(data, field, None)
            else:
                value = data
            
            # Apply rule
            valid = True
            
            if rule_type == 'required':
                valid = value is not None and value != ''
            elif rule_type == 'not_empty':
                valid = bool(value) if value is not None else False
            elif rule_type == 'min_length':
                min_len = rule.get('value', 0)
                valid = len(str(value)) >= min_len if value else False
            elif rule_type == 'max_length':
                max_len = rule.get('value', 0)
                valid = len(str(value)) <= max_len if value else True
            elif rule_type == 'min':
                min_val = rule.get('value', 0)
                valid = float(value) >= min_val if value is not None else False
            elif rule_type == 'max':
                max_val = rule.get('value', 0)
                valid = float(value) <= max_val if value is not None else True
            elif rule_type == 'pattern':
                pattern = rule.get('value', '')
                valid = bool(re.match(pattern, str(value))) if value else False
            elif rule_type == 'email':
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                valid = bool(re.match(email_pattern, str(value))) if value else False
            elif rule_type == 'in':
                allowed = rule.get('value', [])
                valid = value in allowed
            elif rule_type == 'expression':
                expr = rule.get('value', '')
                # Temporarily set the field value for expression evaluation
                state.set(f'_validate_value', value, changed_by='validation')
                valid = state.evaluate_condition(expr.replace('{{value}}', '{{_validate_value}}'))
            
            if not valid:
                errors.append({
                    'field': field,
                    'rule': rule_type,
                    'message': message or f"Validation failed for {field or 'value'}: {rule_type}"
                })
        
        return (len(errors) == 0, errors)
    
    def _validate_schema(self, data: Any, schema: Dict) -> tuple:
        """Validate using JSON Schema"""
        errors = []
        
        try:
            import jsonschema
            jsonschema.validate(data, schema)
        except ImportError:
            # jsonschema not installed - do basic validation
            errors.append({'message': 'jsonschema library not installed'})
        except Exception as e:
            errors.append({'message': str(e)})
        
        return (len(errors) == 0, errors)


@register_executor(NodeType.FILTER)
class FilterNodeExecutor(BaseNodeExecutor):
    """
    Filter node executor
    
    Filters array items based on condition.
    
    Config:
        input_expression: Expression to get input array
        filter_expression: Condition for each item (uses {{item}})
        item_variable: Variable name for current item (default: item)
    """
    
    display_name = "Filter"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute filter node"""
        
        input_expr = self.get_config_value(node, 'input_expression')
        filter_expr = self.get_config_value(node, 'filter_expression', 'true')
        item_var = self.get_config_value(node, 'item_variable', 'item')
        
        logs = [f"Filtering with expression: {filter_expr}"]
        
        # Get input array
        try:
            input_data = state.evaluate(input_expr) if input_expr else []
            if not isinstance(input_data, list):
                input_data = list(input_data) if input_data else []
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to get input: {e}"),
                logs=logs
            )
        
        logs.append(f"Input items: {len(input_data)}")
        
        # Filter items
        result = []
        for i, item in enumerate(input_data):
            # Set item in state temporarily
            state.set(item_var, item, changed_by=node.id)
            state.set('index', i, changed_by=node.id)
            
            try:
                if state.evaluate_condition(filter_expr):
                    result.append(item)
            except Exception as e:
                logs.append(f"Warning: Filter failed for item {i}: {e}")
        
        # Clean up temporary variables
        state.delete(item_var, changed_by=node.id)
        state.delete('index', changed_by=node.id)
        
        logs.append(f"Output items: {len(result)}")
        
        variables_update = {}
        if node.output_variable:
            variables_update[node.output_variable] = result
        
        return NodeResult.success(
            output=result,
            variables_update=variables_update,
            logs=logs
        )


@register_executor(NodeType.MAP)
class MapNodeExecutor(BaseNodeExecutor):
    """
    Map node executor
    
    Transforms each item in an array.
    
    Config:
        input_expression: Expression to get input array
        mapping: Transformation mapping for each item
        item_variable: Variable name for current item
    """
    
    display_name = "Map"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute map node"""
        
        input_expr = self.get_config_value(node, 'input_expression')
        mapping = self.get_config_value(node, 'mapping', {})
        item_var = self.get_config_value(node, 'item_variable', 'item')
        
        logs = ["Mapping array items"]
        
        # Get input array
        try:
            input_data = state.evaluate(input_expr) if input_expr else []
            if not isinstance(input_data, list):
                input_data = list(input_data) if input_data else []
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to get input: {e}"),
                logs=logs
            )
        
        logs.append(f"Input items: {len(input_data)}")
        
        # Map items
        result = []
        for i, item in enumerate(input_data):
            # Set item in state temporarily
            state.set(item_var, item, changed_by=node.id)
            state.set('index', i, changed_by=node.id)
            
            try:
                if mapping:
                    # Apply mapping
                    mapped_item = {}
                    for target_key, source_expr in mapping.items():
                        mapped_item[target_key] = state.evaluate(source_expr)
                    result.append(mapped_item)
                else:
                    # Just pass through if no mapping
                    result.append(item)
            except Exception as e:
                logs.append(f"Warning: Map failed for item {i}: {e}")
                result.append(item)  # Keep original on error
        
        # Clean up
        state.delete(item_var, changed_by=node.id)
        state.delete('index', changed_by=node.id)
        
        logs.append(f"Mapped {len(result)} items")
        
        variables_update = {}
        if node.output_variable:
            variables_update[node.output_variable] = result
        
        return NodeResult.success(
            output=result,
            variables_update=variables_update,
            logs=logs
        )


@register_executor(NodeType.AGGREGATE)
class AggregateNodeExecutor(BaseNodeExecutor):
    """
    Aggregate node executor
    
    Aggregates data using various functions.
    
    Config:
        input_expression: Expression to get input data
        operation: count, sum, avg, min, max, first, last, group_by
        field: Field to aggregate (for arrays of objects)
        group_by: Field to group by
    """
    
    display_name = "Aggregate"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute aggregate node"""
        
        input_expr = self.get_config_value(node, 'input_expression')
        operation = self.get_config_value(node, 'operation', 'count')
        field = self.get_config_value(node, 'field')
        group_by = self.get_config_value(node, 'group_by')
        
        logs = [f"Aggregating with {operation}"]
        
        # Get input data
        try:
            data = state.evaluate(input_expr) if input_expr else []
            if not isinstance(data, list):
                data = [data] if data else []
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to get input: {e}"),
                logs=logs
            )
        
        logs.append(f"Input items: {len(data)}")
        
        # Get values to aggregate
        if field and all(isinstance(item, dict) for item in data):
            values = [item.get(field) for item in data if item.get(field) is not None]
        else:
            values = data
        
        # Apply aggregation
        result = None
        
        if operation == 'count':
            result = len(values)
        elif operation == 'sum':
            result = sum(float(v) for v in values if v is not None)
        elif operation == 'avg':
            if values:
                result = sum(float(v) for v in values if v is not None) / len(values)
            else:
                result = 0
        elif operation == 'min':
            result = min(values) if values else None
        elif operation == 'max':
            result = max(values) if values else None
        elif operation == 'first':
            result = values[0] if values else None
        elif operation == 'last':
            result = values[-1] if values else None
        elif operation == 'group_by' and group_by:
            result = {}
            for item in data:
                if isinstance(item, dict):
                    key = str(item.get(group_by, 'unknown'))
                    if key not in result:
                        result[key] = []
                    result[key].append(item)
        else:
            result = values
        
        logs.append(f"Result: {result}")
        
        variables_update = {}
        if node.output_variable:
            variables_update[node.output_variable] = result
        
        return NodeResult.success(
            output=result,
            variables_update=variables_update,
            logs=logs
        )
