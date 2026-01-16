"""
MCP Adapter for AgentScope.

Adapts MCP tools to AgentScope's ServiceToolkit with dynamic registration.
"""

from typing import Dict, Any, Optional, List
import json

from agentscope.tool import Toolkit, ToolResponse
from agentscope.message import TextBlock

from core.utils.logger import logger


class MCPAdapter:
    """
    Adapts MCP tools to AgentScope's Toolkit.
    
    Handles:
    - discover_mcp_tools: Dynamic tool discovery
    - execute_mcp_tool: Tool execution
    - Dynamic registration after discovery
    """
    
    def __init__(
        self,
        toolkit: Toolkit,
        mcp_wrapper=None,
    ):
        """
        Initialize the MCP adapter.
        
        Args:
            toolkit: AgentScope Toolkit instance
            mcp_wrapper: MCPToolWrapper instance
        """
        self.toolkit = toolkit
        self.mcp_wrapper = mcp_wrapper
        self._discovered_tools: Dict[str, Dict[str, Any]] = {}
    
    def register_base_tools(self) -> None:
        """Register the base MCP discovery and execution tools."""
        
        # Register discover_mcp_tools (name is taken from __name__)
        self._discover_mcp_tools.__name__ = "discover_mcp_tools"
        self.toolkit.register_tool_function(self._discover_mcp_tools)
        
        # Register execute_mcp_tool
        self._execute_mcp_tool.__name__ = "execute_mcp_tool"
        self.toolkit.register_tool_function(self._execute_mcp_tool)
        
        logger.info("Registered MCP base tools: discover_mcp_tools, execute_mcp_tool")
    
    async def _discover_mcp_tools(
        self,
        filter: Optional[str] = None,
    ) -> ToolResponse:
        """
        Discover available MCP tools.
        
        Args:
            filter: Optional filter string for tool names
            
        Returns:
            ToolResponse containing discovered tool schemas
        """
        if not self.mcp_wrapper:
            return self._make_response({"error": "MCP wrapper not configured", "tools": []})
        
        try:
            # Call the existing discover method
            result = await self.mcp_wrapper.discover_mcp_tools(filter=filter)
            
            if result.success and result.output:
                # Cache discovered tools
                tools = result.output.get('tools', [])
                for tool in tools:
                    tool_name = tool.get('name')
                    if tool_name:
                        self._discovered_tools[tool_name] = tool
                
                # Dynamically register discovered tools
                self._register_discovered_tools(tools)
                
                return self._make_response({"tools": tools, "count": len(tools)})
            else:
                return self._make_response({"error": result.error, "tools": []})
                
        except Exception as e:
            logger.error(f"MCP tool discovery failed: {e}")
            return self._make_response({"error": str(e), "tools": []})
    
    async def _execute_mcp_tool(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
    ) -> ToolResponse:
        """
        Execute an MCP tool.
        
        Args:
            tool_name: Name of the MCP tool to execute
            arguments: Tool arguments
            
        Returns:
            ToolResponse with execution result
        """
        if not self.mcp_wrapper:
            return self._make_response({"error": "MCP wrapper not configured", "success": False})
        
        try:
            result = await self.mcp_wrapper.execute_mcp_tool(
                tool_name=tool_name,
                arguments=arguments or {},
            )
            
            return self._make_response({
                "output": result.output,
                "success": result.success,
                "error": result.error,
            })
            
        except Exception as e:
            logger.error(f"MCP tool execution failed: {e}")
            return self._make_response({"error": str(e), "success": False})
    
    def _register_discovered_tools(self, tools: List[Dict[str, Any]]) -> None:
        """
        Dynamically register discovered MCP tools.
        
        This allows the LLM to call MCP tools directly by name
        instead of going through execute_mcp_tool.
        
        Args:
            tools: List of tool schemas from discovery
        """
        for tool in tools:
            tool_name = tool.get('name')
            if not tool_name or tool_name in ['discover_mcp_tools', 'execute_mcp_tool']:
                continue
            
            # Create a wrapper function for this specific tool
            async def tool_wrapper(
                _tool_name=tool_name,
                **kwargs,
            ) -> ToolResponse:
                return await self._execute_mcp_tool(
                    tool_name=_tool_name,
                    arguments=kwargs,
                )
            
            # Set function metadata (name is taken from __name__)
            tool_wrapper.__name__ = tool_name
            tool_wrapper.__doc__ = tool.get('description', f"Execute MCP tool: {tool_name}")
            
            # Build JSON schema from MCP tool schema
            json_schema = self._build_json_schema(tool)
            
            # Register with toolkit using json_schema parameter
            try:
                self.toolkit.register_tool_function(
                    tool_wrapper,
                    json_schema=json_schema,
                )
                logger.debug(f"Dynamically registered MCP tool: {tool_name}")
            except Exception as e:
                logger.warning(f"Failed to register MCP tool {tool_name}: {e}")
    
    def _build_json_schema(self, tool: Dict[str, Any]) -> Dict[str, Any]:
        """
        Build JSON schema for an MCP tool.
        
        Args:
            tool: MCP tool definition
            
        Returns:
            OpenAPI-compatible JSON schema
        """
        tool_name = tool.get('name', 'unknown')
        description = tool.get('description', f"Execute MCP tool: {tool_name}")
        
        # Extract input schema if available
        input_schema = tool.get('inputSchema', tool.get('input_schema', {}))
        
        return {
            "type": "function",
            "function": {
                "name": tool_name,
                "description": description,
                "parameters": input_schema if input_schema else {
                    "type": "object",
                    "properties": {},
                },
            },
        }
    
    def get_discovered_tools(self) -> Dict[str, Dict[str, Any]]:
        """Get all discovered MCP tools."""
        return self._discovered_tools
    
    def _make_response(self, data: Dict[str, Any]) -> ToolResponse:
        """
        Create a ToolResponse from a dict.
        
        Args:
            data: Dict to convert
            
        Returns:
            ToolResponse with TextBlock content
        """
        content = json.dumps(data, ensure_ascii=False)
        return ToolResponse(content=[TextBlock(text=content)])

