"""
Toolkit Adapter for AgentScope.

Adapts existing ToolRegistry tools to AgentScope's ServiceToolkit.
"""

from typing import Dict, Any, Callable, List, Optional, TYPE_CHECKING
import inspect
import json

from agentscope.tool import Toolkit, ToolResponse
from agentscope.message import TextBlock

from core.utils.logger import logger
from core.agentpress.tool import ToolResult

if TYPE_CHECKING:
    from core.agentpress.tool_registry import ToolRegistry


class ToolkitAdapter:
    """
    Adapts existing tools to AgentScope's Toolkit.
    
    Takes tools registered in the existing ToolRegistry and
    registers them with AgentScope's ServiceToolkit.
    """
    
    def __init__(
        self,
        toolkit: Toolkit,
        tool_registry=None,
    ):
        """
        Initialize the adapter.
        
        Args:
            toolkit: AgentScope Toolkit instance
            tool_registry: Existing ToolRegistry to migrate from
        """
        self.toolkit = toolkit
        self.tool_registry = tool_registry
        self._registered_tools: Dict[str, Callable] = {}
    
    # Tools to exclude from migration (handled by dedicated adapters)
    # - discover_mcp_tools, execute_mcp_tool: Handled by MCPAdapter (needs independent mcp_wrapper)
    # - initialize_tools: Handled by JITToolkitAdapter (must add tools to AgentScope Toolkit, not ToolRegistry)
    EXCLUDED_TOOLS = {'discover_mcp_tools', 'execute_mcp_tool', 'initialize_tools'}
    
    def register_all_tools(self) -> int:
        """
        Register all tools from the existing registry.
        
        Excludes MCP tools (discover_mcp_tools, execute_mcp_tool) which are
        handled by MCPAdapter with independent mcp_wrapper.
        
        Returns:
            Number of tools registered
        """
        if not self.tool_registry:
            logger.warning("No tool registry provided")
            return 0
        
        count = 0
        skipped = 0
        available_functions = self.tool_registry.get_available_functions()
        schemas = self.tool_registry.get_openapi_schemas()
        
        # Build schema lookup
        schema_lookup = {}
        for schema in schemas:
            if schema and 'function' in schema:
                name = schema['function'].get('name')
                if name:
                    schema_lookup[name] = schema
        
        for func_name, func in available_functions.items():
            # Skip MCP tools - they're handled by MCPAdapter
            if func_name in self.EXCLUDED_TOOLS:
                logger.debug(f"Skipping {func_name} (handled by MCPAdapter)")
                skipped += 1
                continue
            
            try:
                # Get the existing OpenAPI schema (already defined via @openapi_schema decorator)
                schema = schema_lookup.get(func_name)
                
                self.register_tool(func_name, func, json_schema=schema)
                count += 1
            except Exception as e:
                logger.error(f"Failed to register tool {func_name}: {e}")
        
        logger.info(f"Registered {count} tools with AgentScope Toolkit (skipped {skipped} MCP tools)")
        return count
    
    def register_tool(
        self,
        name: str,
        func: Callable,
        json_schema: Optional[Dict[str, Any]] = None,
    ) -> None:
        """
        Register a single tool with the toolkit.
        
        Args:
            name: Tool name
            func: Tool function
            json_schema: Existing OpenAPI schema from @openapi_schema decorator
        """
        # Wrap the function to ensure compatibility (result format conversion)
        wrapped_func = self._wrap_tool_function(name, func)
        
        # Register with AgentScope using the existing schema directly
        # This avoids re-inferring parameters from function signature
        self.toolkit.register_tool_function(
            wrapped_func,
            json_schema=json_schema,  # Pass the existing schema
        )
        
        self._registered_tools[name] = wrapped_func
        logger.debug(f"Registered tool: {name} (schema: {'provided' if json_schema else 'inferred'})")
    
    def _wrap_tool_function(
        self,
        name: str,
        func: Callable,
    ) -> Callable:
        """
        Wrap a tool function for AgentScope compatibility.
        
        Handles:
        - Async to sync conversion if needed
        - Error handling
        - Result formatting
        
        Args:
            name: Tool name
            func: Original function
            
        Returns:
            Wrapped function
        """
        import asyncio
        
        # Check if function is async
        is_async = asyncio.iscoroutinefunction(func)
        
        if is_async:
            # Keep async functions as-is for AgentScope
            async def async_wrapper(*args, **kwargs) -> ToolResponse:
                try:
                    result = await func(*args, **kwargs)
                    return self._format_result(result)
                except Exception as e:
                    logger.error(f"Tool {name} execution error: {e}")
                    return self._format_error(str(e))
            
            # Preserve function signature and docstring
            async_wrapper.__name__ = name
            async_wrapper.__doc__ = func.__doc__
            # KEY: Set __wrapped__ so inspect.signature can extract original parameters
            async_wrapper.__wrapped__ = func
            
            return async_wrapper
        else:
            # Wrap sync functions
            def sync_wrapper(*args, **kwargs) -> ToolResponse:
                try:
                    result = func(*args, **kwargs)
                    return self._format_result(result)
                except Exception as e:
                    logger.error(f"Tool {name} execution error: {e}")
                    return self._format_error(str(e))
            
            sync_wrapper.__name__ = name
            sync_wrapper.__doc__ = func.__doc__
            # KEY: Set __wrapped__ so inspect.signature can extract original parameters
            sync_wrapper.__wrapped__ = func
            
            return sync_wrapper
    
    def _format_result(self, result: Any) -> ToolResponse:
        """
        Format tool result as AgentScope ToolResponse.
        
        Args:
            result: Raw tool result
            
        Returns:
            ToolResponse with TextBlock content
        """
        # Convert result to string content
        content = self._to_string(result)
        
        # Return as ToolResponse with TextBlock
        return ToolResponse(content=[TextBlock(text=content)])
    
    def _format_error(self, error_message: str) -> ToolResponse:
        """
        Format error as AgentScope ToolResponse.
        
        Args:
            error_message: Error message
            
        Returns:
            ToolResponse with error content
        """
        return ToolResponse(
            content=[TextBlock(text=f"Error: {error_message}")],
            metadata={"success": False, "error": error_message},
        )
    
    def _to_string(self, result: Any) -> str:
        """
        Convert tool result to string.
        
        Args:
            result: Raw tool result
            
        Returns:
            String representation
        """
        # Handle ToolResult objects from existing tools
        if isinstance(result, ToolResult):
            output = result.output
            if isinstance(output, dict):
                return json.dumps(output, ensure_ascii=False)
            return str(output)
        
        # Handle dict with output/success pattern
        if isinstance(result, dict) and 'output' in result:
            output = result['output']
            if isinstance(output, dict):
                return json.dumps(output, ensure_ascii=False)
            return str(output)
        
        # Return as-is if already string
        if isinstance(result, str):
            return result
        
        # Convert to string for other types
        try:
            return json.dumps(result, ensure_ascii=False)
        except (TypeError, ValueError):
            return str(result)
    
    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """
        Get OpenAPI schemas for all registered tools.
        
        Returns:
            List of tool schemas
        """
        schemas = []
        
        for name, func in self._registered_tools.items():
            schema = self._generate_schema(name, func)
            if schema:
                schemas.append(schema)
        
        return schemas
    
    def _generate_schema(
        self,
        name: str,
        func: Callable,
    ) -> Optional[Dict[str, Any]]:
        """
        Generate OpenAPI schema for a tool function.
        
        Args:
            name: Tool name
            func: Tool function
            
        Returns:
            OpenAPI schema dict
        """
        sig = inspect.signature(func)
        doc = inspect.getdoc(func) or ""
        
        # Extract parameter info
        parameters = {
            "type": "object",
            "properties": {},
            "required": [],
        }
        
        for param_name, param in sig.parameters.items():
            if param_name in ('self', 'cls'):
                continue
            
            prop = {"type": "string"}  # Default type
            
            # Try to get type from annotation
            if param.annotation != inspect.Parameter.empty:
                prop["type"] = self._python_type_to_json_type(param.annotation)
            
            parameters["properties"][param_name] = prop
            
            if param.default == inspect.Parameter.empty:
                parameters["required"].append(param_name)
        
        return {
            "type": "function",
            "function": {
                "name": name,
                "description": doc.split('\n')[0] if doc else f"Execute {name}",
                "parameters": parameters,
            },
        }
    
    def _python_type_to_json_type(self, python_type: type) -> str:
        """Convert Python type to JSON Schema type."""
        type_mapping = {
            str: "string",
            int: "integer",
            float: "number",
            bool: "boolean",
            list: "array",
            dict: "object",
        }
        
        # Handle Optional types
        origin = getattr(python_type, '__origin__', None)
        if origin is not None:
            # Handle Union, Optional, etc.
            args = getattr(python_type, '__args__', ())
            for arg in args:
                if arg is not type(None):
                    return self._python_type_to_json_type(arg)
        
        return type_mapping.get(python_type, "string")

