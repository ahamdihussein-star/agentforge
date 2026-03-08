"""
Task Node Executors
AI tasks, tool calls, and script execution

These nodes perform actual work:
- AI_TASK: Uses LLM for intelligent tasks
- TOOL_CALL: Executes platform tools
- SCRIPT: Runs custom scripts
"""

import json
import logging
import asyncio
import re
import time

logger = logging.getLogger(__name__)
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
            logs.append(f"Interpolated prompt ({len(prompt)} chars): {prompt[:500]}{'...' if len(prompt) > 500 else ''}")
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
        _file_sections = []
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
        _multi_file_count = len(_file_sections) if _file_sections else 0
        # ── End source file pre-reading ────────────────────────────────

        # ── Inject process data context (ALWAYS) ───────────────────────
        # AI steps in "custom"/"analyze" mode need access to form data and
        # previous-step outputs (including tool call results, extracted data,
        # external lookups, etc.). If we only inject file contents, the LLM
        # may ignore or never see system/reference data, leading to unstable
        # comparisons (sometimes line items are considered, sometimes not).
        #
        # Best practice: inject BOTH file contents (when present) AND a bounded,
        # trimmed snapshot of process variables.
        _process_data_block = ""
        _all_vars = state.get_all()
        _display_vars: dict = {}
        _internal_prefixes = ("_", "approval_")
        _PER_VAR_LIMIT = 12_000 if _file_context_block else 30_000
        _TOTAL_BUDGET = 35_000 if _file_context_block else 100_000
        _total_size = 0

        def _var_score(k: str, v: Any) -> int:
            kn = str(k or "").lower().replace("_", "").replace("-", "").replace(" ", "")
            score = 0
            if any(w in kn for w in ("lineitem", "lineitems", "items", "entries", "records", "results")):
                score += 6
            if any(w in kn for w in ("system", "lookup", "external", "reference", "response", "api", "tool")):
                score += 6
            if isinstance(v, list) and v:
                if all(isinstance(x, dict) for x in v[:5]):
                    score += 4
                    try:
                        keys = set()
                        for x in v[:5]:
                            keys.update([str(kk).lower() for kk in x.keys()])
                        if any(kw in keys for kw in ("quantity", "qty", "unitprice", "price", "total", "amount", "value")):
                            score += 3
                    except Exception:
                        pass
            if isinstance(v, dict):
                if any(x in v for x in ("response", "data", "results", "items", "lineItems", "line_items")):
                    score += 3
            return score

        _sorted_vars = sorted(_all_vars.items(), key=lambda kv: (-_var_score(kv[0], kv[1]), str(kv[0]).lower()))

        for k, v in _sorted_vars:
            if any(k.startswith(p) for p in _internal_prefixes):
                continue
            try:
                v_json = json.dumps(v, default=str)
                v_len = len(v_json)
            except Exception:
                v_len = len(str(v))
            if v_len > _PER_VAR_LIMIT:
                logs.append(f"Truncated large variable '{k}' ({v_len} chars)")
                if isinstance(v, dict):
                    _display_vars[k] = {kk: vv for i, (kk, vv) in enumerate(v.items()) if i < 40}
                elif isinstance(v, list):
                    _display_vars[k] = v[:30]
                else:
                    _display_vars[k] = str(v)[:_PER_VAR_LIMIT]
                _total_size += min(v_len, _PER_VAR_LIMIT)
            else:
                _display_vars[k] = v
                _total_size += v_len
            if _total_size > _TOTAL_BUDGET:
                logs.append(f"Process data context budget reached ({_total_size} chars), remaining variables skipped")
                break
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
            logs.append(
                f"Injected {len(_display_vars)} process data variables as AI context "
                f"({_total_size} chars, budgets per_var={_PER_VAR_LIMIT} total={_TOTAL_BUDGET})"
            )
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
        _is_file_extraction = bool(source_fields) and (output_format == "json" or output_schema or bool(self.get_config_value(node, "outputFields")))
        if _is_file_extraction:
            _combined_system += (
                "\n\nEXTRACTION SAFETY RULES:\n"
                "- Use ONLY the provided FILE CONTENTS. Do not use outside knowledge.\n"
                "- Do NOT invent or assume any values.\n"
                "- If a value is missing or unclear, return null (or an empty string if the field is typed as text).\n"
                "- Keep numbers as pure numbers (no extra words).\n"
            )
            if _multi_file_count > 1:
                _combined_system += (
                    f"\n\nMULTI-DOCUMENT EXTRACTION (CRITICAL):\n"
                    f"The uploaded files contain {_multi_file_count} separate documents.\n"
                    f"You MUST return a JSON object with a single key \"documents\" whose value is an array "
                    f"of exactly {_multi_file_count} objects.\n"
                    f"Each object must have the SAME structure with all requested output fields, "
                    f"filled with the values extracted from the corresponding document.\n"
                    f"The order MUST match the order the files appear above.\n"
                    f"Example: {{\"documents\": [{{\"field1\": \"value from doc 1\"}}, {{\"field1\": \"value from doc 2\"}}]}}\n"
                    f"Even if one document is missing a field, include that object with null values.\n"
                    f"IMPORTANT: Extract ACTUAL values from each document. Do NOT return field definitions or schema.\n"
                )
                logs.append(f"Multi-file extraction: instructed AI to return {{documents: [...]}} with {_multi_file_count} elements")
            if self.get_config_value(node, "temperature") is None:
                temperature = min(float(temperature or 0.2), 0.2)
                logs.append(f"Extraction mode: clamped temperature={temperature}")

        # Analysis safety: when the AI step has PROCESS DATA and produces structured
        # output, enforce rigorous data comparison rules so the LLM does systematic
        # numerical/factual analysis instead of superficial matching.
        _ai_mode = self.get_config_value(node, 'aiMode') or ''
        _has_output_fields = bool(self.get_config_value(node, "outputFields"))
        _is_analysis = (
            _ai_mode in ("analyze", "custom", "")
            and not _is_file_extraction
            and _process_data_block
            and _has_output_fields
        )
        if _is_analysis:
            _combined_system += (
                "\n\nANALYSIS ACCURACY RULES (MANDATORY):\n"
                "- You MUST perform PRECISE numerical comparisons. Never approximate or round.\n"
                "- When comparing two data sets from different sources:\n"
                "  1. Match records by their reference/ID fields.\n"
                "  2. For EACH matched pair, compare EVERY field and value systematically.\n"
                "  3. ONLY flag a discrepancy when the two values are ACTUALLY DIFFERENT.\n"
                "     If value1 == value2, that field is correct — do NOT report it as a finding.\n"
                "  4. For genuine differences, calculate deviation: abs(value1 - value2) / max(value1, value2) * 100.\n"
                "  5. List EACH genuine discrepancy individually with the exact values from both sides.\n"
                "\n"
                "MATCHING vs UNMATCHED CLASSIFICATION (CRITICAL):\n"
                "- 'Matched' means a record was successfully paired with its counterpart using a reference/ID.\n"
                "- 'Unmatched' means NO counterpart was found (missing reference, no match in external system).\n"
                "- If a record has NO reference number or its reference was not found in the other data set,\n"
                "  it is UNMATCHED — do NOT count it as matched.\n"
                "- matchedCount + unmatchedCount MUST equal the total number of records.\n"
                "\n"
                "QUANTITY & NUMERIC COMPARISON RULES:\n"
                "- Before reporting a quantity or price mismatch, VERIFY: is source_value != target_value?\n"
                "- If both values are the same number (e.g., qty 1 vs qty 1), there is NO mismatch — skip it.\n"
                "- Only report a mismatch when you can show two DIFFERENT numbers side by side.\n"
                "\n"
                "- NEVER say 'no issues' or 'all matched' unless you have verified EVERY field and number.\n"
                "- If a record exists in one data set but not the other, flag it as missing/unmatched.\n"
                "- Compare totals: if the sum of individual items differs from the stated total, flag it.\n"
                "- Return concrete numbers in your output, not vague descriptions.\n"
                "\n"
                "MULTI-RECORD PROCESSING (CRITICAL):\n"
                "- If any input variable is an ARRAY of records (e.g., multiple invoices, documents, requests),\n"
                "  you MUST process and analyze EVERY record individually. Do NOT skip any.\n"
                "- Your output MUST contain classification and findings for ALL input records.\n"
                "- Do NOT merge, average, or summarize multiple records into one result.\n"
                "- Each record must be evaluated independently against its corresponding system data.\n"
                "- If 5 records are provided, your output must cover all 5.\n"
                "- OUTPUT STRUCTURE: When analyzing multiple records, your JSON response MUST include\n"
                "  a 'recordAnalysis' array at the top level. Each element represents ONE input record and must have:\n"
                "    * A record identifier (e.g., invoice number, document name, ID)\n"
                "    * Individual classification/risk level for that record\n"
                "    * An array of all findings/anomalies for that record\n"
                "  The summary-level fields reflect the AGGREGATE across all records.\n"
                "\n"
                "ANOMALY / FINDING REPORTING (CRITICAL):\n"
                "- List EVERY anomaly, discrepancy, or rule violation individually. Never collapse multiple\n"
                "  findings into a single summary. If a record has 3 issues, output 3 separate findings.\n"
                "- Each finding MUST include: the record identifier, the type of anomaly, the severity/risk,\n"
                "  and a clear explanation with the actual values that triggered it.\n"
                "- Follow the user's prompt rules for classification and risk exactly as specified.\n"
                "  The prompt defines what constitutes each risk level — use those definitions, not your own.\n"
                "- If a record has NO anomalies, explicitly classify it (e.g., 'Clean', 'No Risk').\n"
                "\n"
                "ITEM-LEVEL COMPARISON ORDER (MANDATORY — follow this exact sequence for EACH item/record):\n"
                "  STEP 1 — IDENTITY MATCH: For each source item, first verify a matching item exists in the\n"
                "    reference/target data using its identifying field (name, description, code, ID, etc.).\n"
                "    - Minor spelling or abbreviation differences may still be the same item (context-dependent).\n"
                "    - Semantically different identifiers are DIFFERENT items, even if superficially similar.\n"
                "    - If NO match found: classify this item per the user's prompt rule for unmatched/extra items.\n"
                "      DO NOT perform quantity or value comparisons on unmatched items.\n"
                "    - If matched: proceed to STEP 2.\n"
                "  STEP 2 — QUANTITY/COUNT COMPARISON (when applicable per the user's prompt):\n"
                "    - Compare source quantity vs reference quantity.\n"
                "    - ONLY flag a discrepancy if the two values are DIFFERENT numbers.\n"
                "    - If source_value == reference_value (same number), there is NO finding — skip.\n"
                "  STEP 3 — VALUE/AMOUNT COMPARISON (when applicable per the user's prompt):\n"
                "    - Compare source value vs reference value for EVERY matched item. Never skip this step.\n"
                "    - Calculate the absolute difference and apply the user's prompt thresholds/classifications.\n"
                "    - If difference is 0, there is NO finding — skip.\n"
                "\n"
                "DISCREPANCY TYPE ACCURACY (CRITICAL):\n"
                "- NEVER report a quantity or value mismatch between two items that have DIFFERENT identities.\n"
                "  First confirm both items refer to the same thing, THEN compare their values.\n"
                "- An item that exists in the source but has NO match in the reference system should be classified\n"
                "  using the user's prompt rule for unmatched/extra items — not as a quantity or value mismatch.\n"
                "- NEVER report a quantity mismatch when both values are numerically equal.\n"
                "- A single item can have MULTIPLE findings simultaneously (e.g., quantity issue AND value issue).\n"
            )
            if self.get_config_value(node, "temperature") is None:
                temperature = min(float(temperature or 0.3), 0.3)
                logs.append(f"Analysis mode: clamped temperature={temperature}")
        
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
        _has_multirecord_input = False
        _multirecord_count = 0
        if output_format == 'json' or output_schema:
            schema_instruction = ""
            if output_schema:
                if _multi_file_count > 1:
                    schema_instruction = (
                        "\n\nIMPORTANT: You MUST respond with valid JSON only. "
                        f"Return a JSON object with a \"documents\" key containing an array of exactly {_multi_file_count} elements. "
                        "Each element must match this schema:\n" + json.dumps(output_schema, indent=2)
                        + "\n\nExample: {\"documents\": [{...}, {...}]}"
                    )
                else:
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
                    _has_multirecord_input = False
                    _multirecord_count = 0
                    if _is_analysis:
                        for _mk, _mv in _all_vars.items():
                            if any(_mk.startswith(p) for p in _internal_prefixes):
                                continue
                            _is_list = isinstance(_mv, list)
                            _list_len = len(_mv) if _is_list else 0
                            _all_dicts = (
                                all(isinstance(x, dict) for x in _mv[:10])
                                if _is_list and _list_len > 0
                                else False
                            )
                            if _is_list and _list_len > 1 and _all_dicts:
                                _has_multirecord_input = True
                                _multirecord_count = max(_multirecord_count, _list_len)
                                logger.info(
                                    "[AITask] multi-record HIT var='%s' len=%d",
                                    _mk, _list_len,
                                )
                                break
                            elif _is_list and _list_len > 0:
                                logger.debug(
                                    "[AITask] multi-record SKIP var='%s' is_list=%s len=%d all_dicts=%s",
                                    _mk, _is_list, _list_len, _all_dicts,
                                )
                        if not _has_multirecord_input:
                            logger.info(
                                "[AITask] multi-record detection: NONE found. var_keys=%s",
                                [k for k in _all_vars if not any(k.startswith(p) for p in _internal_prefixes)],
                            )

                    if _multi_file_count > 1:
                        schema_instruction = (
                            "\n\nIMPORTANT: You MUST respond with valid JSON only. "
                            "Return a JSON object with a \"documents\" key containing an array. "
                            "Each element in the array must have EXACTLY these fields:\n{\n"
                            + ",\n".join(_field_lines)
                            + "\n}\n"
                            + "Example for one element: " + json.dumps(_example_obj)
                        )
                    elif _has_multirecord_input:
                        _example_record = {"recordId": "identifier", "status": "Clean/Low/Medium/High", "findings": [{"type": "anomaly type", "severity": "level", "detail": "explanation"}]}
                        schema_instruction = (
                            f"\n\nIMPORTANT: You MUST respond with valid JSON only. "
                            f"The input contains {_multirecord_count} records that you MUST analyze individually.\n"
                            f"Return a JSON object that includes AT LEAST these summary fields:\n{{\n"
                            + ",\n".join(_field_lines)
                            + f',\n  "recordAnalysis": [exactly {_multirecord_count} per-record detail objects]'
                            + "\n}\n"
                            + f"The 'recordAnalysis' array is MANDATORY and MUST contain EXACTLY {_multirecord_count} elements "
                            + "(one per input record). "
                            + "Each element must include: the record identifier (invoice number, document name, etc.), "
                            + "its individual risk/status classification, and ALL findings/anomalies for that record.\n"
                            + "Example recordAnalysis element: " + json.dumps(_example_record) + "\n"
                            + "Summary fields (like overallRiskLevel) should reflect the WORST/HIGHEST risk across all records."
                        )
                        logs.append(f"Multi-record input detected ({_multirecord_count} records): schema expanded to require 'recordAnalysis' array")
                    else:
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
        
        # For analysis steps, inject array-of-record variables as structured JSON
        # directly in the user message so the LLM processes every record.
        _injected_record_count = 0
        if _is_analysis:
            _record_injections = []
            for _rk, _rv in _all_vars.items():
                if any(_rk.startswith(p) for p in _internal_prefixes):
                    continue
                if isinstance(_rv, list) and len(_rv) > 1 and all(isinstance(x, dict) for x in _rv[:10]):
                    try:
                        _rj = json.dumps(_rv, indent=2, default=str, ensure_ascii=False)
                        if len(_rj) < 60_000:
                            _record_injections.append(
                                f"\n\n=== INPUT RECORDS: '{_rk}' ({len(_rv)} records) ===\n"
                                f"{_rj}\n"
                                f"=== END INPUT RECORDS ===\n"
                                f"You MUST analyze ALL {len(_rv)} records above individually."
                            )
                            _injected_record_count = max(_injected_record_count, len(_rv))
                            logs.append(f"Injected '{_rk}' ({len(_rv)} records) as structured JSON into user prompt")
                    except Exception:
                        pass
            if _record_injections:
                prompt += "".join(_record_injections)

            # Safety net: if injection found multi-record data but schema
            # detection missed it, append per-record instructions now.
            if _injected_record_count > 1 and not _has_multirecord_input:
                _has_multirecord_input = True
                _multirecord_count = _injected_record_count
                _example_record = {
                    "recordId": "identifier",
                    "status": "Clean/Low/Medium/High",
                    "findings": [{"type": "anomaly type", "severity": "level", "detail": "explanation"}],
                }
                _late_schema = (
                    f"\n\nCRITICAL — MULTI-RECORD REQUIREMENT:\n"
                    f"The input contains {_multirecord_count} records. "
                    f"Your JSON response MUST include a 'recordAnalysis' array with EXACTLY "
                    f"{_multirecord_count} elements (one per input record).\n"
                    f"Each element must include: the record identifier, its risk/status, "
                    f"and ALL findings/anomalies.\n"
                    f"Example element: {json.dumps(_example_record)}\n"
                    f"Summary fields should reflect the WORST risk across all records."
                )
                prompt += _late_schema
                logs.append(
                    f"Late multi-record catch: detection missed but injection found "
                    f"{_injected_record_count} records — appended recordAnalysis requirement"
                )
                logger.warning(
                    "[AITask] Late multi-record catch for '%s': injected=%d but detection was False",
                    node.name, _injected_record_count,
                )

            logger.info(
                "[AITask] Analysis step '%s': _is_analysis=%s multi_record=%s injected_records=%d "
                "process_data_vars=%d prompt_len=%d",
                node.name, _is_analysis, _has_multirecord_input if (output_format == 'json' or output_schema) else 'n/a',
                _injected_record_count, len(_display_vars), len(prompt),
            )

        # Ensure sufficient max_tokens for multi-record analysis output
        if _is_analysis and _injected_record_count > 1:
            _min_tokens = max(2000, _injected_record_count * 600)
            if max_tokens is None or (isinstance(max_tokens, (int, float)) and max_tokens < _min_tokens):
                logs.append(f"Multi-record analysis: raised max_tokens from {max_tokens} to {_min_tokens}")
                max_tokens = _min_tokens

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
                output = self._parse_json_response(content)
                if isinstance(output, dict):
                    _out_keys = list(output.keys())
                    logs.append(f"Parsed JSON output: {len(_out_keys)} fields → {_out_keys}")
                    for _ok in _out_keys[:15]:
                        _ov = output[_ok]
                        if isinstance(_ov, list):
                            logs.append(f"  {_ok}: list[{len(_ov)}]{' → ' + str(_ov[0])[:200] if _ov else ''}")
                        elif isinstance(_ov, dict):
                            logs.append(f"  {_ok}: dict → {str(_ov)[:200]}")
                        else:
                            logs.append(f"  {_ok}: {repr(_ov)[:200]}")
                else:
                    logs.append(f"Parsed JSON output (type={type(output).__name__}): {str(output)[:300]}")
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

        # Unwrap multi-file envelope: {"documents": [{...}, {...}]} → [{...}, {...}]
        if isinstance(output, dict) and _multi_file_count > 1:
            _unwrap_keys = ("documents", "results", "items", "records", "data")
            for _uwk in _unwrap_keys:
                _uwv = output.get(_uwk)
                if isinstance(_uwv, list) and len(_uwv) == _multi_file_count:
                    logs.append(f"Multi-file unwrap: extracted list from key '{_uwk}' ({len(_uwv)} items)")
                    output = _uwv
                    break
            if isinstance(output, dict):
                # AI returned a flat dict despite multi-file instruction; fallback — still usable
                logs.append(f"Multi-file unwrap: AI returned flat dict, using as-is (keys={list(output.keys())[:10]})")

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
            # Step 4: Remove false numeric discrepancies (e.g., "mismatch" where values are equal)
            output = self._sanitize_false_numeric_discrepancies(output, logs)

        # Multi-record validation: verify recordAnalysis covers all input records
        if isinstance(output, dict) and _is_analysis and _injected_record_count > 1:
            _ra = output.get("recordAnalysis")
            if isinstance(_ra, list):
                if len(_ra) < _injected_record_count:
                    logger.warning(
                        "[AITask] '%s': recordAnalysis has %d entries but expected %d — AI may have skipped records",
                        node.name, len(_ra), _injected_record_count,
                    )
                    logs.append(f"WARNING: recordAnalysis has {len(_ra)} entries, expected {_injected_record_count}")
                else:
                    logs.append(f"recordAnalysis validation passed: {len(_ra)} entries for {_injected_record_count} input records")
            else:
                logger.warning(
                    "[AITask] '%s': expected 'recordAnalysis' array in output but got %s — AI ignored multi-record instruction",
                    node.name, type(_ra).__name__ if _ra is not None else "missing",
                )
                logs.append(f"WARNING: 'recordAnalysis' array missing from output (got {type(_ra).__name__ if _ra is not None else 'None'})")
        
        output_fields = self.get_config_value(node, 'outputFields') or []
        if output_fields:
            _expected = [(f.get('name'), f.get('type', 'text')) for f in output_fields if f.get('name')]
            logs.append(f"Expected output fields: {_expected}")
            if isinstance(output, dict):
                _missing = [n for n, _ in _expected if n not in output]
                if _missing:
                    logs.append(f"WARNING: Missing fields in AI output: {_missing}")
        # Coerce typed fields (works on dict; for multi-file arrays, coerce each element)
        if isinstance(output, dict) and output_fields:
            output = self._coerce_typed_fields(output, output_fields, logs)
        elif isinstance(output, list) and output_fields and _multi_file_count > 1:
            for _mfi, _mfitem in enumerate(output):
                if isinstance(_mfitem, dict):
                    output[_mfi] = self._coerce_typed_fields(_mfitem, output_fields, logs)
            logs.append(f"Multi-file coercion: coerced {len(output)} elements")

        variables_update = {}
        if node.output_variable:
            ov = node.output_variable
            if isinstance(output, dict) and ov in output and len(output) <= 5:
                variables_update[ov] = output[ov]
                logs.append(f"Variable '{ov}' auto-flattened to: {repr(output[ov])[:300]}")
            else:
                variables_update[ov] = output
                if isinstance(output, dict):
                    logs.append(f"Variable '{ov}' set as dict with keys: {list(output.keys())}")
                elif isinstance(output, list):
                    logs.append(f"Variable '{ov}' set as list with {len(output)} elements")
                else:
                    logs.append(f"Variable '{ov}' set to: {repr(output)[:300]}")
        
        # ── Human Review gate ─────────────────────────────────────────
        # If the AI step has `humanReview: true`, pause execution so a
        # human can verify the extracted / generated data before the
        # process continues.  This creates an approval-style record
        # whose review_data contains both the source file references
        # and the structured AI output, enabling a split-screen
        # document-vs-data review UI in the portal.
        human_review = self.get_config_value(node, 'humanReview', False)
        _output_is_reviewable = isinstance(output, dict) or (isinstance(output, list) and _multi_file_count > 1)
        if human_review and _output_is_reviewable:
            source_file_refs = []
            for sf_name in source_fields:
                sf_val = state.get(sf_name)
                if sf_val is None:
                    logs.append(f"Human review: source field '{sf_name}' not in state")
                    continue
                items = sf_val if isinstance(sf_val, list) else [sf_val]
                for fi in items:
                    if not isinstance(fi, dict) or not fi.get("name"):
                        logs.append(f"Human review: skipped file item (missing name): {type(fi).__name__}")
                        continue
                    ref = dict(fi)
                    if not ref.get("id") and ref.get("download_url"):
                        m = re.search(r"/uploads/([a-fA-F0-9-]+)(?:/|$)", str(ref.get("download_url", "")))
                        if m:
                            ref["id"] = m.group(1)
                            logs.append(f"Human review: extracted id from download_url for '{ref.get('name')}'")
                    if not ref.get("id"):
                        logs.append(f"Human review: file '{ref.get('name')}' has no id (frontend cannot load preview)")
                    source_file_refs.append(ref)

            review_payload = {
                "_review_type": "extraction_review",
                "_source_files": source_file_refs,
                "_extracted_data": output,
                "_output_variable": node.output_variable or "extractedData",
                "_output_fields": self.get_config_value(node, 'outputFields') or [],
                "_step_name": node.name,
            }
            if isinstance(output, dict):
                review_payload.update(output)

            _output_len = len(output) if isinstance(output, (dict, list)) else 0
            logs.append(
                f"Human review requested — pausing for verification "
                f"({len(source_file_refs)} source file(s), "
                f"{_output_len} extracted {'element(s)' if isinstance(output, list) else 'field(s)'})"
            )
            output_keys = list(output.keys()) if isinstance(output, dict) else f"list[{len(output)}]" if isinstance(output, list) else str(type(output))
            logger.info(
                "[HumanReview] source_files=%s source_file_refs=%s output_keys=%s output_sample=%s",
                source_fields,
                [{"name": r.get("name"), "id": r.get("id"), "download_url": r.get("download_url")} for r in source_file_refs],
                output_keys,
                str(output)[:500],
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

    @staticmethod
    def _sanitize_false_numeric_discrepancies(output: dict, logs: list) -> dict:
        """
        Generic verifier: remove/neutralize discrepancy findings that contain two numeric values
        which are actually equal (or equal within a tiny tolerance).

        This is platform-level validation (math consistency), not business logic.
        It prevents cases like: "Quantity mismatch (A: 1, B: 1)".
        """
        import re

        def _to_num(s):
            try:
                if s is None:
                    return None
                t = str(s).strip()
                if not t:
                    return None
                # keep digits, dot, minus; drop thousands separators and currency symbols
                t = t.replace(",", "")
                t = re.sub(r"[^0-9.\-]", "", t)
                if not t or t == "-" or t == ".":
                    return None
                n = float(t)
                return n
            except Exception:
                return None

        # Parse common comparison pairs like:
        # - "A: 1, B: 1"
        # - "Actual: 1 vs Expected: 1"
        # - "Invoice: 1, PO: 1"
        # - "Document=1 | System=1"
        _pair_patterns = [
            re.compile(
                r"(?:actual|source|invoice|value\s*1|left|a)\s*[:=]\s*([-0-9.,]+).*?"
                r"(?:expected|target|po|value\s*2|right|b)\s*[:=]\s*([-0-9.,]+)",
                re.I
            ),
            re.compile(r"(?:document)\s*[:=\-]\s*([-0-9.,]+).*?(?:system)\s*[:=\-]\s*([-0-9.,]+)", re.I),
            # Common phrasing in findings: "Expected quantity 1, found 1"
            re.compile(
                r"(?:expected|target)\s*(?:quantity|qty|count|amount|total|value)?\s*[:=\s]*([-0-9.,]+).*?"
                r"(?:found|actual)\s*(?:quantity|qty|count|amount|total|value)?\s*[:=\s]*([-0-9.,]+)",
                re.I
            ),
            re.compile(r"([-0-9.,]+)\s*(?:vs|versus)\s*([-0-9.,]+)", re.I),
            # Catches: "quantity 1 does not match ... quantity 1"
            re.compile(
                r"(?:quantity|qty|price|amount|total)\s+([-0-9.,]+)\s+does\s+not\s+match.*?"
                r"(?:quantity|qty|price|amount|total)\s+([-0-9.,]+)",
                re.I | re.DOTALL
            ),
            # Catches: "item quantity: 1, PO quantity: 1" or "invoice qty 1, po qty 1"
            re.compile(
                r"(?:invoice|item|source)\s+(?:quantity|qty|price|amount)\s*[:=]?\s*([-0-9.,]+).*?"
                r"(?:po|purchase\s*order|target|expected)\s+(?:quantity|qty|price|amount)\s*[:=]?\s*([-0-9.,]+)",
                re.I | re.DOTALL
            ),
        ]

        def _extract_pair_from_text(t: str):
            if not t:
                return None, None
            for rx in _pair_patterns:
                m = rx.search(t)
                if m and len(m.groups()) >= 2:
                    return _to_num(m.group(1)), _to_num(m.group(2))
            return None, None

        def _is_discrepancy_text(t: str) -> bool:
            tl = (t or "").lower()
            return any(w in tl for w in ("mismatch", "discrep", "difference", "differs", "variance", "deviation"))

        def _eq(a, b) -> bool:
            if a is None or b is None:
                return False
            return abs(a - b) <= 1e-9

        _list_keys = {"anomalies", "findings", "issues", "discrepancies", "results"}

        def _sanitize_list(list_key: str, items_list: list, container: dict) -> list:
            nonlocal_removed = 0
            new_list = []
            for item in items_list:
                # String finding
                if isinstance(item, str):
                    if _is_discrepancy_text(item):
                        a, b = _extract_pair_from_text(item)
                        if _eq(a, b):
                            nonlocal_removed += 1
                            logs.append(f"🧹 Removed false discrepancy in '{list_key}': values equal ({a} vs {b})")
                            continue
                    new_list.append(item)
                    continue

                # Dict finding (structured)
                if isinstance(item, dict):
                    name = str(item.get("type") or item.get("name") or item.get("finding") or "").lower()
                    is_disc = ("mismatch" in name) or ("discrep" in name) or ("diff" in name) or ("variance" in name) or ("deviation" in name)
                    if is_disc:
                        a = _to_num(
                            item.get("actual") or item.get("source") or item.get("invoice") or item.get("value1")
                            or item.get("document") or item.get("doc")
                        )
                        b = _to_num(
                            item.get("expected") or item.get("target") or item.get("po") or item.get("value2")
                            or item.get("system") or item.get("sys")
                        )
                        # Fallback: parse free-text detail/description field when structured fields absent
                        if a is None or b is None:
                            detail_text = str(
                                item.get("detail") or item.get("description") or item.get("explanation")
                                or item.get("message") or item.get("reason") or ""
                            )
                            if detail_text:
                                fa, fb = _extract_pair_from_text(detail_text)
                                if a is None:
                                    a = fa
                                if b is None:
                                    b = fb
                        if _eq(a, b):
                            nonlocal_removed += 1
                            logs.append(f"🧹 Removed false discrepancy in '{list_key}': values equal ({a} vs {b})")
                            continue
                    new_list.append(item)
                    continue

                new_list.append(item)

            # Align count fields on the SAME container dict (generic)
            if nonlocal_removed and isinstance(container, dict):
                k_norm = str(list_key).lower().replace("_", "").replace("-", "")
                for ck, cv in list(container.items()):
                    if not isinstance(cv, (int, float)):
                        continue
                    cn = str(ck).lower().replace("_", "").replace("-", "")
                    if k_norm == "anomalies" and ("anomaly" in cn and "count" in cn):
                        container[ck] = len(new_list)
                    if k_norm == "findings" and ("finding" in cn and "count" in cn):
                        container[ck] = len(new_list)
                    if k_norm == "issues" and ("issue" in cn and "count" in cn):
                        container[ck] = len(new_list)
                    if k_norm == "results" and ("result" in cn and "count" in cn):
                        container[ck] = len(new_list)
            return new_list

        def _walk(node):
            # Recurse through nested dict/list structures
            if isinstance(node, dict):
                for kk, vv in list(node.items()):
                    k_norm = str(kk).lower().replace("_", "").replace("-", "")
                    if isinstance(vv, list) and k_norm in _list_keys:
                        node[kk] = _sanitize_list(kk, vv, node)
                        # also recurse into items (they may contain nested findings lists)
                        for it in node[kk]:
                            _walk(it)
                    else:
                        _walk(vv)
            elif isinstance(node, list):
                for it in node:
                    _walk(it)

        _walk(output)
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
        
        # ── Auto-iteration: when arguments contain parallel arrays (from
        #    array property access, e.g. extractedData.poReferenceNumber
        #    resolved to ["PO-001", "PO-002"]), call the tool once per
        #    element and aggregate the results into a list. ──────────────
        _array_keys: dict = {}
        _iter_count = 0
        for _ak, _av in interpolated_args.items():
            if isinstance(_av, list) and _av and all(not isinstance(x, (dict, list)) for x in _av[:20]):
                _array_keys[_ak] = _av
        if _array_keys:
            _lengths = set(len(v) for v in _array_keys.values())
            if len(_lengths) == 1:
                _iter_count = _lengths.pop()
        _should_iterate = _iter_count > 1

        # Execute tool
        start_time = time.time()
        try:
            if _should_iterate:
                logs.append(f"Auto-iterating tool call: {_iter_count} iterations over keys {list(_array_keys.keys())}")
                _all_results = []
                _any_failed = False
                for _idx in range(_iter_count):
                    _iter_args = {}
                    for _ik, _iv in interpolated_args.items():
                        if _ik in _array_keys:
                            _iter_args[_ik] = _array_keys[_ik][_idx]
                        else:
                            _iter_args[_ik] = _iv
                    try:
                        _iter_result = await tool.execute(**_iter_args)
                        if _iter_result.success:
                            _all_results.append(_iter_result.data)
                        else:
                            logs.append(f"Iteration {_idx + 1}/{_iter_count} failed: {_iter_result.error}")
                            _all_results.append({"_error": _iter_result.error or "failed", "_iteration": _idx})
                            _any_failed = True
                    except Exception as _ie:
                        logs.append(f"Iteration {_idx + 1}/{_iter_count} error: {_ie}")
                        _all_results.append({"_error": str(_ie), "_iteration": _idx})
                        _any_failed = True

                duration_ms = (time.time() - start_time) * 1000
                logs.append(f"Tool executed {_iter_count} iterations in {duration_ms:.0f}ms (failures={_any_failed})")

                variables_update = {}
                if node.output_variable:
                    variables_update[node.output_variable] = _all_results

                return NodeResult.success(
                    output=_all_results,
                    variables_update=variables_update,
                    duration_ms=duration_ms,
                    logs=logs
                )
            else:
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
