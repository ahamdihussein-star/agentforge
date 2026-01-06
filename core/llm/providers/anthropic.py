"""
AgentForge - Anthropic LLM Provider
Supports Claude models via Anthropic API.
"""

import json
import time
from typing import List, Dict, Any, Optional, AsyncIterator, Union

try:
    from anthropic import AsyncAnthropic
except ImportError:
    AsyncAnthropic = None

from ..base import (
    BaseLLM, LLMConfig, LLMResponse, LLMCapability,
    Message, MessageRole, ToolCall
)


class AnthropicLLM(BaseLLM):
    """
    Anthropic Claude LLM provider.
    
    Supports all Claude models via the Anthropic API.
    """
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        
        if AsyncAnthropic is None:
            raise ImportError("anthropic package is required. Install with: pip install anthropic")
        
        client_kwargs = {}
        
        if config.api_key:
            client_kwargs["api_key"] = config.api_key
        
        if config.base_url:
            client_kwargs["base_url"] = config.base_url
        
        self.client = AsyncAnthropic(**client_kwargs)
    
    def _validate_config(self):
        """Validate Anthropic-specific configuration."""
        if not self.config.api_key:
            raise ValueError("Anthropic requires an API key")
    
    def _convert_messages(self, messages: List[Message]) -> tuple:
        """
        Convert our Message format to Anthropic format.
        
        Returns:
            (system_prompt, messages_list)
        """
        system_prompt = None
        anthropic_messages = []
        
        for msg in messages:
            if msg.role == MessageRole.SYSTEM:
                system_prompt = msg.content
            elif msg.role == MessageRole.USER:
                anthropic_messages.append({
                    "role": "user",
                    "content": msg.content
                })
            elif msg.role == MessageRole.ASSISTANT:
                if msg.tool_calls:
                    # Assistant message with tool use
                    content = []
                    if msg.content:
                        content.append({"type": "text", "text": msg.content})
                    
                    for tc in msg.tool_calls:
                        content.append({
                            "type": "tool_use",
                            "id": tc.get("id", ""),
                            "name": tc.get("function", {}).get("name", ""),
                            "input": json.loads(tc.get("function", {}).get("arguments", "{}"))
                        })
                    
                    anthropic_messages.append({
                        "role": "assistant",
                        "content": content
                    })
                else:
                    anthropic_messages.append({
                        "role": "assistant",
                        "content": msg.content
                    })
            elif msg.role == MessageRole.TOOL:
                # Tool result
                anthropic_messages.append({
                    "role": "user",
                    "content": [{
                        "type": "tool_result",
                        "tool_use_id": msg.tool_call_id,
                        "content": msg.content
                    }]
                })
        
        return system_prompt, anthropic_messages
    
    def _convert_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert OpenAI tool format to Anthropic format."""
        anthropic_tools = []
        
        for tool in tools:
            if "type" in tool and tool["type"] == "function":
                func = tool["function"]
            else:
                func = tool
            
            anthropic_tools.append({
                "name": func["name"],
                "description": func.get("description", ""),
                "input_schema": func.get("parameters", {"type": "object", "properties": {}})
            })
        
        return anthropic_tools
    
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Send messages to Claude and get a response.
        """
        start_time = time.time()
        
        # Convert messages
        system_prompt, anthropic_messages = self._convert_messages(messages)
        
        # Prepare request
        request_kwargs = {
            "model": self.config.model_id,
            "messages": anthropic_messages,
            "max_tokens": max_tokens or 4096,
            "temperature": temperature,
        }
        
        if system_prompt:
            request_kwargs["system"] = system_prompt
        
        if tools:
            request_kwargs["tools"] = self._convert_tools(tools)
        
        request_kwargs.update(kwargs)
        
        # Make request
        response = await self.client.messages.create(**request_kwargs)
        
        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000
        
        # Parse response
        content = None
        tool_calls = None
        
        for block in response.content:
            if block.type == "text":
                content = block.text
            elif block.type == "tool_use":
                if tool_calls is None:
                    tool_calls = []
                tool_calls.append(ToolCall(
                    id=block.id,
                    name=block.name,
                    arguments=block.input
                ))
        
        return LLMResponse(
            content=content,
            tool_calls=tool_calls,
            finish_reason=response.stop_reason or "stop",
            prompt_tokens=response.usage.input_tokens,
            completion_tokens=response.usage.output_tokens,
            total_tokens=response.usage.input_tokens + response.usage.output_tokens,
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
        Stream response tokens from Claude.
        """
        # Convert messages
        system_prompt, anthropic_messages = self._convert_messages(messages)
        
        # Prepare request
        request_kwargs = {
            "model": self.config.model_id,
            "messages": anthropic_messages,
            "max_tokens": max_tokens or 4096,
            "temperature": temperature,
            "stream": True,
        }
        
        if system_prompt:
            request_kwargs["system"] = system_prompt
        
        if tools:
            request_kwargs["tools"] = self._convert_tools(tools)
        
        request_kwargs.update(kwargs)
        
        # Stream response
        current_tool_call = None
        
        async with self.client.messages.stream(**request_kwargs) as stream:
            async for event in stream:
                if event.type == "content_block_delta":
                    delta = event.delta
                    
                    if hasattr(delta, "text"):
                        yield delta.text
                    elif hasattr(delta, "partial_json"):
                        if current_tool_call:
                            current_tool_call["arguments"] += delta.partial_json
                
                elif event.type == "content_block_start":
                    block = event.content_block
                    if block.type == "tool_use":
                        current_tool_call = {
                            "id": block.id,
                            "name": block.name,
                            "arguments": ""
                        }
                
                elif event.type == "content_block_stop":
                    if current_tool_call:
                        try:
                            arguments = json.loads(current_tool_call["arguments"])
                        except json.JSONDecodeError:
                            arguments = {}
                        
                        yield ToolCall(
                            id=current_tool_call["id"],
                            name=current_tool_call["name"],
                            arguments=arguments
                        )
                        current_tool_call = None
