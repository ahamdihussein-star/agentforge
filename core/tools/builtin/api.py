"""
AgentForge - API Tool
Call REST, GraphQL, or SOAP APIs.
"""

import time
import json
from typing import Dict, Any, List, Optional
import httpx

from ..base import BaseTool, ToolDefinition, ToolResult, ToolConfig, ToolCategory


class APITool(BaseTool):
    """
    API Tool for making HTTP requests to external services.
    
    Supports:
    - REST APIs
    - GraphQL APIs
    - SOAP APIs (basic)
    - Webhook calls
    """
    
    tool_type = "api"
    category = ToolCategory.DATA
    version = "1.0.0"
    
    def __init__(self, config: ToolConfig):
        super().__init__(config)
        
        # Extract configuration
        self.base_url = config.config.get("base_url", "")
        self.auth_type = config.config.get("auth_type")  # bearer, api_key, basic, oauth
        self.auth_config = config.config.get("auth", {})
        self.default_headers = config.config.get("headers", {})
        self.endpoints = config.config.get("endpoints", [])
        self.timeout = config.config.get("timeout", 30)
        
        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            timeout=self.timeout,
            headers=self._build_default_headers()
        )
    
    def _validate_config(self):
        """Validate API configuration"""
        if not self.config.config.get("base_url"):
            raise ValueError("API tool requires 'base_url' in config")
    
    def _build_default_headers(self) -> Dict[str, str]:
        """Build default headers including auth"""
        headers = dict(self.default_headers)
        headers["Content-Type"] = "application/json"
        headers["Accept"] = "application/json"
        
        # Add authentication
        if self.auth_type == "bearer":
            token = self.auth_config.get("token")
            if token:
                headers["Authorization"] = f"Bearer {token}"
        
        elif self.auth_type == "api_key":
            key_name = self.auth_config.get("header", "X-API-Key")
            key_value = self.auth_config.get("key")
            if key_value:
                headers[key_name] = key_value
        
        return headers
    
    def get_definition(self) -> ToolDefinition:
        """Return tool definition for LLM"""
        
        # Build endpoint descriptions
        endpoint_desc = ""
        if self.endpoints:
            endpoint_desc = "\n\nAvailable endpoints:\n"
            for ep in self.endpoints:
                endpoint_desc += f"- {ep.get('method', 'GET')} {ep.get('path')}: {ep.get('description', '')}\n"
        
        return ToolDefinition(
            name=f"call_{self.name}",
            description=f"Make HTTP requests to the {self.name} API. "
                       f"Base URL: {self.base_url}"
                       f"{endpoint_desc}",
            parameters={
                "type": "object",
                "properties": {
                    "method": {
                        "type": "string",
                        "description": "HTTP method (GET, POST, PUT, DELETE, PATCH)",
                        "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        "default": "GET"
                    },
                    "endpoint": {
                        "type": "string",
                        "description": "API endpoint path (e.g., /users/123)"
                    },
                    "data": {
                        "type": "object",
                        "description": "Request body data (for POST, PUT, PATCH)"
                    },
                    "params": {
                        "type": "object",
                        "description": "Query parameters"
                    }
                },
                "required": ["endpoint"]
            }
        )
    
    async def execute(
        self,
        endpoint: str,
        method: str = "GET",
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, str]] = None,
        headers: Optional[Dict[str, str]] = None,
        **kwargs
    ) -> ToolResult:
        """
        Execute an API call.
        
        Args:
            endpoint: API endpoint path
            method: HTTP method
            data: Request body data
            params: Query parameters
            headers: Additional headers
            
        Returns:
            ToolResult with API response
        """
        start_time = time.time()
        
        try:
            # Build URL
            url = f"{self.base_url.rstrip('/')}/{endpoint.lstrip('/')}"
            
            # Merge headers
            request_headers = dict(self.client.headers)
            if headers:
                request_headers.update(headers)
            
            # Make request
            response = await self.client.request(
                method=method.upper(),
                url=url,
                json=data if data else None,
                params=params,
                headers=request_headers
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            # Parse response
            try:
                response_data = response.json()
            except json.JSONDecodeError:
                response_data = {"text": response.text}
            
            # Check for success
            if response.is_success:
                return ToolResult(
                    success=True,
                    data={
                        "status_code": response.status_code,
                        "response": response_data
                    },
                    execution_time_ms=execution_time,
                    summary=f"API call successful (HTTP {response.status_code})"
                )
            else:
                return ToolResult(
                    success=False,
                    data={
                        "status_code": response.status_code,
                        "response": response_data
                    },
                    error=f"HTTP {response.status_code}: {response.reason_phrase}",
                    execution_time_ms=execution_time
                )
            
        except httpx.TimeoutException:
            return ToolResult(
                success=False,
                error=f"Request timed out after {self.timeout} seconds",
                execution_time_ms=(time.time() - start_time) * 1000
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )
    
    async def test(self) -> ToolResult:
        """Test API connection"""
        try:
            # Try a simple request (HEAD or GET)
            response = await self.client.head(
                self.base_url,
                follow_redirects=True
            )
            
            return ToolResult(
                success=True,
                data={
                    "status": "ok",
                    "base_url": self.base_url,
                    "status_code": response.status_code
                },
                summary=f"API is reachable (HTTP {response.status_code})"
            )
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e)
            )
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()


class GraphQLTool(APITool):
    """
    GraphQL API Tool.
    
    Specialized version of APITool for GraphQL endpoints.
    """
    
    tool_type = "graphql"
    
    def get_definition(self) -> ToolDefinition:
        """Return tool definition for LLM"""
        return ToolDefinition(
            name=f"query_{self.name}",
            description=f"Execute GraphQL queries against the {self.name} API. "
                       f"Endpoint: {self.base_url}",
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "GraphQL query string"
                    },
                    "variables": {
                        "type": "object",
                        "description": "GraphQL query variables"
                    },
                    "operation_name": {
                        "type": "string",
                        "description": "Operation name (for queries with multiple operations)"
                    }
                },
                "required": ["query"]
            }
        )
    
    async def execute(
        self,
        query: str,
        variables: Optional[Dict[str, Any]] = None,
        operation_name: Optional[str] = None,
        **kwargs
    ) -> ToolResult:
        """
        Execute a GraphQL query.
        
        Args:
            query: GraphQL query string
            variables: Query variables
            operation_name: Operation name
            
        Returns:
            ToolResult with GraphQL response
        """
        data = {"query": query}
        
        if variables:
            data["variables"] = variables
        
        if operation_name:
            data["operationName"] = operation_name
        
        return await super().execute(
            endpoint="",
            method="POST",
            data=data
        )


class WebhookTool(BaseTool):
    """
    Webhook Tool for sending HTTP callbacks.
    
    Useful for triggering external workflows or notifications.
    """
    
    tool_type = "webhook"
    category = ToolCategory.ACTION
    version = "1.0.0"
    
    def __init__(self, config: ToolConfig):
        super().__init__(config)
        
        self.url = config.config.get("url")
        self.method = config.config.get("method", "POST")
        self.headers = config.config.get("headers", {})
        self.secret = config.config.get("secret")
        
        self.client = httpx.AsyncClient(timeout=30)
    
    def _validate_config(self):
        """Validate webhook configuration"""
        if not self.config.config.get("url"):
            raise ValueError("Webhook tool requires 'url' in config")
    
    def get_definition(self) -> ToolDefinition:
        """Return tool definition for LLM"""
        return ToolDefinition(
            name=f"trigger_{self.name}",
            description=f"Trigger the {self.name} webhook to send a notification or "
                       f"start an external workflow.",
            parameters={
                "type": "object",
                "properties": {
                    "payload": {
                        "type": "object",
                        "description": "Data to send to the webhook"
                    }
                },
                "required": ["payload"]
            }
        )
    
    async def execute(self, payload: Dict[str, Any], **kwargs) -> ToolResult:
        """
        Trigger the webhook.
        
        Args:
            payload: Data to send
            
        Returns:
            ToolResult with webhook response
        """
        start_time = time.time()
        
        try:
            headers = dict(self.headers)
            headers["Content-Type"] = "application/json"
            
            # Add signature if secret is configured
            if self.secret:
                import hashlib
                import hmac
                
                payload_str = json.dumps(payload, sort_keys=True)
                signature = hmac.new(
                    self.secret.encode(),
                    payload_str.encode(),
                    hashlib.sha256
                ).hexdigest()
                headers["X-Webhook-Signature"] = signature
            
            response = await self.client.request(
                method=self.method,
                url=self.url,
                json=payload,
                headers=headers
            )
            
            execution_time = (time.time() - start_time) * 1000
            
            return ToolResult(
                success=response.is_success,
                data={
                    "status_code": response.status_code,
                    "response": response.text[:500] if response.text else None
                },
                error=None if response.is_success else f"HTTP {response.status_code}",
                execution_time_ms=execution_time,
                summary=f"Webhook {'triggered successfully' if response.is_success else 'failed'}"
            )
            
        except Exception as e:
            return ToolResult(
                success=False,
                error=str(e),
                execution_time_ms=(time.time() - start_time) * 1000
            )


# Register tools
from ..base import ToolRegistry
ToolRegistry.register("api", APITool)
ToolRegistry.register("rest", APITool)
ToolRegistry.register("graphql", GraphQLTool)
ToolRegistry.register("webhook", WebhookTool)
