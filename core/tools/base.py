"""
AgentForge - Tool Base Interface
All tools must implement this interface.
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List, Type
from pydantic import BaseModel, Field
from enum import Enum
from datetime import datetime


class ToolCategory(str, Enum):
    """Categories of tools"""
    KNOWLEDGE = "knowledge"      # RAG, search, documents
    DATA = "data"                # Database, API queries
    ACTION = "action"            # Email, webhook, notifications
    INTEGRATION = "integration"  # External services
    UTILITY = "utility"          # Calculations, transformations
    CUSTOM = "custom"            # User-defined tools


class ToolDefinition(BaseModel):
    """
    Tool definition in OpenAI function format.
    
    This is what gets sent to the LLM so it knows how to use the tool.
    """
    name: str = Field(..., description="Tool name (alphanumeric with underscores)")
    description: str = Field(..., description="What the tool does")
    parameters: Dict[str, Any] = Field(
        default_factory=lambda: {"type": "object", "properties": {}},
        description="JSON Schema for tool parameters"
    )
    
    def to_openai_format(self) -> Dict[str, Any]:
        """Convert to OpenAI function format"""
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters
            }
        }


class ToolResult(BaseModel):
    """Result from a tool execution"""
    
    success: bool = Field(..., description="Whether execution succeeded")
    data: Any = Field(None, description="Result data")
    error: Optional[str] = Field(None, description="Error message if failed")
    
    # Metadata
    execution_time_ms: float = Field(0, description="Execution time in milliseconds")
    
    # For display
    summary: Optional[str] = Field(None, description="Human-readable summary")
    
    def to_llm_response(self) -> str:
        """Convert to string for LLM consumption"""
        if self.success:
            if self.summary:
                return self.summary
            if isinstance(self.data, str):
                return self.data
            if isinstance(self.data, dict):
                import json
                return json.dumps(self.data, indent=2, ensure_ascii=False)
            return str(self.data)
        else:
            return f"Error: {self.error}"


class ToolConfig(BaseModel):
    """Configuration for a tool instance"""
    
    # Identity
    type: str = Field(..., description="Tool type (rag, database, api, etc.)")
    name: str = Field(..., description="Instance name")
    
    # Configuration specific to tool type
    config: Dict[str, Any] = Field(default_factory=dict)
    
    # Permissions
    enabled: bool = Field(True, description="Whether tool is enabled")
    requires_approval: bool = Field(False, description="Requires human approval")
    approval_condition: Optional[str] = Field(None, description="Condition for approval")
    
    # Metadata
    description: Optional[str] = Field(None, description="Tool description override")


class BaseTool(ABC):
    """
    Abstract base class for all tools.
    
    All tool implementations must inherit from this class and implement
    the abstract methods.
    """
    
    # Tool metadata (override in subclasses)
    tool_type: str = "base"
    category: ToolCategory = ToolCategory.UTILITY
    version: str = "1.0.0"
    
    def __init__(self, config: ToolConfig):
        """
        Initialize the tool with configuration.
        
        Args:
            config: Tool configuration
        """
        self.config = config
        self.name = config.name
        self._validate_config()
    
    def _validate_config(self):
        """
        Validate the configuration.
        
        Override in subclasses for specific validation.
        """
        pass
    
    @abstractmethod
    def get_definition(self) -> ToolDefinition:
        """
        Return the tool definition for the LLM.
        
        This tells the LLM how to use this tool.
        
        Returns:
            ToolDefinition with name, description, and parameters
        """
        pass
    
    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        """
        Execute the tool with given arguments.
        
        Args:
            **kwargs: Arguments matching the tool's parameter schema
            
        Returns:
            ToolResult with success status and data/error
        """
        pass
    
    async def validate_arguments(self, arguments: Dict[str, Any]) -> tuple:
        """
        Validate arguments before execution.
        
        Args:
            arguments: Arguments to validate
            
        Returns:
            (is_valid, error_message)
        """
        definition = self.get_definition()
        schema = definition.parameters
        
        # Check required fields
        required = schema.get("required", [])
        for field in required:
            if field not in arguments:
                return False, f"Missing required argument: {field}"
        
        return True, None
    
    async def test(self) -> ToolResult:
        """
        Test the tool connection/configuration.
        
        Returns:
            ToolResult indicating if tool is working
        """
        return ToolResult(
            success=True,
            data={"status": "ok"},
            summary="Tool is configured correctly"
        )
    
    def get_openai_tool(self) -> Dict[str, Any]:
        """Get tool definition in OpenAI format"""
        return self.get_definition().to_openai_format()
    
    @classmethod
    def from_config(cls, config: ToolConfig) -> "BaseTool":
        """
        Create a tool instance from configuration.
        
        This is the standard way to instantiate tools.
        
        Args:
            config: Tool configuration
            
        Returns:
            Initialized tool instance
        """
        return cls(config)
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(name={self.name}, type={self.tool_type})"


class ToolRegistry:
    """
    Registry for all available tool types.
    
    The registry maintains a mapping of tool type names to implementation classes.
    """
    
    _tools: Dict[str, Type[BaseTool]] = {}
    
    @classmethod
    def register(cls, tool_type: str, tool_class: Type[BaseTool]):
        """
        Register a tool type.
        
        Args:
            tool_type: Tool type name
            tool_class: Tool implementation class
        """
        cls._tools[tool_type.lower()] = tool_class
    
    @classmethod
    def create(cls, config: ToolConfig) -> BaseTool:
        """
        Create a tool instance from configuration.
        
        Args:
            config: Tool configuration
            
        Returns:
            Initialized tool instance
            
        Raises:
            ValueError: If tool type is not registered
        """
        tool_type = config.type.lower()
        
        if tool_type not in cls._tools:
            raise ValueError(
                f"Unknown tool type: {tool_type}. "
                f"Available: {list(cls._tools.keys())}"
            )
        
        return cls._tools[tool_type].from_config(config)
    
    @classmethod
    def list_types(cls) -> List[str]:
        """List all registered tool types"""
        return list(cls._tools.keys())
    
    @classmethod
    def get_class(cls, tool_type: str) -> Optional[Type[BaseTool]]:
        """Get the class for a tool type"""
        return cls._tools.get(tool_type.lower())
    
    @classmethod
    def is_registered(cls, tool_type: str) -> bool:
        """Check if a tool type is registered"""
        return tool_type.lower() in cls._tools
