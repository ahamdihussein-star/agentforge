"""
AgentForge - LLM Base Interface
All LLM providers must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional, AsyncIterator, Union
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum
from datetime import datetime


class MessageRole(str, Enum):
    """Message roles in a conversation"""
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class Message(BaseModel):
    """A single message in a conversation"""
    role: MessageRole
    content: str
    name: Optional[str] = None  # For tool messages
    tool_call_id: Optional[str] = None  # For tool results
    tool_calls: Optional[List[Dict[str, Any]]] = None  # For assistant tool calls


class ToolCall(BaseModel):
    """A tool call made by the LLM"""
    id: str
    name: str
    arguments: Dict[str, Any]


class LLMResponse(BaseModel):
    """Response from an LLM"""
    content: Optional[str] = None
    tool_calls: Optional[List[ToolCall]] = None
    finish_reason: str = "stop"
    
    # Usage info
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    
    # Metadata
    model: str = ""
    latency_ms: float = 0.0


class LLMCapability(str, Enum):
    """Capabilities that an LLM may support"""
    CHAT = "chat"
    VISION = "vision"
    FUNCTION_CALLING = "function_calling"
    JSON_MODE = "json_mode"
    STREAMING = "streaming"
    AUDIO_INPUT = "audio_input"
    AUDIO_OUTPUT = "audio_output"


class LLMStrength(str, Enum):
    """Areas where an LLM excels"""
    CODING = "coding"
    REASONING = "reasoning"
    CREATIVE = "creative"
    ANALYSIS = "analysis"
    ARABIC = "arabic"
    FAST_RESPONSE = "fast_response"
    LONG_CONTEXT = "long_context"
    ACCURACY = "accuracy"
    MATH = "math"
    MULTILINGUAL = "multilingual"


class LLMConfig(BaseModel):
    """Configuration for a registered LLM"""

    model_config = ConfigDict(protected_namespaces=())

    # Identity
    id: str = Field(..., description="Unique identifier for this model config")
    display_name: str = Field(..., description="Human-readable name")
    provider: str = Field(..., description="Provider: openai, anthropic, azure, ollama, custom")
    model_id: str = Field(..., description="Actual model name to send to API")
    
    # Connection
    api_key: Optional[str] = Field(None, description="API key (stored securely)")
    base_url: Optional[str] = Field(None, description="Custom API endpoint")
    api_version: Optional[str] = Field(None, description="API version (for Azure)")
    custom_headers: Optional[Dict[str, str]] = Field(None, description="Additional headers")
    
    # Capabilities
    capabilities: List[LLMCapability] = Field(default_factory=list)
    strengths: List[LLMStrength] = Field(default_factory=list)
    
    # Properties
    context_window: int = Field(4096, description="Maximum context length in tokens")
    max_output_tokens: int = Field(4096, description="Maximum output tokens")
    
    # Cost (per 1M tokens)
    input_cost: float = Field(0.0, description="Cost per 1M input tokens in USD")
    output_cost: float = Field(0.0, description="Cost per 1M output tokens in USD")
    
    # Performance
    speed_rating: int = Field(3, ge=1, le=5, description="Speed rating 1-5")
    
    # Status
    is_active: bool = Field(True, description="Whether this model is available")
    
    # Metadata
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        use_enum_values = True


class BaseLLM(ABC):
    """
    Abstract base class for all LLM providers.
    
    All LLM implementations must inherit from this class and implement
    the abstract methods.
    """
    
    def __init__(self, config: LLMConfig):
        """
        Initialize the LLM with configuration.
        
        Args:
            config: LLM configuration
        """
        self.config = config
        self._validate_config()
    
    def _validate_config(self):
        """Validate the configuration. Override in subclasses for specific validation."""
        pass
    
    @abstractmethod
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Send messages to the LLM and get a response.
        
        Args:
            messages: List of conversation messages
            tools: Optional list of tool definitions (OpenAI function format)
            temperature: Sampling temperature (0-2)
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Returns:
            LLMResponse with content and/or tool calls
        """
        pass
    
    @abstractmethod
    async def stream(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncIterator[Union[str, ToolCall]]:
        """
        Stream response tokens from the LLM.
        
        Args:
            messages: List of conversation messages
            tools: Optional list of tool definitions
            temperature: Sampling temperature
            max_tokens: Maximum tokens to generate
            **kwargs: Additional provider-specific parameters
            
        Yields:
            String tokens or ToolCall objects
        """
        pass
    
    async def test_connection(self) -> bool:
        """
        Test if the LLM is accessible.
        
        Returns:
            True if connection successful
        """
        try:
            response = await self.chat([
                Message(role=MessageRole.USER, content="Hi")
            ], max_tokens=5)
            return response.content is not None
        except Exception:
            return False
    
    def supports_capability(self, capability: LLMCapability) -> bool:
        """Check if the LLM supports a capability."""
        return capability in self.config.capabilities
    
    def has_strength(self, strength: LLMStrength) -> bool:
        """Check if the LLM is strong in an area."""
        return strength in self.config.strengths
    
    def estimate_cost(self, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Estimate the cost of a request.
        
        Args:
            prompt_tokens: Number of input tokens
            completion_tokens: Number of output tokens
            
        Returns:
            Estimated cost in USD
        """
        input_cost = (prompt_tokens / 1_000_000) * self.config.input_cost
        output_cost = (completion_tokens / 1_000_000) * self.config.output_cost
        return input_cost + output_cost
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id={self.config.id}, model={self.config.model_id})"


async def call_llm_simple(
    system_prompt: str,
    user_prompt: str,
    model_id: str = None,
    max_tokens: int = 100,
    temperature: float = 0.7
) -> Optional[str]:
    """
    Simple helper to call LLM with just system and user prompts.
    Uses the system's default model if model_id not specified.
    
    Args:
        system_prompt: The system prompt
        user_prompt: The user prompt
        model_id: Optional specific model to use
        max_tokens: Maximum tokens to generate
        temperature: Sampling temperature
        
    Returns:
        The LLM response content, or None if failed
    """
    try:
        from .factory import LLMFactory
        from .registry import LLMRegistry, DEFAULT_MODEL_PRESETS
        import os
        
        print(f"🔧 [call_llm_simple] Getting LLM for model_id={model_id}")
        
        # Get model config
        # First, try to use a simple approach - create LLM directly from model_id
        config = None
        
        # Check if model_id matches a preset (e.g., "gpt-4o", "gpt-4o-mini")
        if model_id:
            # Try exact match first
            if model_id in DEFAULT_MODEL_PRESETS:
                config = DEFAULT_MODEL_PRESETS[model_id]
            # Try partial match (e.g., "gpt-4o" in "gpt-4o-2024-05-13")
            else:
                for preset_id, preset_config in DEFAULT_MODEL_PRESETS.items():
                    if preset_id in model_id or model_id in preset_id:
                        config = preset_config
                        break
        
        # Default to gpt-4o-mini (fast and cheap for title generation)
        if not config:
            config = DEFAULT_MODEL_PRESETS.get("gpt-4o-mini") or DEFAULT_MODEL_PRESETS.get("gpt-4o")
        
        if not config:
            print("⚠️ No LLM config found")
            return None
        
        print(f"🔧 [call_llm_simple] Using model: {config.display_name}")
        
        # Create LLM instance
        llm = LLMFactory.create(config)
        
        if not llm:
            print("⚠️ No LLM available for simple call")
            return None
        
        print(f"🔧 [call_llm_simple] Got LLM: {llm}")
        
        # Build messages
        messages = [
            Message(role=MessageRole.SYSTEM, content=system_prompt),
            Message(role=MessageRole.USER, content=user_prompt)
        ]
        
        # Call LLM
        print(f"🔧 [call_llm_simple] Calling LLM.chat()...")
        response = await llm.chat(
            messages=messages,
            max_tokens=max_tokens,
            temperature=temperature
        )
        
        print(f"🔧 [call_llm_simple] Response: {response.content[:100] if response.content else 'None'}...")
        return response.content
        
    except Exception as e:
        print(f"⚠️ call_llm_simple failed: {e}")
        import traceback
        traceback.print_exc()
        return None
