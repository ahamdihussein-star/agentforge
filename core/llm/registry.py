"""
AgentForge - LLM Registry
Manages all registered LLM models and their configurations.
"""

from typing import Dict, List, Optional, Type
from datetime import datetime
import json
import os

from .base import BaseLLM, LLMConfig, LLMCapability, LLMStrength


class LLMRegistry:
    """
    Registry for all available LLM models.
    
    The registry stores model configurations and provides methods
    to query and retrieve models based on various criteria.
    """
    
    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize the registry.
        
        Args:
            storage_path: Path to store model configurations (JSON file)
        """
        self._models: Dict[str, LLMConfig] = {}
        self._storage_path = storage_path
        
        if storage_path and os.path.exists(storage_path):
            self._load_from_file()
    
    def _load_from_file(self):
        """Load models from storage file."""
        try:
            with open(self._storage_path, 'r') as f:
                data = json.load(f)
                for model_data in data:
                    config = LLMConfig(**model_data)
                    self._models[config.id] = config
        except Exception as e:
            print(f"Warning: Could not load LLM registry: {e}")
    
    def _save_to_file(self):
        """Save models to storage file."""
        if not self._storage_path:
            return
        
        try:
            data = [model.dict() for model in self._models.values()]
            with open(self._storage_path, 'w') as f:
                json.dump(data, f, indent=2, default=str)
        except Exception as e:
            print(f"Warning: Could not save LLM registry: {e}")
    
    def register(self, config: LLMConfig) -> str:
        """
        Register a new LLM model.
        
        Args:
            config: LLM configuration
            
        Returns:
            Model ID
        """
        config.created_at = datetime.utcnow()
        config.updated_at = datetime.utcnow()
        
        self._models[config.id] = config
        self._save_to_file()
        
        return config.id
    
    def update(self, model_id: str, updates: Dict) -> Optional[LLMConfig]:
        """
        Update an existing model configuration.
        
        Args:
            model_id: Model ID to update
            updates: Dictionary of fields to update
            
        Returns:
            Updated config or None if not found
        """
        if model_id not in self._models:
            return None
        
        config = self._models[model_id]
        
        for key, value in updates.items():
            if hasattr(config, key):
                setattr(config, key, value)
        
        config.updated_at = datetime.utcnow()
        self._save_to_file()
        
        return config
    
    def unregister(self, model_id: str) -> bool:
        """
        Remove a model from the registry.
        
        Args:
            model_id: Model ID to remove
            
        Returns:
            True if removed, False if not found
        """
        if model_id in self._models:
            del self._models[model_id]
            self._save_to_file()
            return True
        return False
    
    def get(self, model_id: str) -> Optional[LLMConfig]:
        """
        Get a model configuration by ID.
        
        Args:
            model_id: Model ID
            
        Returns:
            LLMConfig or None if not found
        """
        return self._models.get(model_id)
    
    def list_all(self, active_only: bool = True) -> List[LLMConfig]:
        """
        List all registered models.
        
        Args:
            active_only: Only return active models
            
        Returns:
            List of model configurations
        """
        models = list(self._models.values())
        
        if active_only:
            models = [m for m in models if m.is_active]
        
        return models
    
    def get_by_provider(self, provider: str) -> List[LLMConfig]:
        """
        Get all models from a specific provider.
        
        Args:
            provider: Provider name (openai, anthropic, etc.)
            
        Returns:
            List of matching models
        """
        return [
            m for m in self.list_all()
            if m.provider.lower() == provider.lower()
        ]
    
    def get_by_capability(self, capability: LLMCapability) -> List[LLMConfig]:
        """
        Get models with a specific capability.
        
        Args:
            capability: Required capability
            
        Returns:
            List of models with that capability
        """
        return [
            m for m in self.list_all()
            if capability in m.capabilities
        ]
    
    def get_by_strength(self, strength: LLMStrength) -> List[LLMConfig]:
        """
        Get models strong in a specific area.
        
        Args:
            strength: Required strength
            
        Returns:
            List of models with that strength
        """
        return [
            m for m in self.list_all()
            if strength in m.strengths
        ]
    
    def get_cheapest(self, min_capabilities: List[LLMCapability] = None) -> Optional[LLMConfig]:
        """
        Get the cheapest model that meets minimum requirements.
        
        Args:
            min_capabilities: Required capabilities
            
        Returns:
            Cheapest matching model or None
        """
        candidates = self.list_all()
        
        if min_capabilities:
            candidates = [
                m for m in candidates
                if all(cap in m.capabilities for cap in min_capabilities)
            ]
        
        if not candidates:
            return None
        
        return min(candidates, key=lambda m: m.input_cost + m.output_cost)
    
    def get_fastest(self, min_capabilities: List[LLMCapability] = None) -> Optional[LLMConfig]:
        """
        Get the fastest model that meets minimum requirements.
        
        Args:
            min_capabilities: Required capabilities
            
        Returns:
            Fastest matching model or None
        """
        candidates = self.list_all()
        
        if min_capabilities:
            candidates = [
                m for m in candidates
                if all(cap in m.capabilities for cap in min_capabilities)
            ]
        
        if not candidates:
            return None
        
        return max(candidates, key=lambda m: m.speed_rating)
    
    def search(
        self,
        provider: Optional[str] = None,
        capabilities: Optional[List[LLMCapability]] = None,
        strengths: Optional[List[LLMStrength]] = None,
        min_context_window: Optional[int] = None,
        max_cost: Optional[float] = None
    ) -> List[LLMConfig]:
        """
        Search for models matching criteria.
        
        Args:
            provider: Filter by provider
            capabilities: Required capabilities
            strengths: Required strengths
            min_context_window: Minimum context window
            max_cost: Maximum cost per 1M tokens (input + output)
            
        Returns:
            List of matching models
        """
        candidates = self.list_all()
        
        if provider:
            candidates = [m for m in candidates if m.provider.lower() == provider.lower()]
        
        if capabilities:
            candidates = [
                m for m in candidates
                if all(cap in m.capabilities for cap in capabilities)
            ]
        
        if strengths:
            candidates = [
                m for m in candidates
                if all(s in m.strengths for s in strengths)
            ]
        
        if min_context_window:
            candidates = [m for m in candidates if m.context_window >= min_context_window]
        
        if max_cost:
            candidates = [m for m in candidates if (m.input_cost + m.output_cost) <= max_cost]
        
        return candidates
    
    def get_default_models(self) -> Dict[str, LLMConfig]:
        """
        Get recommended default models for common use cases.
        
        Returns:
            Dictionary mapping use case to recommended model
        """
        defaults = {}
        
        # Best overall
        all_models = self.list_all()
        if all_models:
            # Prefer models with more capabilities
            defaults["default"] = max(all_models, key=lambda m: len(m.capabilities))
        
        # Best for coding
        coding_models = self.get_by_strength(LLMStrength.CODING)
        if coding_models:
            defaults["coding"] = coding_models[0]
        
        # Cheapest
        cheapest = self.get_cheapest()
        if cheapest:
            defaults["budget"] = cheapest
        
        # Fastest
        fastest = self.get_fastest()
        if fastest:
            defaults["fast"] = fastest
        
        return defaults
    
    def load_from_env(self) -> None:
        """
        Load default models based on available environment variables.
        
        Checks for API keys and registers appropriate models:
        - OPENAI_API_KEY -> GPT-4o, GPT-4o-mini
        - ANTHROPIC_API_KEY -> Claude 3.5 Sonnet, Claude 3 Opus
        - OLLAMA_HOST -> Llama models (if Ollama is running)
        """
        import os
        
        # Check for OpenAI
        if os.getenv('OPENAI_API_KEY'):
            if 'gpt-4o' not in self._models:
                self._models['gpt-4o'] = DEFAULT_MODEL_PRESETS['gpt-4o']
            if 'gpt-4o-mini' not in self._models:
                self._models['gpt-4o-mini'] = DEFAULT_MODEL_PRESETS['gpt-4o-mini']
        
        # Check for Anthropic
        if os.getenv('ANTHROPIC_API_KEY'):
            if 'claude-3-5-sonnet' not in self._models:
                self._models['claude-3-5-sonnet'] = DEFAULT_MODEL_PRESETS['claude-3-5-sonnet']
            if 'claude-3-opus' not in self._models:
                self._models['claude-3-opus'] = DEFAULT_MODEL_PRESETS['claude-3-opus']
        
        # Check for Ollama
        if os.getenv('OLLAMA_HOST') or os.getenv('OLLAMA_URL'):
            if 'llama3-70b' not in self._models:
                self._models['llama3-70b'] = DEFAULT_MODEL_PRESETS['llama3-70b']
    
    def load_default_presets(self, providers: Optional[List[str]] = None) -> None:
        """
        Load default model presets.
        
        Args:
            providers: List of providers to load (None = all)
        """
        for model_id, config in DEFAULT_MODEL_PRESETS.items():
            if providers is None or config.provider in providers:
                if model_id not in self._models:
                    self._models[model_id] = config
    
    def __len__(self) -> int:
        return len(self._models)
    
    def __contains__(self, model_id: str) -> bool:
        return model_id in self._models


# Default preset configurations for common models
DEFAULT_MODEL_PRESETS = {
    "gpt-4o": LLMConfig(
        id="gpt-4o",
        display_name="GPT-4o",
        provider="openai",
        model_id="gpt-4o",
        capabilities=[
            LLMCapability.CHAT,
            LLMCapability.VISION,
            LLMCapability.FUNCTION_CALLING,
            LLMCapability.JSON_MODE,
            LLMCapability.STREAMING
        ],
        strengths=[
            LLMStrength.REASONING,
            LLMStrength.CODING,
            LLMStrength.ANALYSIS,
            LLMStrength.CREATIVE,
            LLMStrength.MULTILINGUAL
        ],
        context_window=128000,
        max_output_tokens=4096,
        input_cost=5.0,
        output_cost=15.0,
        speed_rating=4
    ),
    "gpt-4o-mini": LLMConfig(
        id="gpt-4o-mini",
        display_name="GPT-4o Mini",
        provider="openai",
        model_id="gpt-4o-mini",
        capabilities=[
            LLMCapability.CHAT,
            LLMCapability.VISION,
            LLMCapability.FUNCTION_CALLING,
            LLMCapability.JSON_MODE,
            LLMCapability.STREAMING
        ],
        strengths=[
            LLMStrength.FAST_RESPONSE,
            LLMStrength.CODING
        ],
        context_window=128000,
        max_output_tokens=16384,
        input_cost=0.15,
        output_cost=0.6,
        speed_rating=5
    ),
    "claude-3-5-sonnet": LLMConfig(
        id="claude-3-5-sonnet",
        display_name="Claude 3.5 Sonnet",
        provider="anthropic",
        model_id="claude-3-5-sonnet-20241022",
        capabilities=[
            LLMCapability.CHAT,
            LLMCapability.VISION,
            LLMCapability.FUNCTION_CALLING,
            LLMCapability.STREAMING
        ],
        strengths=[
            LLMStrength.CODING,
            LLMStrength.REASONING,
            LLMStrength.ANALYSIS,
            LLMStrength.CREATIVE,
            LLMStrength.LONG_CONTEXT
        ],
        context_window=200000,
        max_output_tokens=8192,
        input_cost=3.0,
        output_cost=15.0,
        speed_rating=4
    ),
    "claude-3-opus": LLMConfig(
        id="claude-3-opus",
        display_name="Claude 3 Opus",
        provider="anthropic",
        model_id="claude-3-opus-20240229",
        capabilities=[
            LLMCapability.CHAT,
            LLMCapability.VISION,
            LLMCapability.FUNCTION_CALLING,
            LLMCapability.STREAMING
        ],
        strengths=[
            LLMStrength.REASONING,
            LLMStrength.ANALYSIS,
            LLMStrength.ACCURACY,
            LLMStrength.LONG_CONTEXT
        ],
        context_window=200000,
        max_output_tokens=4096,
        input_cost=15.0,
        output_cost=75.0,
        speed_rating=3
    ),
    "llama3-70b": LLMConfig(
        id="llama3-70b",
        display_name="Llama 3 70B (Local)",
        provider="ollama",
        model_id="llama3:70b",
        capabilities=[
            LLMCapability.CHAT,
            LLMCapability.STREAMING
        ],
        strengths=[
            LLMStrength.REASONING,
            LLMStrength.CODING
        ],
        context_window=8192,
        max_output_tokens=4096,
        input_cost=0.0,  # Free (self-hosted)
        output_cost=0.0,
        speed_rating=2  # Depends on hardware
    ),
}
