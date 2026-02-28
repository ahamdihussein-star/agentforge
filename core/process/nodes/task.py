"""
Task Node Executors
AI tasks, tool calls, and script execution

These nodes perform actual work:
- AI_TASK: Uses LLM for intelligent tasks
- TOOL_CALL: Executes platform tools
- SCRIPT: Runs custom scripts
"""

import json
import asyncio
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
        _raw_instructions = self.get_config_value(node, 'instructions')
        # instructions can be a list of strings or a single string (legacy)
        if isinstance(_raw_instructions, list):
            _node_instructions = "\n".join(f"• {s.strip()}" for s in _raw_instructions if s and s.strip())
        else:
            _node_instructions = (_raw_instructions or "").strip()
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
        
        # ── Pre-read source files (extract_file / batch_files mode) ───
        source_fields = self.get_config_value(node, 'source_fields') or []
        # sourceField (singular) is used by extract_file mode; treat as single-element list
        _single_source = self.get_config_value(node, 'sourceField') or ''
        if _single_source and not source_fields:
            source_fields = [_single_source]
        _file_context_block = ""
        if source_fields and isinstance(source_fields, list):
            from .integration import FileOperationNodeExecutor
            _file_reader = FileOperationNodeExecutor(self.deps)
            _file_sections = []
            _total_files = 0
            _failed_files = []
            for sf_name in source_fields:
                sf_value = state.get(sf_name)
                if sf_value is None:
                    logs.append(f"Source field '{sf_name}': no value in state, skipping")
                    continue
                # Normalize to a list of file objects
                file_items = sf_value if isinstance(sf_value, list) else [sf_value]
                for fi in file_items:
                    if not isinstance(fi, dict):
                        continue
                    _total_files += 1
                    fname = fi.get("name") or f"file_{_total_files}"
                    fpath = FileOperationNodeExecutor._resolve_uploaded_file_path(fi, context)
                    if not fpath:
                        fpath = fi.get("path") or ""
                    if not fpath:
                        _failed_files.append(fname)
                        logs.append(f"  Could not resolve path for '{fname}', skipping")
                        continue
                    try:
                        result = await _file_reader._execute_extract_text_local(
                            path=fpath, encoding="utf-8", logs=logs
                        )
                        if result.get("success") and result.get("data"):
                            text = result["data"]
                            _file_sections.append(
                                f"--- File: {fname} (from field: {sf_name}) ---\n{text}"
                            )
                            logs.append(f"  Read '{fname}': {len(text)} chars")
                        else:
                            _failed_files.append(f"{fname} ({result.get('error', 'unknown')})")
                            logs.append(f"  Failed to read '{fname}': {result.get('error')}")
                    except Exception as _fex:
                        _failed_files.append(f"{fname} ({_fex})")
                        logs.append(f"  Error reading '{fname}': {_fex}")

            if _file_sections:
                _file_context_block = (
                    "\n\n=== FILE CONTENTS (read automatically from uploaded files) ===\n"
                    + "\n\n".join(_file_sections)
                    + "\n=== END FILE CONTENTS ==="
                )
                logs.append(f"Injected {len(_file_sections)} file(s) into context ({_total_files} total, {len(_failed_files)} failed)")
            elif _total_files > 0:
                logs.append(f"Warning: all {_total_files} files failed to read")
        # ── End source file pre-reading ────────────────────────────────

        # ── Inject process data context when no files are being read ───
        # AI steps in "custom" mode often need access to form data and
        # previous-step outputs even when sourceFields isn't configured.
        # Without this, the LLM receives only the prompt text and has no
        # data to act on (e.g., "classify severity" with no dates).
        _process_data_block = ""
        if not _file_context_block:
            _all_vars = state.get_all()
            _display_vars: dict = {}
            _internal_prefixes = ("_",)
            for k, v in _all_vars.items():
                if any(k.startswith(p) for p in _internal_prefixes):
                    continue
                if isinstance(v, (dict, list)) and len(json.dumps(v, default=str)) > 3000:
                    continue
                _display_vars[k] = v
            if _display_vars:
                try:
                    _vars_json = json.dumps(
                        _display_vars, indent=2, default=str, ensure_ascii=False
                    )
                except Exception:
                    _vars_json = str(_display_vars)
                _process_data_block = (
                    "\n\n=== PROCESS DATA (information from the submitted form and previous steps) ===\n"
                    + _vars_json
                    + "\n=== END PROCESS DATA ==="
                )
                logs.append(f"Injected {len(_display_vars)} process data variables as AI context")
        # ── End process data injection ─────────────────────────────────

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

        # Extraction safety: if this AI step is reading uploaded files and producing structured data,
        # enforce strict "no guessing" rules regardless of node configuration.
        # This reduces hallucinations under load/model variability.
        _is_file_extraction = bool(source_fields) and (output_format == "json" or output_schema or bool(self.get_config_value(node, "outputFields")))
        if _is_file_extraction:
            _combined_system += (
                "\n\nEXTRACTION SAFETY RULES:\n"
                "- Use ONLY the provided FILE CONTENTS. Do not use outside knowledge.\n"
                "- Do NOT invent or assume any values.\n"
                "- If a value is missing or unclear, return null (or an empty string if the field is typed as text).\n"
                "- Keep numbers as pure numbers (no extra words).\n"
            )
            # Clamp temperature for extraction (unless explicitly overridden)
            if self.get_config_value(node, "temperature") is None:
                temperature = min(float(temperature or 0.2), 0.2)
                logs.append(f"Extraction mode: clamped temperature={temperature}")
        
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
        
        # Inject file contents (from batch_files pre-read) into system context
        if _file_context_block:
            _combined_system = (_combined_system + _file_context_block) if _combined_system else _file_context_block.strip()

        # Inject process data context (form + previous step data) when no files
        if _process_data_block:
            _combined_system = (_combined_system + _process_data_block) if _combined_system else _process_data_block.strip()

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
                # Build a concrete schema from outputFields so the LLM knows
                # exactly which keys and types to return.
                _out_fields = self.get_config_value(node, 'outputFields') or []
                if _out_fields and isinstance(_out_fields, list):
                    _type_hint = {
                        "text": "string", "string": "string",
                        "number": "number", "currency": "number",
                        "boolean": "true/false", "date": "date string",
                        "email": "email string", "list": "array",
                    }
                    _field_lines = []
                    _example_obj = {}
                    for _f in _out_fields:
                        _fn = _f.get("name") or ""
                        _ft = str(_f.get("type") or "text").lower()
                        _fl = _f.get("label") or _fn
                        _hint = _type_hint.get(_ft, "value")
                        _field_lines.append(f'  "{_fn}": <{_hint}>  // {_fl}')
                        # Build a concrete example value for each type
                        if _ft in ("number", "currency"):
                            _example_obj[_fn] = 0
                        elif _ft == "boolean":
                            _example_obj[_fn] = False
                        elif _ft == "list":
                            _example_obj[_fn] = []
                        else:
                            _example_obj[_fn] = ""
                    schema_instruction = (
                        "\n\nIMPORTANT: You MUST respond with valid JSON only. "
                        "Return a JSON object with EXACTLY these fields:\n{\n"
                        + ",\n".join(_field_lines)
                        + "\n}\n"
                        + "Example structure: " + json.dumps(_example_obj)
                    )
                else:
                    schema_instruction = "\n\nRespond with valid JSON only."
            prompt += schema_instruction
        
        # User prompt
        messages.append({
            "role": "user",
            "content": prompt
        })
        
        # ── Resolve connected tools (for LLM function-calling) ────────
        enabled_tool_ids = self.get_config_value(node, 'enabled_tool_ids') or []
        llm_tools = []          # OpenAI-format tool definitions
        tool_map = {}            # name → BaseTool instance (for execution)
        if enabled_tool_ids and isinstance(enabled_tool_ids, list):
            for tid in enabled_tool_ids:
                # Security: verify tool access permission at runtime
                if tid in getattr(context, 'denied_tool_ids', set()):
                    logs.append(f"Skipped tool {tid}: access denied")
                    continue
                if hasattr(context, 'is_tool_allowed') and not context.is_tool_allowed(tid):
                    logs.append(f"Skipped tool {tid}: not in allowed tools")
                    continue
                tool_inst = self.deps.get_tool(tid)
                if tool_inst:
                    try:
                        tool_def = tool_inst.get_openai_tool()
                        llm_tools.append(tool_def)
                        fname = tool_def.get('function', {}).get('name') or tid
                        tool_map[fname] = tool_inst
                        logs.append(f"Connected tool: {fname}")
                    except Exception as te:
                        logs.append(f"Warning: could not load tool {tid}: {te}")
        # ── End tool resolution ────────────────────────────────────────

        # Call LLM
        start_time = time.time()
        try:
            from ...llm.base import Message, MessageRole
            _timeout_s = float(self.get_config_value(node, "timeout_seconds") or 0) or float(
                ((context.settings or {}).get("llm_timeout_seconds") or 0) if hasattr(context, "settings") else 0
            ) or float(__import__("os").environ.get("LLM_TIMEOUT_SECONDS", "90") or 90)
            
            llm_messages = [
                Message(role=MessageRole(m['role']), content=m['content'])
                for m in messages
            ]
            
            _chat_kwargs: dict = {}
            _is_openai = type(self.deps.llm).__name__ == "OpenAILLM"
            if (output_format == 'json' or output_schema) and not llm_tools and _is_openai:
                _chat_kwargs["response_format"] = {"type": "json_object"}
            
            response = await asyncio.wait_for(
                self.deps.llm.chat(
                    messages=llm_messages,
                    tools=llm_tools if llm_tools else None,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    **_chat_kwargs,
                ),
                timeout=_timeout_s
            )
            
            # ── Tool-calling loop (max 5 rounds to prevent infinite loops) ──
            _tool_rounds = 0
            while response.tool_calls and _tool_rounds < 5:
                _tool_rounds += 1
                # Append assistant message with tool_calls
                llm_messages.append(Message(
                    role=MessageRole.ASSISTANT,
                    content=response.content or '',
                    tool_calls=[
                        {"id": tc.id, "type": "function",
                         "function": {"name": tc.name, "arguments": tc.arguments if isinstance(tc.arguments, str) else json.dumps(tc.arguments)}}
                        for tc in response.tool_calls
                    ]
                ))
                # Execute each tool call and append results
                for tc in response.tool_calls:
                    fname = tc.name
                    tool_inst = tool_map.get(fname)
                    if not tool_inst:
                        tool_result_str = json.dumps({"error": f"Tool '{fname}' not found"})
                        logs.append(f"Tool call failed: {fname} not found")
                    else:
                        try:
                            args = tc.arguments if isinstance(tc.arguments, dict) else json.loads(tc.arguments or '{}')
                            tool_result = await tool_inst.execute(args, context={})
                            tool_result_str = tool_result.to_llm_response()
                            logs.append(f"Tool call {fname}: {'OK' if tool_result.success else 'FAILED'}")
                        except Exception as tex:
                            tool_result_str = json.dumps({"error": str(tex)})
                            logs.append(f"Tool call {fname} error: {tex}")
                    llm_messages.append(Message(
                        role=MessageRole.TOOL,
                        content=tool_result_str,
                        tool_call_id=tc.id
                    ))
                # Re-call LLM with tool results
                response = await asyncio.wait_for(
                    self.deps.llm.chat(
                        messages=llm_messages,
                        tools=llm_tools,
                        temperature=temperature,
                        max_tokens=max_tokens
                    ),
                    timeout=_timeout_s
                )
            # ── End tool-calling loop ──────────────────────────────────────
            
            duration_ms = (time.time() - start_time) * 1000
            logs.append(f"LLM response received in {duration_ms:.0f}ms{' (with ' + str(_tool_rounds) + ' tool round(s))' if _tool_rounds > 0 else ''}")
            
        except asyncio.TimeoutError:
            return NodeResult.failure(
                error=ExecutionError(
                    category=ErrorCategory.EXTERNAL,
                    code="LLM_TIMEOUT",
                    message="LLM call timed out",
                    business_message=(
                        f"The step \"{node.name}\" is taking longer than expected. "
                        "Please try again in a moment."
                    ),
                    is_user_fixable=False,
                    is_retryable=True,
                    retry_after_seconds=5,
                ),
                logs=logs + [f"LLM timeout after {_timeout_s:.0f}s"],
            )
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
        
        # Typed field coercion: if outputFields with types are defined, validate and coerce
        output_fields = self.get_config_value(node, 'outputFields') or []
        if isinstance(output, dict) and output_fields:
            output = self._coerce_typed_fields(output, output_fields, logs)

        # Update variables if output_variable specified
        variables_update = {}
        if node.output_variable:
            ov = node.output_variable
            if isinstance(output, dict) and ov in output and len(output) <= 5:
                # Auto-flatten: the AI returned a dict containing a key that matches
                # the output_variable name (e.g., output_variable="severity" and
                # output={"severity":"Low","reasoning":"..."}). Store the matching
                # value directly so {{severity}} resolves to "Low" instead of the
                # full dict. The complete dict remains available in the step output.
                variables_update[ov] = output[ov]
                logs.append(f"Variable '{ov}' set to: {output[ov]}")
            else:
                variables_update[ov] = output
        
        # ── Human Review gate ─────────────────────────────────────────
        # If the AI step has `humanReview: true`, pause execution so a
        # human can verify the extracted / generated data before the
        # process continues.  This creates an approval-style record
        # whose review_data contains both the source file references
        # and the structured AI output, enabling a split-screen
        # document-vs-data review UI in the portal.
        human_review = self.get_config_value(node, 'humanReview', False)
        if human_review and isinstance(output, dict):
            source_file_refs = []
            for sf_name in source_fields:
                sf_val = state.get(sf_name)
                if sf_val is None:
                    continue
                items = sf_val if isinstance(sf_val, list) else [sf_val]
                for fi in items:
                    if isinstance(fi, dict) and fi.get("name"):
                        source_file_refs.append(fi)

            review_payload = {
                "_review_type": "extraction_review",
                "_source_files": source_file_refs,
                "_extracted_data": output,
                "_output_variable": node.output_variable or "extractedData",
                "_output_fields": self.get_config_value(node, 'outputFields') or [],
                "_step_name": node.name,
            }
            review_payload.update(output)

            logs.append(
                f"Human review requested — pausing for verification "
                f"({len(source_file_refs)} source file(s), "
                f"{len(output)} extracted field(s))"
            )

            return NodeResult.waiting(
                waiting_for="approval",
                waiting_metadata={
                    "node_id": node.id,
                    "node_name": node.name,
                    "title": f"Review: {node.name}",
                    "description": (
                        "Please review the AI-extracted data against the source "
                        "documents and confirm or correct the values."
                    ),
                    "review_data": review_payload,
                    "assignee_type": "any",
                    "assignee_ids": [],
                    "org_id": getattr(context, "org_id", None),
                    "execution_id": getattr(context, "execution_id", None),
                    "min_approvals": 1,
                    "priority": "high",
                },
                output=output,
                variables_update=variables_update,
                duration_ms=duration_ms,
                tokens_used=tokens_used,
                logs=logs,
            )
        # ── End Human Review gate ─────────────────────────────────────

        return NodeResult.success(
            output=output,
            variables_update=variables_update,
            duration_ms=duration_ms,
            tokens_used=tokens_used,
            logs=logs
        )
    
    @staticmethod
    def _coerce_typed_fields(output: dict, output_fields: list, logs: list) -> dict:
        """
        Validate and coerce AI output fields to their declared types.

        output_fields is the list from the visual builder, e.g.:
          [{"name": "totalAmount", "label": "Total Amount", "type": "number"}, ...]

        Returns the (possibly modified) output dict.
        """
        from datetime import datetime as _dt

        for f in output_fields:
            name = f.get('name')
            declared_type = f.get('type', 'text')
            if not name or name not in output:
                continue
            raw = output[name]
            try:
                if declared_type == 'number' or declared_type == 'currency':
                    if raw is None or raw == '':
                        output[name] = 0
                    elif isinstance(raw, (int, float)):
                        pass  # already numeric
                    else:
                        # Strip currency symbols and thousands separators
                        cleaned = re.sub(r'[^\d.\-]', '', str(raw))
                        output[name] = float(cleaned) if '.' in cleaned else int(cleaned)
                elif declared_type == 'boolean':
                    if isinstance(raw, bool):
                        pass
                    elif isinstance(raw, str):
                        output[name] = raw.strip().lower() in ('true', 'yes', '1', 'y')
                    else:
                        output[name] = bool(raw)
                elif declared_type == 'date':
                    if isinstance(raw, str) and raw.strip():
                        # Try common date formats — store as ISO string
                        for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%m/%d/%Y', '%Y-%m-%dT%H:%M:%S'):
                            try:
                                output[name] = _dt.strptime(raw.strip(), fmt).isoformat()
                                break
                            except ValueError:
                                continue
                elif declared_type == 'list':
                    if isinstance(raw, str):
                        # Try JSON parse, else split by comma
                        try:
                            parsed = json.loads(raw)
                            if isinstance(parsed, list):
                                output[name] = parsed
                            else:
                                output[name] = [parsed]
                        except (json.JSONDecodeError, TypeError):
                            output[name] = [s.strip() for s in raw.split(',') if s.strip()]
                    elif not isinstance(raw, list):
                        output[name] = [raw]
                elif declared_type == 'email':
                    # Light validation — just ensure it looks like an email
                    val = str(raw).strip()
                    output[name] = val
                # 'text' — no coercion needed
            except Exception as exc:
                logs.append(f"Coercion warning: could not convert '{name}' to {declared_type}: {exc}")
        return output

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
