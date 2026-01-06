"""
AgentForge - LLM Factory
Creates LLM instances from configurations.
"""

from typing import Type, Dict, Optional

from .base import BaseLLM, LLMConfig
from .registry import LLMRegistry


class LLMFactory:
    """
    Factory for creating LLM instances from configurations.
    
    The factory maintains a mapping of provider names to implementation classes
    and can create instances from LLMConfig objects.
    """
    
    # Provider name to class mapping
    _providers: Dict[str, Type[BaseLLM]] = {}
    
    @classmethod
    def register_provider(cls, name: str, provider_class: Type[BaseLLM]):
        """
        Register an LLM provider implementation.
        
        Args:
            name: Provider name (e.g., 'openai', 'anthropic')
            provider_class: Class implementing BaseLLM
        """
        cls._providers[name.lower()] = provider_class
    
    @classmethod
    def create(cls, config: LLMConfig) -> BaseLLM:
        """
        Create an LLM instance from configuration.
        
        Args:
            config: LLM configuration
            
        Returns:
            Initialized LLM instance
            
        Raises:
            ValueError: If provider is not registered
        """
        provider = config.provider.lower()
        
        if provider not in cls._providers:
            # Try to auto-load provider
            cls._auto_load_provider(provider)
        
        if provider not in cls._providers:
            raise ValueError(
                f"Unknown LLM provider: {provider}. "
                f"Available: {list(cls._providers.keys())}"
            )
        
        return cls._providers[provider](config)
    
    @classmethod
    def create_from_id(cls, model_id: str, registry: LLMRegistry) -> BaseLLM:
        """
        Create an LLM instance from a model ID using the registry.
        
        Args:
            model_id: Model ID in the registry
            registry: LLM registry
            
        Returns:
            Initialized LLM instance
            
        Raises:
            ValueError: If model not found in registry
        """
        config = registry.get(model_id)
        
        if not config:
            raise ValueError(f"Model not found in registry: {model_id}")
        
        return cls.create(config)
    
    @classmethod
    def _auto_load_provider(cls, provider: str):
        """Attempt to auto-load a provider module"""
        
        try:
            if provider in ['openai', 'azure', 'azure_openai']:
                from .providers.openai import OpenAILLM, AzureOpenAILLM
                cls._providers['openai'] = OpenAILLM
                cls._providers['azure'] = AzureOpenAILLM
                cls._providers['azure_openai'] = AzureOpenAILLM
                
            elif provider == 'anthropic':
                from .providers.anthropic import AnthropicLLM
                cls._providers['anthropic'] = AnthropicLLM
                
            elif provider == 'ollama':
                from .providers.ollama import OllamaLLM
                cls._providers['ollama'] = OllamaLLM
                
            elif provider in ['custom', 'openai_compatible']:
                # Custom providers use OpenAI-compatible interface
                from .providers.openai import OpenAILLM
                cls._providers['custom'] = OpenAILLM
                cls._providers['openai_compatible'] = OpenAILLM
                
        except ImportError as e:
            # Provider dependencies not installed
            pass
    
    @classmethod
    def list_providers(cls) -> list:
        """List all registered providers"""
        # Auto-load all known providers
        for provider in ['openai', 'anthropic', 'ollama']:
            cls._auto_load_provider(provider)
        
        return list(cls._providers.keys())
    
    @classmethod
    def is_provider_available(cls, provider: str) -> bool:
        """Check if a provider is available"""
        cls._auto_load_provider(provider.lower())
        return provider.lower() in cls._providers


# Initialize providers
def _init_providers():
    """Initialize default providers"""
    try:
        from .providers.openai import OpenAILLM, AzureOpenAILLM
        LLMFactory.register_provider('openai', OpenAILLM)
        LLMFactory.register_provider('azure', AzureOpenAILLM)
        LLMFactory.register_provider('azure_openai', AzureOpenAILLM)
        LLMFactory.register_provider('custom', OpenAILLM)
        LLMFactory.register_provider('openai_compatible', OpenAILLM)
    except ImportError:
        pass
    
    try:
        from .providers.anthropic import AnthropicLLM
        LLMFactory.register_provider('anthropic', AnthropicLLM)
    except ImportError:
        pass
    
    try:
        from .providers.ollama import OllamaLLM
        LLMFactory.register_provider('ollama', OllamaLLM)
    except ImportError:
        pass


# Auto-initialize on import
_init_providers()
