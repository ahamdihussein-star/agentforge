"""
AgentForge - LLM Router
Intelligent routing to select the best LLM for each prompt.
"""

import re
from typing import List, Dict, Any, Optional, Tuple
from enum import Enum
from pydantic import BaseModel

from .base import LLMConfig, LLMCapability, LLMStrength
from .registry import LLMRegistry


class OptimizeFor(str, Enum):
    """Optimization strategy for model selection"""
    QUALITY = "quality"
    COST = "cost"
    SPEED = "speed"
    BALANCED = "balanced"


class PromptAnalysis(BaseModel):
    """Analysis of a prompt for routing decisions"""
    
    # Language
    detected_language: str = "english"
    is_multilingual: bool = False
    
    # Content type
    has_code: bool = False
    has_math: bool = False
    requires_vision: bool = False
    requires_audio: bool = False
    
    # Complexity
    complexity: str = "medium"  # simple, medium, complex
    estimated_tokens: int = 0
    
    # Task type
    task_type: str = "chat"  # coding, reasoning, creative, chat, analysis, math
    
    # Requirements
    requires_function_calling: bool = False
    requires_json_output: bool = False
    requires_streaming: bool = False


class RoutingDecision(BaseModel):
    """Result of a routing decision"""
    model: LLMConfig
    reason: str
    score: float
    alternatives: List[str] = []


class PromptAnalyzer:
    """Analyzes prompts to determine routing requirements"""
    
    # Pattern matchers
    CODE_PATTERNS = [
        r'```', r'def\s+\w+', r'function\s+\w+', r'class\s+\w+',
        r'import\s+', r'from\s+\w+\s+import', r'const\s+', r'let\s+', r'var\s+',
        r'public\s+class', r'private\s+', r'return\s+',
        r'\bcode\b', r'\bscript\b', r'\bprogram\b', r'\bdebug\b', r'\berror\b',
        r'\bpython\b', r'\bjavascript\b', r'\bjava\b', r'\bsql\b', r'\bhtml\b', r'\bcss\b'
    ]
    
    MATH_PATTERNS = [
        r'\bcalculate\b', r'\bcompute\b', r'\bsolve\b', r'\bequation\b',
        r'\bformula\b', r'\bmath\b', r'\balgebra\b', r'\bcalculus\b',
        r'\d+\s*[\+\-\*\/\^]\s*\d+', r'\d+%', r'\$\d+',
        r'\bsum\b', r'\baverage\b', r'\btotal\b'
    ]
    
    REASONING_PATTERNS = [
        r'\bwhy\b', r'\bexplain\b', r'\banalyze\b', r'\bcompare\b',
        r'\breason\b', r'\bcause\b', r'\beffect\b', r'\bconsequence\b',
        r'\badvantage\b', r'\bdisadvantage\b', r'\bpros\b', r'\bcons\b',
        r'\bshould\s+i\b', r'\bwhat\s+if\b'
    ]
    
    CREATIVE_PATTERNS = [
        r'\bwrite\b', r'\bstory\b', r'\bcreative\b', r'\bimagine\b',
        r'\bpoem\b', r'\bsong\b', r'\bfiction\b', r'\bnarrative\b',
        r'\bdescribe\b', r'\bdesign\b', r'\bcreate\b', r'\binvent\b'
    ]
    
    ANALYSIS_PATTERNS = [
        r'\bdata\b', r'\breport\b', r'\bsummarize\b', r'\bextract\b',
        r'\bfind\b', r'\bpattern\b', r'\btrend\b', r'\binsight\b',
        r'\bstatistics\b', r'\bmetrics\b', r'\bkpi\b'
    ]
    
    ARABIC_PATTERN = re.compile(r'[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]')
    
    def analyze(self, prompt: str, context: Dict[str, Any] = None) -> PromptAnalysis:
        """
        Analyze a prompt to determine routing requirements.
        
        Args:
            prompt: The user's prompt
            context: Additional context (e.g., has images, requires streaming)
            
        Returns:
            PromptAnalysis with detected characteristics
        """
        context = context or {}
        prompt_lower = prompt.lower()
        
        # Detect language
        arabic_chars = len(self.ARABIC_PATTERN.findall(prompt))
        total_chars = len(prompt.replace(' ', ''))
        
        if total_chars > 0 and arabic_chars / total_chars > 0.3:
            detected_language = "arabic"
        else:
            detected_language = "english"
        
        # Detect code
        has_code = any(
            re.search(pattern, prompt, re.IGNORECASE)
            for pattern in self.CODE_PATTERNS
        )
        
        # Detect math
        has_math = any(
            re.search(pattern, prompt, re.IGNORECASE)
            for pattern in self.MATH_PATTERNS
        )
        
        # Detect task type
        task_type = self._detect_task_type(prompt_lower)
        
        # Estimate complexity
        word_count = len(prompt.split())
        if word_count < 20:
            complexity = "simple"
        elif word_count < 100:
            complexity = "medium"
        else:
            complexity = "complex"
        
        # Estimate tokens (rough: 1 word ≈ 1.3 tokens)
        estimated_tokens = int(word_count * 1.3)
        
        return PromptAnalysis(
            detected_language=detected_language,
            is_multilingual=arabic_chars > 0 and arabic_chars / total_chars < 0.9,
            has_code=has_code,
            has_math=has_math,
            requires_vision=context.get("has_images", False),
            requires_audio=context.get("has_audio", False),
            complexity=complexity,
            estimated_tokens=estimated_tokens,
            task_type=task_type,
            requires_function_calling=context.get("has_tools", False),
            requires_json_output=context.get("json_output", False),
            requires_streaming=context.get("streaming", False)
        )
    
    def _detect_task_type(self, prompt_lower: str) -> str:
        """Detect the primary task type"""
        
        # Check patterns in order of specificity
        if any(re.search(p, prompt_lower) for p in self.CODE_PATTERNS[:10]):
            return "coding"
        
        if any(re.search(p, prompt_lower) for p in self.MATH_PATTERNS):
            return "math"
        
        if any(re.search(p, prompt_lower) for p in self.REASONING_PATTERNS):
            return "reasoning"
        
        if any(re.search(p, prompt_lower) for p in self.CREATIVE_PATTERNS):
            return "creative"
        
        if any(re.search(p, prompt_lower) for p in self.ANALYSIS_PATTERNS):
            return "analysis"
        
        return "chat"


class LLMRouter:
    """
    Intelligent router that selects the best LLM for each prompt.
    
    The router analyzes the prompt and context to determine the best
    model based on task type, capabilities needed, and optimization goals.
    """
    
    # Task type to strength mapping
    TASK_STRENGTH_MAP = {
        "coding": LLMStrength.CODING,
        "math": LLMStrength.MATH,
        "reasoning": LLMStrength.REASONING,
        "creative": LLMStrength.CREATIVE,
        "analysis": LLMStrength.ANALYSIS,
        "chat": LLMStrength.FAST_RESPONSE,
    }
    
    def __init__(
        self,
        registry: LLMRegistry,
        default_model: Optional[str] = None,
        task_model_overrides: Optional[Dict[str, str]] = None
    ):
        """
        Initialize the router.
        
        Args:
            registry: LLM registry to select models from
            default_model: Default model ID if routing fails
            task_model_overrides: Manual overrides for specific tasks
        """
        self.registry = registry
        self.analyzer = PromptAnalyzer()
        self.default_model = default_model
        self.task_model_overrides = task_model_overrides or {}
    
    def route(
        self,
        prompt: str,
        available_models: Optional[List[str]] = None,
        optimize_for: OptimizeFor = OptimizeFor.BALANCED,
        context: Optional[Dict[str, Any]] = None
    ) -> RoutingDecision:
        """
        Select the best model for a given prompt.
        
        Args:
            prompt: The user's prompt
            available_models: List of model IDs to consider (None = all)
            optimize_for: Optimization strategy
            context: Additional context (has_images, has_tools, etc.)
            
        Returns:
            RoutingDecision with selected model and reasoning
        """
        # Analyze prompt
        analysis = self.analyzer.analyze(prompt, context)
        
        # Check for task override
        if analysis.task_type in self.task_model_overrides:
            override_model = self.registry.get(self.task_model_overrides[analysis.task_type])
            if override_model:
                return RoutingDecision(
                    model=override_model,
                    reason=f"Task override: {analysis.task_type} → {override_model.display_name}",
                    score=100.0
                )
        
        # Get candidate models
        if available_models:
            candidates = [
                self.registry.get(m) for m in available_models
                if self.registry.get(m) and self.registry.get(m).is_active
            ]
        else:
            candidates = self.registry.list_all()
        
        if not candidates:
            raise ValueError("No models available for routing")
        
        # Filter by required capabilities
        candidates = self._filter_by_requirements(candidates, analysis)
        
        if not candidates:
            # Fall back to default or first available
            if self.default_model:
                default = self.registry.get(self.default_model)
                if default:
                    return RoutingDecision(
                        model=default,
                        reason="Fallback to default model (no candidates met requirements)",
                        score=0.0
                    )
            raise ValueError("No models meet the requirements")
        
        # Score candidates
        scored = []
        for model in candidates:
            score = self._score_model(model, analysis, optimize_for)
            scored.append((model, score))
        
        # Sort by score (descending)
        scored.sort(key=lambda x: x[1], reverse=True)
        
        # Select best
        best_model, best_score = scored[0]
        
        # Get alternatives
        alternatives = [m.id for m, s in scored[1:4]]
        
        # Generate reason
        reason = self._generate_reason(best_model, analysis, optimize_for)
        
        return RoutingDecision(
            model=best_model,
            reason=reason,
            score=best_score,
            alternatives=alternatives
        )
    
    def _filter_by_requirements(
        self,
        candidates: List[LLMConfig],
        analysis: PromptAnalysis
    ) -> List[LLMConfig]:
        """Filter candidates by required capabilities"""
        
        filtered = candidates
        
        # Vision required
        if analysis.requires_vision:
            filtered = [c for c in filtered if LLMCapability.VISION in c.capabilities]
        
        # Function calling required
        if analysis.requires_function_calling:
            filtered = [c for c in filtered if LLMCapability.FUNCTION_CALLING in c.capabilities]
        
        # JSON output required
        if analysis.requires_json_output:
            filtered = [c for c in filtered if LLMCapability.JSON_MODE in c.capabilities]
        
        # Context window check
        if analysis.estimated_tokens > 4096:
            filtered = [c for c in filtered if c.context_window >= analysis.estimated_tokens * 2]
        
        return filtered
    
    def _score_model(
        self,
        model: LLMConfig,
        analysis: PromptAnalysis,
        optimize_for: OptimizeFor
    ) -> float:
        """Score a model for the given prompt"""
        
        score = 50.0  # Base score
        
        # Task match bonus
        task_strength = self.TASK_STRENGTH_MAP.get(analysis.task_type)
        if task_strength and task_strength in model.strengths:
            score += 25.0
        
        # Language match
        if analysis.detected_language == "arabic" and LLMStrength.ARABIC in model.strengths:
            score += 20.0
        elif analysis.detected_language == "arabic" and LLMStrength.MULTILINGUAL in model.strengths:
            score += 10.0
        
        # Complexity match
        if analysis.complexity == "simple" and LLMStrength.FAST_RESPONSE in model.strengths:
            score += 10.0
        elif analysis.complexity == "complex" and LLMStrength.ACCURACY in model.strengths:
            score += 10.0
        
        # Code bonus
        if analysis.has_code and LLMStrength.CODING in model.strengths:
            score += 15.0
        
        # Math bonus
        if analysis.has_math and LLMStrength.MATH in model.strengths:
            score += 15.0
        
        # Optimization adjustments
        if optimize_for == OptimizeFor.QUALITY:
            # Prefer higher capability models
            score += len(model.capabilities) * 2
            score += len(model.strengths) * 2
            if LLMStrength.ACCURACY in model.strengths:
                score += 10.0
                
        elif optimize_for == OptimizeFor.COST:
            # Prefer cheaper models
            total_cost = model.input_cost + model.output_cost
            if total_cost == 0:
                score += 50.0  # Free models
            elif total_cost < 5:
                score += 30.0
            elif total_cost < 20:
                score += 10.0
            else:
                score -= 10.0
                
        elif optimize_for == OptimizeFor.SPEED:
            # Prefer faster models
            score += model.speed_rating * 10
            if LLMStrength.FAST_RESPONSE in model.strengths:
                score += 20.0
                
        elif optimize_for == OptimizeFor.BALANCED:
            # Balance all factors
            score += model.speed_rating * 3
            score += (50 - (model.input_cost + model.output_cost)) * 0.3
            score += len(model.strengths) * 2
        
        return score
    
    def _generate_reason(
        self,
        model: LLMConfig,
        analysis: PromptAnalysis,
        optimize_for: OptimizeFor
    ) -> str:
        """Generate human-readable routing reason"""
        
        reasons = []
        
        # Task match
        task_strength = self.TASK_STRENGTH_MAP.get(analysis.task_type)
        if task_strength and task_strength in model.strengths:
            reasons.append(f"excellent for {analysis.task_type}")
        
        # Language
        if analysis.detected_language == "arabic":
            if LLMStrength.ARABIC in model.strengths:
                reasons.append("strong Arabic support")
            elif LLMStrength.MULTILINGUAL in model.strengths:
                reasons.append("good multilingual support")
        
        # Optimization
        if optimize_for == OptimizeFor.COST:
            cost = model.input_cost + model.output_cost
            if cost == 0:
                reasons.append("free (self-hosted)")
            elif cost < 5:
                reasons.append("very cost-effective")
                
        elif optimize_for == OptimizeFor.SPEED:
            if model.speed_rating >= 4:
                reasons.append("fast response time")
        
        if not reasons:
            reasons.append("best overall match")
        
        return f"Selected {model.display_name}: {', '.join(reasons)}"
    
    def explain_routing(self, prompt: str, context: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Explain how routing would work for a prompt (for debugging).
        
        Returns detailed analysis without actually routing.
        """
        analysis = self.analyzer.analyze(prompt, context)
        
        return {
            "analysis": analysis.dict(),
            "task_type": analysis.task_type,
            "detected_language": analysis.detected_language,
            "complexity": analysis.complexity,
            "required_capabilities": [
                cap for cap, needed in [
                    (LLMCapability.VISION, analysis.requires_vision),
                    (LLMCapability.FUNCTION_CALLING, analysis.requires_function_calling),
                    (LLMCapability.JSON_MODE, analysis.requires_json_output),
                ] if needed
            ],
            "recommended_strength": self.TASK_STRENGTH_MAP.get(analysis.task_type)
        }
