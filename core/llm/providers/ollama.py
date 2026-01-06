"""
AgentForge - Ollama LLM Provider
Supports local models via Ollama.
"""

import json
import time
import httpx
from typing import List, Dict, Any, Optional, AsyncIterator, Union

from ..base import (
    BaseLLM, LLMConfig, LLMResponse, LLMCapability,
    Message, MessageRole, ToolCall
)


class OllamaLLM(BaseLLM):
    """
    Ollama LLM provider for local models.
    
    Supports:
    - Llama 2/3
    - Mistral
    - CodeLlama
    - Any Ollama-supported model
    """
    
    def __init__(self, config: LLMConfig):
        super().__init__(config)
        
        self.base_url = config.base_url or "http://localhost:11434"
        self.client = httpx.AsyncClient(timeout=300.0)  # Long timeout for local inference
    
    def _validate_config(self):
        """Validate Ollama-specific configuration."""
        pass  # Ollama doesn't require API keys
    
    def _convert_messages(self, messages: List[Message]) -> List[Dict[str, Any]]:
        """Convert our Message format to Ollama format."""
        ollama_messages = []
        
        for msg in messages:
            ollama_msg = {
                "role": msg.role.value if msg.role != MessageRole.TOOL else "assistant",
                "content": msg.content or ""
            }
            ollama_messages.append(ollama_msg)
        
        return ollama_messages
    
    def _convert_tools(self, tools: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Convert tools to Ollama format (if supported)."""
        # Ollama's tool format is similar to OpenAI
        ollama_tools = []
        
        for tool in tools:
            if "type" in tool and tool["type"] == "function":
                ollama_tools.append(tool)
            else:
                ollama_tools.append({
                    "type": "function",
                    "function": tool
                })
        
        return ollama_tools
    
    async def chat(
        self,
        messages: List[Message],
        tools: Optional[List[Dict[str, Any]]] = None,
        temperature: float = 0.7,
        max_tokens: Optional[int] = None,
        **kwargs
    ) -> LLMResponse:
        """
        Send messages to Ollama and get a response.
        """
        start_time = time.time()
        
        # Prepare request
        payload = {
            "model": self.config.model_id,
            "messages": self._convert_messages(messages),
            "stream": False,
            "options": {
                "temperature": temperature,
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        if tools and LLMCapability.FUNCTION_CALLING in self.config.capabilities:
            payload["tools"] = self._convert_tools(tools)
        
        # Make request
        response = await self.client.post(
            f"{self.base_url}/api/chat",
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        # Calculate latency
        latency_ms = (time.time() - start_time) * 1000
        
        # Parse response
        message = data.get("message", {})
        
        # Extract tool calls if present
        tool_calls = None
        if "tool_calls" in message:
            tool_calls = []
            for tc in message["tool_calls"]:
                tool_calls.append(ToolCall(
                    id=tc.get("id", f"call_{len(tool_calls)}"),
                    name=tc["function"]["name"],
                    arguments=tc["function"].get("arguments", {})
                ))
        
        return LLMResponse(
            content=message.get("content"),
            tool_calls=tool_calls,
            finish_reason="stop",
            prompt_tokens=data.get("prompt_eval_count", 0),
            completion_tokens=data.get("eval_count", 0),
            total_tokens=data.get("prompt_eval_count", 0) + data.get("eval_count", 0),
            model=data.get("model", self.config.model_id),
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
        Stream response tokens from Ollama.
        """
        # Prepare request
        payload = {
            "model": self.config.model_id,
            "messages": self._convert_messages(messages),
            "stream": True,
            "options": {
                "temperature": temperature,
            }
        }
        
        if max_tokens:
            payload["options"]["num_predict"] = max_tokens
        
        if tools and LLMCapability.FUNCTION_CALLING in self.config.capabilities:
            payload["tools"] = self._convert_tools(tools)
        
        # Stream response
        async with self.client.stream(
            "POST",
            f"{self.base_url}/api/chat",
            json=payload
        ) as response:
            response.raise_for_status()
            
            async for line in response.aiter_lines():
                if not line:
                    continue
                
                try:
                    data = json.loads(line)
                except json.JSONDecodeError:
                    continue
                
                message = data.get("message", {})
                
                # Yield content
                if "content" in message and message["content"]:
                    yield message["content"]
                
                # Yield tool calls
                if "tool_calls" in message:
                    for tc in message["tool_calls"]:
                        yield ToolCall(
                            id=tc.get("id", "call_0"),
                            name=tc["function"]["name"],
                            arguments=tc["function"].get("arguments", {})
                        )
    
    async def list_models(self) -> List[str]:
        """List available models in Ollama."""
        response = await self.client.get(f"{self.base_url}/api/tags")
        response.raise_for_status()
        data = response.json()
        return [model["name"] for model in data.get("models", [])]
    
    async def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry."""
        response = await self.client.post(
            f"{self.base_url}/api/pull",
            json={"name": model_name}
        )
        return response.status_code == 200
    
    async def test_connection(self) -> bool:
        """Test if Ollama is accessible."""
        try:
            response = await self.client.get(f"{self.base_url}/api/tags")
            return response.status_code == 200
        except Exception:
            return False
