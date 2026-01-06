"""
AgentForge - OpenAI LLM Provider
Supports OpenAI API and compatible endpoints.
"""

import json
import time
from typing import List, Dict, Any, Optional, AsyncIterator, Union

try:
    from openai import AsyncOpenAI
except ImportError:
    AsyncOpenAI = None

from ..base import (
    BaseLLM, LLMConfig, LLMResponse, LLMCapability,
    Message, MessageRole, ToolCall
)


class OpenAILLM(BaseLLM):
    """
    OpenAI LLM provider.
    
    Supports:
    - OpenAI API (api.openai.com)
    - Azure OpenAI
    - Any OpenAI-compatible API (Ollama, vLLM, LocalAI, etc.)
    """
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        
        if AsyncOpenAI is None:
            raise ImportError("openai package is required. Install with: pip install openai")
        
        # Initialize client
        client_kwargs = {}
        
        if config.api_key:
            client_kwargs["api_key"] = config.api_key
        
        if config.base_url:
            client_kwargs["base_url"] = config.base_url
        
        if config.custom_headers:
            client_kwargs["default_headers"] = config.custom_headers
        
        self.client = AsyncOpenAI(**client_kwargs)
    
    def _validate_config(self):
        """Validate OpenAI-specific configuration."""
        if not self.config.api_key and not self.config.base_url:
            # Allow no API key for local endpoints
            pass
    
    def _convert_messages(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """Convert our Message format to OpenAI format."""
        openai_messages = []
        
        for msg in messages:
            openai_msg = {
                "role": msg.role.value,
                "content": msg.content or ""
            }
            
            if msg.name:
                openai_msg["name"] = msg.name
            
            if msg.tool_call_id:
                openai_msg["tool_call_id"] = msg.tool_call_id
            
            if msg.tool_calls:
                openai_msg["tool_calls"] = msg.tool_calls
            
            openai_messages.append(openai_msg)
        
        return openai_messages
    
    def _convert_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Ensure tools are in OpenAI function format."""
        openai_tools = []
        
        for tool in tools:
            if "type" in tool and tool["type"] == "function":
                # Already in correct format
                openai_tools.append(tool)
            else:
                # Convert to function format
                openai_tools.append({
                    "type": "function",
                    "function": tool
                })
        
        return openai_tools
    
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Send messages to OpenAI and get a response.
        """
        start_time = time.time()
        
        # Prepare request
        request_kwargs = {
            "model": self.config.model_id,
            "messages": self._convert_messages(messages),
            "temperature": temperature,
        }
        
        if max_tokens:
            request_kwargs["max_tokens"] = max_tokens
        
        if tools:
            request_kwargs["tools"] = self._convert_tools(tools)
        
        # Add any extra kwargs
        request_kwargs.update(kwargs)
        
        # Make request
        response = await self.client.chat.completions.create(**request_kwargs)
        
        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000
        
        # Parse response
        choice = response.choices[0]
        message = choice.message
        
        # Extract tool calls if present
        tool_calls = None
        if message.tool_calls:
            tool_calls = []
            for tc in message.tool_calls:
                try:
                    arguments = json.loads(tc.function.arguments)
                except json.JSONDecodeError:
                    arguments = {"raw": tc.function.arguments}
                
                tool_calls.append(ToolCall(
                    id=tc.id,
                    name=tc.function.name,
                    arguments=arguments
                ))
        
        return LLMResponse(
            content=message.content,
            tool_calls=tool_calls,
            finish_reason=choice.finish_reason or "stop",
            prompt_tokens=response.usage.prompt_tokens if response.usage else 0,
            completion_tokens=response.usage.completion_tokens if response.usage else 0,
            total_tokens=response.usage.total_tokens if response.usage else 0,
            model=response.model,
            latency_ms=latency_ms
        )
    
    async def stream(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> AsyncIterator[Union[str, ToolCall]]:
        """
        Stream response tokens from OpenAI.
        """
        # Prepare request
        request_kwargs = {
            "model": self.config.model_id,
            "messages": self._convert_messages(messages),
            "temperature": temperature,
            "stream": True,
        }
        
        if max_tokens:
            request_kwargs["max_tokens"] = max_tokens
        
        if tools:
            request_kwargs["tools"] = self._convert_tools(tools)
        
        request_kwargs.update(kwargs)
        
        # Stream response
        stream = await self.client.chat.completions.create(**request_kwargs)
        
        # Accumulate tool calls
        current_tool_calls: Dict[int, Dict] = {}
        
        async for chunk in stream:
            if not chunk.choices:
                continue
            
            delta = chunk.choices[0].delta
            
            # Yield content
            if delta.content:
                yield delta.content
            
            # Accumulate tool calls
            if delta.tool_calls:
                for tc in delta.tool_calls:
                    idx = tc.index
                    
                    if idx not in current_tool_calls:
                        current_tool_calls[idx] = {
                            "id": tc.id or "",
                            "name": tc.function.name if tc.function and tc.function.name else "",
                            "arguments": ""
                        }
                    
                    if tc.id:
                        current_tool_calls[idx]["id"] = tc.id
                    
                    if tc.function:
                        if tc.function.name:
                            current_tool_calls[idx]["name"] = tc.function.name
                        if tc.function.arguments:
                            current_tool_calls[idx]["arguments"] += tc.function.arguments
        
        # Yield completed tool calls
        for tc_data in current_tool_calls.values():
            try:
                arguments = json.loads(tc_data["arguments"])
            except json.JSONDecodeError:
                arguments = {"raw": tc_data["arguments"]}
            
            yield ToolCall(
                id=tc_data["id"],
                name=tc_data["name"],
                arguments=arguments
            )


class AzureOpenAILLM(OpenAILLM):
    """
    Azure OpenAI LLM provider.
    
    Extends OpenAI provider with Azure-specific configuration.
    """
    
    def __init__(self, config: LLMConfig):
        # Azure requires specific setup
        if AsyncOpenAI is None:
            raise ImportError("openai package is required. Install with: pip install openai")
        
        from openai import AsyncAzureOpenAI
        
        self.config = config
        self._validate_config()
        
        self.client = AsyncAzureOpenAI(
            api_key=config.api_key,
            api_version=config.api_version or "2024-02-15-preview",
            azure_endpoint=config.base_url
        )
    
    def _validate_config(self):
        """Validate Azure-specific configuration."""
        if not self.config.base_url:
            raise ValueError("Azure OpenAI requires base_url (azure_endpoint)")
        if not self.config.api_key:
            raise ValueError("Azure OpenAI requires api_key")
