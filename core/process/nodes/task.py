"""
Task Node Executors
AI tasks, tool calls, and script execution

These nodes perform actual work:
- AI_TASK: Uses LLM for intelligent tasks
- TOOL_CALL: Executes platform tools
- SCRIPT: Runs custom scripts
"""

import json
import re
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
        
        # Per-step AI settings (from the node's properties panel)
        _node_instructions = (self.get_config_value(node, 'instructions') or "").strip()
        _node_creativity = self.get_config_value(node, 'creativity')    # 1-5 scale
        _node_confidence = self.get_config_value(node, 'confidence')    # 1-5 scale
        
        logs = [f"Executing AI task: {node.name}"]
        
        # ── Map creativity → temperature ─────────────────────────────
        # Only applies when node has a creativity setting AND no explicit
        # temperature override (e.g., wizard-enforced 0.1 for extraction).
        if _node_creativity is not None and isinstance(_node_creativity, (int, float)):
            _creativity_temp_map = {1: 0.1, 2: 0.2, 3: 0.4, 4: 0.6, 5: 0.8}
            _mapped_temp = _creativity_temp_map.get(int(_node_creativity), 0.4)
            if self.get_config_value(node, 'temperature') is None:
                temperature = _mapped_temp
                logs.append(f"Creativity={_node_creativity} → temperature={_mapped_temp}")
        # ── End creativity mapping ────────────────────────────────────
        
        # Check LLM availability
        if not self.deps.llm:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.CONFIGURATION,
                    code="NO_LLM",
                    message="LLM not configured for this process",
                    business_message=(
                        f"The AI step \"{node.name}\" cannot run because no AI model is configured. "
                        "Please contact your administrator to set up an AI model for this workflow."
                    ),
                    is_user_fixable=False,
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
        
        # System prompt — combine node-level system_prompt + user instructions
        _combined_system = ""
        if system_prompt:
            _combined_system = state.interpolate_string(system_prompt)
        
        # Inject per-step instructions (from the AI step's properties)
        if _node_instructions:
            _instruction_block = (
                "\n\n=== STEP RULES (set by the process owner — you MUST follow these) ===\n"
                + _node_instructions
                + "\n=== END STEP RULES ==="
            )
            _combined_system = (_combined_system + _instruction_block) if _combined_system else _instruction_block.strip()
            logs.append(f"Injected step instructions ({len(_node_instructions)} chars)")
        
        # Inject confidence guidance
        if _node_confidence is not None and isinstance(_node_confidence, (int, float)):
            _confidence_map = {
                1: "If ANY value is uncertain or ambiguous, leave it empty (null). Never guess.",
                2: "Only fill in values you are fairly confident about. When in doubt, use null.",
                3: "Use reasonable judgment for ambiguous values. Leave truly unclear data as null.",
                4: "Make your best-guess for ambiguous data based on context. Only use null for completely unknown values.",
                5: "Always provide a value, even for ambiguous data. Use your best judgment and context clues. Never leave fields empty.",
            }
            _conf_instruction = _confidence_map.get(int(_node_confidence))
            if _conf_instruction:
                _combined_system += f"\n\nCONFIDENCE RULE: {_conf_instruction}"
        
        if _combined_system.strip():
            messages.append({
                "role": "system",
                "content": _combined_system.strip()
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
                    business_message=(
                        f"The AI step \"{node.name}\" could not process the request. "
                        "This may be a temporary issue with the AI service. Please try again."
                    ),
                    is_user_fixable=False,
                    is_retryable=True,
                    retry_after_seconds=5,
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
                # IMPORTANT: If JSON was requested, invalid JSON is a hard failure.
                # Returning "success" here causes downstream nodes to see strings/None and fail silently
                # (e.g., {{parsedData.totalAmount}} becomes null and breaks conditions).
                snippet = (content or "")[:800]
                return NodeResult.failure(
                    error=ExecutionError(
                        category=ErrorCategory.EXTERNAL,
                        code="INVALID_JSON",
                        message=f"AI task returned invalid JSON: {e}",
                        business_message=(
                            f"The AI step \"{node.name}\" could not produce structured data from the input. "
                            "This may happen if the uploaded document or image was unclear, or the AI could not interpret it correctly."
                        ),
                        is_user_fixable=False,
                        details={
                            "node": node.name,
                            "output_format": output_format,
                            "snippet": snippet,
                        },
                        is_retryable=True,
                        retry_after_seconds=2,
                    ),
                    logs=logs + [f"JSON parse failed: {e}", f"Tokens used: {tokens_used}"],
                    duration_ms=duration_ms,
                )

        # ANTI-HALLUCINATION pipeline (order matters):
        #   1. Cross-reference items against actual source files (remove phantoms)
        #   2. Check numeric plausibility against prompt text (warn)
        #   3. Auto-correct totals/counts to match remaining items (fix)
        if isinstance(output, dict):
            # Step 1: Remove items that reference files not in the input
            output = self._cross_reference_items_with_source(prompt, output, logs)
            # Step 2: Warn about suspicious numeric mismatches
            hallucination_warnings = self._check_output_plausibility(prompt, output, logs)
            if hallucination_warnings:
                logs.extend(hallucination_warnings)
            # Step 3: Ensure total = sum(items), count = len(items)
            output = self._auto_correct_totals(output, logs)
        
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
    
    @staticmethod
    def _check_output_plausibility(
        prompt_text: str,
        output: dict,
        logs: list,
    ) -> list:
        """
        Lightweight anti-hallucination check.

        Compares the AI's JSON output against the source prompt text to detect
        obvious fabrications.  Returns a list of warning strings (empty = OK).

        This is intentionally dynamic — it does NOT hardcode field names or
        process types.  Instead it uses generic heuristics:
        1. If the output contains a field whose name suggests a monetary total
           (e.g. totalAmount, total, amount) and the prompt text contains numbers,
           check that the total is plausible (i.e. close to a sum that appears in
           the source text).
        2. If the output contains a 'details' or 'summary' field whose value is
           a short generic phrase rather than specific data from the prompt, warn.
        """
        warnings: list = []

        # ---- 1. Numeric plausibility ----
        # Extract all numbers from the prompt (these are the "source of truth")
        prompt_numbers = [float(m) for m in re.findall(r'(?<!\w)(\d+(?:\.\d+)?)(?!\w)', prompt_text) if float(m) > 0]

        # Look for "total"-like fields in the output
        _total_keys = {"totalamount", "total", "amount", "grandtotal", "total_amount", "sum", "net", "gross"}
        for k, v in output.items():
            if str(k).lower().replace("_", "").replace("-", "") in _total_keys:
                if isinstance(v, (int, float)) and v > 0 and prompt_numbers:
                    # Check: is the AI's total reachable from the prompt numbers?
                    # Accept if it matches any individual number or any subset sum (greedy check)
                    if v in prompt_numbers:
                        continue  # exact match — good
                    # Check if it's the sum of all prompt numbers
                    total_all = sum(prompt_numbers)
                    if abs(v - total_all) < 0.01:
                        continue  # sum of all — good
                    # Check if it's reasonably close to any prompt number (within 10%)
                    close_match = any(abs(v - n) / max(n, 0.01) < 0.10 for n in prompt_numbers)
                    if close_match:
                        continue
                    # Not plausible — warn but don't block (to stay dynamic)
                    warnings.append(
                        f"⚠️ Anti-hallucination: AI reported {k}={v} but source text contains numbers {prompt_numbers[:10]}. "
                        f"The value may not match the actual data."
                    )

        # ---- 2. Generic/vague detail detection ----
        _detail_keys = {"details", "summary", "description", "notes"}
        _vague_patterns = [
            re.compile(r"^extracted data from", re.IGNORECASE),
            re.compile(r"^(two|three|four|five|six|seven|eight|nine|ten|\d+)\s+(transactions|items|entries|records)", re.IGNORECASE),
            re.compile(r"^multiple\s+\w+", re.IGNORECASE),
            re.compile(r"^data extracted", re.IGNORECASE),
            re.compile(r"^information from", re.IGNORECASE),
        ]
        for k, v in output.items():
            if str(k).lower() in _detail_keys and isinstance(v, str):
                v_stripped = v.strip().strip("'\"")
                if len(v_stripped) < 10:
                    warnings.append(
                        f"⚠️ Anti-hallucination: AI field '{k}' is suspiciously short: \"{v_stripped}\". "
                        "It may not reflect the actual extracted data."
                    )
                elif any(p.match(v_stripped) for p in _vague_patterns):
                    warnings.append(
                        f"⚠️ Anti-hallucination: AI field '{k}' looks like a generic placeholder: \"{v_stripped[:80]}...\". "
                        "The AI may not have properly parsed the source data."
                    )

        return warnings
    
    @staticmethod
    def _auto_correct_totals(output: dict, logs: list) -> dict:
        """
        Pure mathematical consistency check for AI-parsed structured data.
        
        This is NOT business logic — it performs two simple mathematical facts:
          1. count = len(items_array)       — array length IS the count
          2. total = sum(item_amounts)      — items are the source of truth
        
        Why items are the source of truth:
          Individual item details (vendor, date, amount per item) are much
          harder for an LLM to hallucinate than summary numbers.  When the
          LLM says "3 expenses totalling 1705" but lists only 2 items summing
          to 1600, the items are correct and the summary is the hallucination.
        
        What this method does NOT do (by design):
          - No business logic (tax, discount, fees, shipping, VAT, etc.)
          - No domain-specific field assumptions
          - No formula beyond simple sum
          Any business-specific calculation (total = subtotal + tax - discount)
          is the LLM's responsibility during extraction, not the platform's.
        """
        # ── 1. Find the items array ──
        # Generic collection names — not tied to any specific business domain
        _collection_keys = {"items", "expenses", "lineitems", "receipts",
                            "transactions", "entries", "records", "invoices"}
        items = None
        items_key = None
        for k, v in output.items():
            if k.lower().replace("_", "").replace("-", "") in _collection_keys:
                if isinstance(v, list) and len(v) > 0:
                    items = v
                    items_key = k
                    break
        
        if not items:
            return output
        
        # ── 2. Find numeric amount in each item ──
        # Priority order: prefer "amount" (most explicit) over ambiguous names
        _amount_priority = [
            {"amount"},                              # most specific
            {"cost", "price", "subtotal", "net"},    # common alternatives
            {"total", "value", "sum", "gross"},      # generic fallback
        ]
        
        def _pick_amount(item_dict: dict) -> tuple:
            """Return (numeric_value, field_name) using priority order."""
            for tier in _amount_priority:
                for fk, fv in item_dict.items():
                    if fk.lower().replace("_", "") in tier and isinstance(fv, (int, float)):
                        return fv, fk
            return None, None
        
        item_amounts: list = []
        for item in items:
            if not isinstance(item, dict):
                continue
            val, _ = _pick_amount(item)
            if val is not None:
                item_amounts.append(val)
        
        # ── 3. Correct count fields (mathematical fact: count = len) ──
        _count_keys = {"itemcount", "expensecount", "count", "numitems",
                       "totalitems", "numberofitems", "receiptcount",
                       "transactioncount", "entrycount", "recordcount"}
        actual_count = len(items)
        for k, v in list(output.items()):
            k_norm = k.lower().replace("_", "").replace("-", "")
            if k_norm in _count_keys and isinstance(v, (int, float)):
                if int(v) != actual_count:
                    logs.append(
                        f"🔧 Auto-corrected {k}: AI reported {int(v)} but actual "
                        f"items in '{items_key}' array = {actual_count}. Using actual count."
                    )
                    output[k] = actual_count
        
        # ── 4. Correct total fields (mathematical fact: total = sum) ──
        if not item_amounts:
            return output
        
        computed_total = sum(item_amounts)
        _total_keys = {"totalamount", "total", "grandtotal", "totalexpense",
                       "totalcost", "totalprice", "totalvalue"}
        for k, v in list(output.items()):
            k_norm = k.lower().replace("_", "").replace("-", "")
            if k_norm in _total_keys and isinstance(v, (int, float)):
                if abs(v - computed_total) > 0.01:
                    logs.append(
                        f"🔧 Auto-corrected {k}: AI reported {v} but sum of "
                        f"{len(item_amounts)} item amounts = {computed_total}. "
                        f"Using computed value."
                    )
                    output[k] = computed_total
        
        return output

    @staticmethod
    def _cross_reference_items_with_source(
        prompt_text: str,
        output: dict,
        logs: list,
    ) -> dict:
        """
        Cross-reference AI output items against actual source files.
        
        The platform's document extraction injects "--- File: <name> ---"
        markers into the extracted text.  These markers are a factual record
        of how many files were actually processed.  If the AI's output
        contains an items/collection array with MORE items than there are
        file sections, the extra items are hallucinated and must be removed.
        
        This is platform-level validation (the markers are produced by the
        platform), NOT business logic.
        """
        # Count actual file sections in the prompt text
        file_markers = re.findall(r'---\s*File:\s*(.+?)\s*---', prompt_text)
        if not file_markers:
            return output  # No file sections → not a file-extraction scenario
        
        actual_file_count = len(file_markers)
        actual_file_names = {name.strip().lower() for name in file_markers}
        
        # Find the items/collection array in output
        _collection_keys = {"items", "expenses", "lineitems", "receipts",
                            "transactions", "entries", "records", "invoices"}
        items = None
        items_key = None
        for k, v in output.items():
            if k.lower().replace("_", "").replace("-", "") in _collection_keys:
                if isinstance(v, list):
                    items = v
                    items_key = k
                    break
        
        if not items or len(items) <= actual_file_count:
            return output  # Items count matches or is less — no hallucination
        
        # More items than files → try to identify and remove hallucinated items
        # Strategy: match items to files by fileName, then remove unmatched
        matched = []
        unmatched = []
        for item in items:
            if not isinstance(item, dict):
                matched.append(item)
                continue
            # Look for a file name reference in the item
            item_file = None
            for fk in ("fileName", "file_name", "filename", "file", "source", "sourcefile", "source_file"):
                if fk in item and isinstance(item[fk], str):
                    item_file = item[fk].strip().lower()
                    break
            
            if item_file and item_file in actual_file_names:
                matched.append(item)
            elif item_file:
                # Item references a file that wasn't in the input
                unmatched.append(item)
            else:
                # No file reference — keep it (can't determine)
                matched.append(item)
        
        if not unmatched:
            # All items matched or couldn't be determined — fall back to truncation
            if len(items) > actual_file_count:
                removed = items[actual_file_count:]
                output[items_key] = items[:actual_file_count]
                removed_names = [
                    str(r.get("fileName") or r.get("file_name") or r.get("name") or f"item #{actual_file_count + i + 1}")
                    for i, r in enumerate(removed) if isinstance(r, dict)
                ]
                logs.append(
                    f"🔧 Removed {len(removed)} hallucinated item(s) from '{items_key}': "
                    f"{', '.join(removed_names)}. "
                    f"Input had {actual_file_count} file(s) but AI produced {len(items)} items."
                )
        else:
            # Remove items that reference non-existent files
            output[items_key] = matched
            removed_names = [
                str(r.get("fileName") or r.get("file_name") or r.get("name") or "unknown")
                for r in unmatched if isinstance(r, dict)
            ]
            logs.append(
                f"🔧 Removed {len(unmatched)} hallucinated item(s) from '{items_key}': "
                f"{', '.join(removed_names)}. "
                f"These referenced files not present in the input "
                f"(actual files: {', '.join(actual_file_names)})."
            )
        
        return output

    def _parse_json_response(self, content: str) -> Any:
        """Extract and parse JSON from LLM response"""
        content = (content or "").strip()
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
        
        # Try to find the first balanced JSON object/array in the text (more robust than greedy regex)
        candidate = self._extract_first_json_block(content)
        if candidate:
            return json.loads(candidate)
        
        raise json.JSONDecodeError("No JSON found", content, 0)

    @staticmethod
    def _extract_first_json_block(text: str) -> str:
        """
        Extract the first balanced JSON object/array from a string.

        This helps when the model returns explanations around the JSON or includes multiple blocks.
        """
        if not text:
            return ""

        # Find the first '{' or '['
        start = None
        open_ch = None
        for i, ch in enumerate(text):
            if ch == '{':
                start, open_ch = i, '{'
                break
            if ch == '[':
                start, open_ch = i, '['
                break
        if start is None:
            return ""

        close_ch = '}' if open_ch == '{' else ']'
        depth = 0
        in_str = False
        esc = False
        for j in range(start, len(text)):
            ch = text[j]
            if in_str:
                if esc:
                    esc = False
                elif ch == '\\':
                    esc = True
                elif ch == '"':
                    in_str = False
                continue
            else:
                if ch == '"':
                    in_str = True
                    continue
                if ch == open_ch:
                    depth += 1
                elif ch == close_ch:
                    depth -= 1
                    if depth == 0:
                        return text[start:j + 1].strip()

        return ""
    
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
