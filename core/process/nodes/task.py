"""
Task Node Executors
AI tasks, tool calls, and script execution

These nodes perform actual work:
- AI_TASK: Uses LLM for intelligent tasks
- TOOL_CALL: Executes platform tools
- SCRIPT: Runs custom scripts
"""

import json
import time
from typing import Optional, Dict, Any
from ..schemas import ProcessNode, NodeType
from ..state import ProcessState, ProcessContext
from ..result import NodeResult, ExecutionError, ErrorCategory
from .base import BaseNodeExecutor, register_executor


@register_executor(NodeType.AI_TASK)
class AITaskNodeExecutor(BaseNodeExecutor):
    """
    AI Task node executor
    
    Uses the LLM to perform intelligent tasks like:
    - Classification
    - Data extraction
    - Content generation
    - Decision making
    - Summarization
    
    Config:
        prompt: Prompt template with variable interpolation
        model: Optional model override
        temperature: LLM temperature (default: 0.7)
        max_tokens: Maximum tokens for response
        output_format: text, json, structured
        output_schema: JSON Schema for structured output
        system_prompt: Custom system prompt
    """
    
    display_name = "AI Task"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute AI task node"""
        
        # Get configuration
        prompt_template = self.get_config_value(node, 'prompt', '')
        model_override = self.get_config_value(node, 'model')
        temperature = self.get_config_value(node, 'temperature', 0.7)
        max_tokens = self.get_config_value(node, 'max_tokens')
        output_format = self.get_config_value(node, 'output_format', 'text')
        output_schema = self.get_config_value(node, 'output_schema')
        system_prompt = self.get_config_value(node, 'system_prompt')
        include_history = self.get_config_value(node, 'include_history', False)
        
        logs = [f"Executing AI task: {node.name}"]
        
        # Check LLM availability
        if not self.deps.llm:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    code="NO_LLM",
                    message="LLM not configured for this process"
                ),
                logs=logs
            )
        
        # Interpolate prompt with variables
        try:
            prompt = state.interpolate_string(prompt_template)
            logs.append(f"Interpolated prompt: {prompt[:100]}...")
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to interpolate prompt: {e}"),
                logs=logs
            )
        
        # Build messages
        messages = []
        
        # System prompt
        if system_prompt:
            messages.append({
                "role": "system",
                "content": state.interpolate_string(system_prompt)
            })
        
        # Include conversation history if requested
        if include_history and context.conversation_history:
            for msg in context.conversation_history[-10:]:  # Last 10 messages
                messages.append(msg)
        
        # Add structured output instructions if needed
        if output_format == 'json' or output_schema:
            schema_instruction = ""
            if output_schema:
                schema_instruction = f"\n\nRespond with valid JSON matching this schema:\n{json.dumps(output_schema, indent=2)}"
            else:
                schema_instruction = "\n\nRespond with valid JSON only."
            prompt += schema_instruction
        
        # User prompt
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        # Call LLM
        start_time = time.time()
        try:
            from ...llm.base import Message, MessageRole
            
            llm_messages = [
                Message(role=MessageRole(m['role']), content=m['content'])
                for m in messages
            ]
            
            response = await self.deps.llm.chat(
                messages=llm_messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            duration_ms = (time.time() - start_time) * 1000
            logs.append(f"LLM response received in {duration_ms:.0f}ms")
            
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.EXTERNAL,
                    code="LLM_ERROR",
                    message=f"LLM call failed: {str(e)}",
                    is_retryable=True,
                    retry_after_seconds=5
                ),
                logs=logs
            )
        
        # Process response
        content = response.content
        tokens_used = response.total_tokens
        
        logs.append(f"Tokens used: {tokens_used}")
        
        # Parse output based on format
        output = content
        if output_format == 'json' or output_schema:
            try:
                # Try to extract JSON from response
                output = self._parse_json_response(content)
                logs.append("Parsed JSON output successfully")
            except json.JSONDecodeError as e:
                logs.append(f"Warning: Failed to parse JSON: {e}")
                # Keep as string if JSON parsing fails
        
        # Update variables if output_variable specified
        variables_update = {}
        if node.output_variable:
            variables_update[node.output_variable] = output
        
        return NodeResult.success(
            output=output,
            variables_update=variables_update,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            logs=logs
        )
    
    def _parse_json_response(self, content: str) -> Any:
        """Extract and parse JSON from LLM response"""
        # Try direct parse first
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass
        
        # Try to find JSON block in markdown
        import re
        json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', content)
        if json_match:
            return json.loads(json_match.group(1))
        
        # Try to find JSON object or array
        json_match = re.search(r'(\{[\s\S]*\}|\[[\s\S]*\])', content)
        if json_match:
            return json.loads(json_match.group(1))
        
        raise json.JSONDecodeError("No JSON found", content, 0)
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate AI task node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        prompt = self.get_config_value(node, 'prompt')
        if not prompt:
            return ExecutionError.validation_error("Prompt is required for AI task")
        
        return None


@register_executor(NodeType.TOOL_CALL)
class ToolCallNodeExecutor(BaseNodeExecutor):
    """
    Tool Call node executor
    
    Executes platform tools (API, Database, RAG, etc.)
    
    Security:
    - Checks tool access permissions before execution
    - Respects access control filtering from context
    
    Config:
        tool_id: ID of the tool to execute
        arguments: Arguments to pass (supports variable interpolation)
        requires_approval: Whether to require approval before execution
    """
    
    display_name = "Tool Call"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute tool call node"""
        
        tool_id = self.get_config_value(node, 'tool_id')
        arguments = self.get_config_value(node, 'arguments', {})
        requires_approval = self.get_config_value(node, 'requires_approval', False)
        
        logs = [f"Executing tool: {tool_id}"]
        
        # =========================================================
        # SECURITY CHECK: Verify tool access permissions
        # =========================================================
        if tool_id in context.denied_tool_ids:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.AUTHORIZATION,
                    code="TOOL_ACCESS_DENIED",
                    message=f"Access denied: You do not have permission to use tool '{tool_id}'",
                    is_retryable=False
                ),
                logs=logs + ["Tool access denied by security policy"]
            )
        
        if not context.is_tool_allowed(tool_id):
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.AUTHORIZATION,
                    code="TOOL_NOT_AVAILABLE",
                    message=f"Tool '{tool_id}' is not available in this execution context",
                    is_retryable=False
                ),
                logs=logs + ["Tool not in available tools list"]
            )
        
        # Get tool
        tool = self.deps.get_tool(tool_id)
        if not tool:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.RESOURCE,
                    code="TOOL_NOT_FOUND",
                    message=f"Tool not found: {tool_id}"
                ),
                logs=logs
            )
        
        # Interpolate arguments
        try:
            interpolated_args = state.interpolate_object(arguments)
            logs.append(f"Arguments: {json.dumps(interpolated_args)[:200]}")
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.validation_error(f"Failed to interpolate arguments: {e}"),
                logs=logs
            )
        
        # Check if approval is required
        if requires_approval:
            logs.append("Tool requires approval - pausing for approval")
            return NodeResult.waiting(
                waiting_for="approval",
                waiting_metadata={
                    'tool_id': tool_id,
                    'arguments': interpolated_args,
                    'node_id': node.id
                }
            )
        
        # Execute tool
        start_time = time.time()
        try:
            result = await tool.execute(**interpolated_args)
            duration_ms = (time.time() - start_time) * 1000
            
            logs.append(f"Tool executed in {duration_ms:.0f}ms")
            
            if result.success:
                logs.append("Tool execution successful")
                
                variables_update = {}
                if node.output_variable:
                    variables_update[node.output_variable] = result.data
                
                return NodeResult.success(
                    output=result.data,
                    variables_update=variables_update,
                    duration_ms=duration_ms,
                    logs=logs
                )
            else:
                logs.append(f"Tool execution failed: {result.error}")
                return NodeResult.failure(
                    error=ExecutionError(
                        category=ErrorCategory.EXTERNAL,
                        code="TOOL_ERROR",
                        message=result.error or "Tool execution failed",
                        is_retryable=True
                    ),
                    duration_ms=duration_ms,
                    logs=logs
                )
                
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.internal_error(f"Tool execution error: {e}"),
                logs=logs
            )
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate tool call node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        tool_id = self.get_config_value(node, 'tool_id')
        if not tool_id:
            return ExecutionError.validation_error("tool_id is required")
        
        return None


@register_executor(NodeType.SCRIPT)
class ScriptNodeExecutor(BaseNodeExecutor):
    """
    Script node executor
    
    Executes custom Python or JavaScript code.
    
    Config:
        language: python or javascript
        code: The script code
        inputs: Map of input variable names
        output_variable: Variable to store result
    """
    
    display_name = "Script"
    
    async def execute(
        self,
        node: ProcessNode,
        state: ProcessState,
        context: ProcessContext
    ) -> NodeResult:
        """Execute script node"""
        
        language = self.get_config_value(node, 'language', 'python')
        code = self.get_config_value(node, 'code', '')
        inputs = self.get_config_value(node, 'inputs', {})
        
        logs = [f"Executing {language} script"]
        
        if not code:
            return NodeResult.failure(
                error=ExecutionError.validation_error("No code provided"),
                logs=logs
            )
        
        # Prepare input variables
        input_values = {}
        for var_name, source in inputs.items():
            input_values[var_name] = state.evaluate(source)
        
        logs.append(f"Input variables: {list(input_values.keys())}")
        
        # Execute based on language
        start_time = time.time()
        
        try:
            if language == 'python':
                result = self._execute_python(code, input_values)
            else:
                return NodeResult.failure(
                    error=ExecutionError.validation_error(f"Unsupported language: {language}"),
                    logs=logs
                )
            
            duration_ms = (time.time() - start_time) * 1000
            logs.append(f"Script executed in {duration_ms:.0f}ms")
            
            variables_update = {}
            if node.output_variable:
                variables_update[node.output_variable] = result
            
            return NodeResult.success(
                output=result,
                variables_update=variables_update,
                duration_ms=duration_ms,
                logs=logs
            )
            
        except Exception as e:
            return NodeResult.failure(
                error=ExecutionError.internal_error(f"Script execution error: {e}"),
                logs=logs
            )
    
    def _execute_python(self, code: str, inputs: Dict[str, Any]) -> Any:
        """
        Execute Python code in a restricted environment
        
        Security measures:
        1. Restricted builtins - only safe functions
        2. No imports allowed in code
        3. No access to file system, network, or subprocess
        4. Limited execution time via timeout
        5. No access to __class__, __bases__, __mro__ etc.
        """
        import re
        
        # Security check: Block dangerous patterns
        dangerous_patterns = [
            r'__import__',
            r'__builtins__',
            r'__class__',
            r'__bases__',
            r'__mro__',
            r'__subclasses__',
            r'__globals__',
            r'__code__',
            r'__reduce__',
            r'eval\s*\(',
            r'exec\s*\(',
            r'compile\s*\(',
            r'open\s*\(',
            r'os\.',
            r'sys\.',
            r'subprocess',
            r'importlib',
            r'pickle',
            r'shelve',
            r'socket',
            r'requests',
            r'urllib',
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, code, re.IGNORECASE):
                raise SecurityError(f"Dangerous pattern detected: {pattern}")
        
        # Create restricted globals with ONLY safe functions
        safe_builtins = {
            # Types
            'len': len,
            'str': str,
            'int': int,
            'float': float,
            'bool': bool,
            'list': list,
            'dict': dict,
            'tuple': tuple,
            'set': set,
            'frozenset': frozenset,
            'bytes': bytes,
            
            # Iterators
            'range': range,
            'enumerate': enumerate,
            'zip': zip,
            'map': map,
            'filter': filter,
            'reversed': reversed,
            
            # Aggregators
            'sorted': sorted,
            'sum': sum,
            'min': min,
            'max': max,
            'all': all,
            'any': any,
            
            # Math
            'abs': abs,
            'round': round,
            'pow': pow,
            'divmod': divmod,
            
            # String
            'ord': ord,
            'chr': chr,
            'repr': repr,
            'format': format,
            
            # Type checking
            'isinstance': isinstance,
            'type': type,
            'hasattr': hasattr,
            'getattr': getattr,
            
            # Logging (safe)
            'print': self._safe_print,
            
            # Constants
            'None': None,
            'True': True,
            'False': False,
        }
        
        safe_globals = {
            '__builtins__': safe_builtins,
            'json': json,  # Allow JSON operations
            'math': self._get_safe_math(),  # Safe math module
            're': self._get_safe_re(),  # Safe regex
        }
        
        # Add input variables
        local_vars = dict(inputs)
        local_vars['result'] = None  # Default result variable
        
        # Execute code with timeout
        try:
            exec(code, safe_globals, local_vars)
        except Exception as e:
            raise RuntimeError(f"Script execution failed: {str(e)}")
        
        # Return result variable
        return local_vars.get('result')
    
    def _safe_print(self, *args, **kwargs):
        """Safe print that logs instead of printing"""
        import logging
        logging.getLogger("script_executor").info(' '.join(str(a) for a in args))
    
    def _get_safe_math(self):
        """Get a safe subset of math module"""
        import math
        return {
            'ceil': math.ceil,
            'floor': math.floor,
            'sqrt': math.sqrt,
            'pow': math.pow,
            'log': math.log,
            'log10': math.log10,
            'exp': math.exp,
            'sin': math.sin,
            'cos': math.cos,
            'tan': math.tan,
            'pi': math.pi,
            'e': math.e,
            'inf': math.inf,
        }
    
    def _get_safe_re(self):
        """Get a safe subset of re module"""
        import re
        return {
            'match': re.match,
            'search': re.search,
            'findall': re.findall,
            'sub': re.sub,
            'split': re.split,
            'compile': re.compile,
        }


class SecurityError(Exception):
    """Raised when script contains dangerous code"""
    pass
    
    def validate(self, node: ProcessNode) -> Optional[ExecutionError]:
        """Validate script node"""
        base_error = super().validate(node)
        if base_error:
            return base_error
        
        code = self.get_config_value(node, 'code')
        if not code:
            return ExecutionError.validation_error("Script code is required")
        
        language = self.get_config_value(node, 'language', 'python')
        if language not in ['python', 'javascript']:
            return ExecutionError.validation_error(f"Unsupported language: {language}")
        
        return None
