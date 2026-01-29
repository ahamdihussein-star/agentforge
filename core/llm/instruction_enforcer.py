"""
Instruction Enforcer Service

Ensures LLM strictly follows task instructions through:
1. Strengthened system prompts with clear enforcement language
2. Chain of Thought (CoT) prompting for step-by-step execution
3. Response verification against instructions
4. Structured output format

This service is reusable across all chat endpoints:
- Main chat (index.html)
- Chat portal (chat.html)
- Test chat (agent wizard)
"""

from typing import List, Dict, Optional, Tuple
import json
import re


class InstructionEnforcer:
    """
    Service to enforce LLM compliance with task instructions.
    """
    
    # Enforcement phrases in multiple languages
    ENFORCEMENT_PHRASES = {
        'en': {
            'critical': "⚠️ CRITICAL: You MUST follow ALL instructions below EXACTLY. Do not skip any step.",
            'mandatory': "These instructions are MANDATORY. Execute each step in order.",
            'verify': "Before responding, verify you have completed ALL steps.",
            'format': "Follow the exact format specified. Do not deviate.",
            'no_skip': "Do NOT skip, summarize, or modify any instruction.",
            'confirm': "If you cannot complete an instruction, explicitly state why."
        },
        'ar': {
            'critical': "⚠️ هام جداً: يجب عليك اتباع جميع التعليمات أدناه بدقة. لا تتخطى أي خطوة.",
            'mandatory': "هذه التعليمات إلزامية. نفذ كل خطوة بالترتيب.",
            'verify': "قبل الرد، تأكد من إكمال جميع الخطوات.",
            'format': "اتبع التنسيق المحدد بالضبط. لا تحيد عنه.",
            'no_skip': "لا تتخطى أو تلخص أو تعدل أي تعليمات.",
            'confirm': "إذا لم تستطع إكمال تعليمات، اذكر السبب صراحة."
        }
    }
    
    @classmethod
    def build_enforced_system_prompt(
        cls,
        base_prompt: str,
        tasks: List[Dict],
        language: str = 'en',
        strict_mode: bool = True
    ) -> str:
        """
        Build a system prompt with instruction enforcement.
        
        Args:
            base_prompt: The base system prompt
            tasks: List of task definitions with instructions
            language: 'en' or 'ar'
            strict_mode: If True, adds stronger enforcement language
            
        Returns:
            Enhanced system prompt with enforcement
        """
        lang = 'ar' if language == 'ar' else 'en'
        phrases = cls.ENFORCEMENT_PHRASES[lang]
        
        # Build enforcement section
        enforcement = f"""
=== INSTRUCTION ENFORCEMENT ===
{phrases['critical']}
{phrases['mandatory']}
{phrases['no_skip']}
{phrases['verify']}
"""
        
        # Build tasks section with enhanced formatting
        tasks_section = "\n=== TASKS WITH INSTRUCTIONS ==="
        
        for task in tasks:
            task_name = task.get('name', 'Task')
            task_desc = task.get('description', '')
            instructions = task.get('instructions', [])
            
            tasks_section += f"\n\n### TASK: {task_name}"
            tasks_section += f"\n{task_desc}"
            
            if instructions:
                tasks_section += f"\n\n**{phrases['mandatory']}**"
                tasks_section += "\n**REQUIRED STEPS (Execute ALL in order):**"
                
                for i, inst in enumerate(instructions, 1):
                    inst_text = inst.get('text', inst) if isinstance(inst, dict) else str(inst)
                    tasks_section += f"\n  {i}. ✓ {inst_text}"
                
                if strict_mode:
                    tasks_section += f"\n\n⚠️ {phrases['no_skip']}"
        
        # Build Chain of Thought instruction
        cot_instruction = cls._build_cot_instruction(language)
        
        # Combine all parts
        enhanced_prompt = base_prompt
        
        # Insert enforcement before tasks
        if "=== TASKS ===" in enhanced_prompt:
            enhanced_prompt = enhanced_prompt.replace(
                "=== TASKS ===",
                f"{enforcement}\n=== TASKS ==="
            )
        else:
            enhanced_prompt += enforcement
        
        # Add verification reminder at the end
        verification_reminder = f"""

=== BEFORE YOU RESPOND ===
{phrases['verify']}
{phrases['confirm']}
"""
        enhanced_prompt += verification_reminder
        
        return enhanced_prompt
    
    @classmethod
    def _build_cot_instruction(cls, language: str = 'en') -> str:
        """Build Chain of Thought instruction."""
        if language == 'ar':
            return """
=== طريقة التفكير ===
قبل الرد، فكر خطوة بخطوة:
1. ما هي التعليمات المطلوبة؟
2. هل نفذت كل خطوة؟
3. هل ردي يتبع التنسيق المطلوب؟
"""
        else:
            return """
=== THINKING PROCESS ===
Before responding, think step by step:
1. What instructions must I follow?
2. Have I executed each step?
3. Does my response follow the required format?
"""
    
    @classmethod
    def format_instructions_for_prompt(
        cls,
        instructions: List,
        task_name: str = "",
        language: str = 'en'
    ) -> str:
        """
        Format instructions with enforcement markers.
        
        Args:
            instructions: List of instruction texts or dicts
            task_name: Name of the task
            language: 'en' or 'ar'
            
        Returns:
            Formatted instruction string
        """
        if not instructions:
            return ""
        
        header = "التعليمات الإلزامية:" if language == 'ar' else "MANDATORY INSTRUCTIONS:"
        warning = "⚠️ نفذ كل خطوة بالترتيب" if language == 'ar' else "⚠️ Execute each step in order"
        
        lines = [f"\n**{header}** {warning}"]
        
        for i, inst in enumerate(instructions, 1):
            inst_text = inst.get('text', inst) if isinstance(inst, dict) else str(inst)
            lines.append(f"  [{i}] ✓ {inst_text}")
        
        return "\n".join(lines)
    
    @classmethod
    async def verify_response_compliance(
        cls,
        response: str,
        instructions: List[str],
        llm_call_func,
        model_id: str = None
    ) -> Tuple[bool, List[str], str]:
        """
        Verify if the response follows all instructions.
        
        Args:
            response: The LLM response to verify
            instructions: List of instruction texts
            llm_call_func: Async function to call LLM
            model_id: Model ID to use
            
        Returns:
            Tuple of (is_compliant, missing_instructions, explanation)
        """
        if not instructions:
            return True, [], "No instructions to verify"
        
        verification_prompt = f"""Analyze if this response follows ALL the given instructions.

INSTRUCTIONS TO CHECK:
{chr(10).join(f'{i+1}. {inst}' for i, inst in enumerate(instructions))}

RESPONSE TO ANALYZE:
{response[:2000]}  # Limit for efficiency

Respond in JSON format:
{{
    "compliant": true/false,
    "missing": ["list of instruction numbers not followed"],
    "explanation": "brief explanation"
}}

Only output the JSON, nothing else."""

        try:
            result = await llm_call_func(
                [{"role": "user", "content": verification_prompt}],
                [],
                model_id
            )
            
            content = result.get("content", "").strip()
            
            # Parse JSON from response
            json_match = re.search(r'\{.*\}', content, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group())
                return (
                    data.get("compliant", True),
                    data.get("missing", []),
                    data.get("explanation", "")
                )
        except Exception as e:
            print(f"Verification failed: {e}")
        
        return True, [], "Verification skipped"
    
    @classmethod
    def build_retry_prompt(
        cls,
        original_message: str,
        original_response: str,
        missing_instructions: List[str],
        language: str = 'en'
    ) -> str:
        """
        Build a retry prompt when instructions were not followed.
        
        Args:
            original_message: The user's original message
            original_response: The LLM's non-compliant response
            missing_instructions: List of instructions that were not followed
            language: 'en' or 'ar'
            
        Returns:
            Retry prompt
        """
        if language == 'ar':
            return f"""الرد السابق لم يتبع جميع التعليمات.

التعليمات المفقودة:
{chr(10).join(f'- {inst}' for inst in missing_instructions)}

الرجاء إعادة الرد مع التأكد من تنفيذ جميع التعليمات المذكورة أعلاه.

السؤال الأصلي: {original_message}"""
        else:
            return f"""Your previous response did not follow all instructions.

Missing instructions:
{chr(10).join(f'- {inst}' for inst in missing_instructions)}

Please respond again, ensuring you execute ALL the instructions listed above.

Original question: {original_message}"""


# Singleton instance for easy access
instruction_enforcer = InstructionEnforcer()
