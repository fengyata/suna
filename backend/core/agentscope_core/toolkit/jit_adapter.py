"""
JIT Toolkit Adapter for AgentScope.

Implements dynamic tool loading (JIT - Just In Time) for AgentScope agents.
This is a clean re-implementation that doesn't depend on ThreadManager.
"""

import time
from typing import Optional, List, Dict, Any, Callable
from functools import partial

from agentscope.tool import Toolkit, ToolResponse
from agentscope.message import TextBlock

from core.utils.logger import logger
from core.jit.result_types import (
    ActivationResult,
    ActivationSuccess,
    ActivationError,
    ActivationErrorType,
)


class JITToolkitAdapter:
    """
    JIT (Just In Time) tool loading adapter for AgentScope.
    
    Handles:
    - Dynamic tool activation via initialize_tools function
    - Saving activated tools to thread metadata
    - Restoring previously activated tools on new agent runs
    """
    
    def __init__(
        self,
        toolkit: Toolkit,
        thread_id: str,
        project_id: Optional[str] = None,
        supabase_client=None,
    ):
        """
        Initialize JIT adapter.
        
        Args:
            toolkit: AgentScope Toolkit to register tools with
            thread_id: Thread ID for metadata storage
            project_id: Project ID for tool initialization
            supabase_client: Supabase client for DB operations
        """
        self.toolkit = toolkit
        self.thread_id = thread_id
        self.project_id = project_id
        self.client = supabase_client
        self._activated_tools: set = set()
    
    def register_jit_tools(self) -> None:
        """
        Register the initialize_tools function with the toolkit.
        
        This allows the LLM to dynamically load tools on demand.
        """
        # Create the initialize_tools function bound to this adapter
        @self.toolkit.register_tool
        async def initialize_tools(tool_names: str) -> ToolResponse:
            """
            Activate tools on-demand. Call at the start of every task.
            
            Analyze the user's request and determine ALL needed tools,
            then load them in ONE batch call.
            
            Args:
                tool_names: Comma-separated list of tool names to activate
                           (e.g., "browser_tool,sb_files_tool,web_search_tool")
            
            Returns:
                ToolResponse with activation results and usage guides
            """
            return await self._initialize_tools_impl(tool_names)
        
        logger.info("[JIT] Registered initialize_tools function")
    
    async def _initialize_tools_impl(self, tool_names: str) -> ToolResponse:
        """
        Implementation of initialize_tools.
        
        Args:
            tool_names: Comma-separated list of tool names
            
        Returns:
            ToolResponse with results
        """
        # Parse tool names
        tools_to_load = [
            name.strip()
            for name in tool_names.split(',')
            if name.strip()
        ]
        
        if not tools_to_load:
            return ToolResponse(
                content=[TextBlock(text="No tool names provided")]
            )
        
        logger.info(f"[JIT] Activating tools: {tools_to_load}")
        
        successful = []
        failed = []
        guides = []
        
        for tool_name in tools_to_load:
            # Skip if already activated
            if tool_name in self._activated_tools:
                logger.debug(f"[JIT] Tool '{tool_name}' already activated, skipping")
                successful.append(tool_name)
                continue
            
            result = await self._activate_single_tool(tool_name)
            
            if isinstance(result, ActivationSuccess):
                successful.append(tool_name)
                self._activated_tools.add(tool_name)
                
                # Get usage guide
                guide = await self._get_tool_guide(tool_name)
                if guide:
                    guides.append(f"## {tool_name}\n{guide}")
            else:
                failed.append(f"{tool_name}: {result.message}")
        
        # Save to metadata
        if successful:
            await self._save_to_metadata(list(self._activated_tools))
        
        # Build response
        response_parts = []
        
        if successful:
            response_parts.append(f"✅ Activated: {', '.join(successful)}")
        if failed:
            response_parts.append(f"❌ Failed: {'; '.join(failed)}")
        if guides:
            response_parts.append("\n---\n**Usage Guides:**\n" + "\n\n".join(guides))
        
        return ToolResponse(
            content=[TextBlock(text="\n".join(response_parts))]
        )
    
    async def _activate_single_tool(self, tool_name: str) -> ActivationResult:
        """
        Activate a single tool and register it with the toolkit.
        
        Args:
            tool_name: Name of the tool to activate
            
        Returns:
            ActivationResult indicating success or failure
        """
        from core.tools.tool_registry import get_tool_info, get_tool_class
        from core.jit.detector import ParameterDetector
        
        start_time = time.time()
        
        # Get tool info from registry
        tool_info = get_tool_info(tool_name)
        if not tool_info:
            logger.error(f"[JIT] Tool '{tool_name}' not found in registry")
            return ActivationError(
                error_type=ActivationErrorType.TOOL_NOT_FOUND,
                message=f"Tool '{tool_name}' not found in tool registry",
                tool_name=tool_name,
            )
        
        _, module_path, class_name = tool_info
        
        try:
            # Load tool class
            tool_class = get_tool_class(module_path, class_name)
            logger.debug(f"[JIT] Loaded class {class_name} from {module_path}")
            
        except ImportError as e:
            logger.error(f"[JIT] Import failed for '{tool_name}': {e}")
            return ActivationError(
                error_type=ActivationErrorType.IMPORT_ERROR,
                message=str(e),
                tool_name=tool_name,
                details={'module': module_path, 'class': class_name},
            )
        
        try:
            # Detect and build init parameters
            detector = ParameterDetector()
            init_params = detector.detect_init_parameters(tool_class)
            
            # Build kwargs without ThreadManager dependency
            kwargs = await self._build_tool_kwargs(init_params, tool_class)
            
            # Instantiate tool
            tool_instance = tool_class(**kwargs)
            
            # Register tool methods with AgentScope Toolkit
            await self._register_tool_with_toolkit(tool_name, tool_instance, tool_class)
            
            elapsed_ms = (time.time() - start_time) * 1000
            logger.info(f"[JIT] Tool '{tool_name}' activated in {elapsed_ms:.1f}ms")
            
            return ActivationSuccess(
                tool_name=tool_name,
                load_time_ms=elapsed_ms,
                dependencies_loaded=[],
            )
            
        except Exception as e:
            logger.error(f"[JIT] Failed to activate '{tool_name}': {e}", exc_info=True)
            return ActivationError(
                error_type=ActivationErrorType.INIT_FAILED,
                message=str(e),
                tool_name=tool_name,
            )
    
    async def _build_tool_kwargs(
        self,
        init_params: List[str],
        tool_class,
    ) -> Dict[str, Any]:
        """
        Build kwargs for tool initialization.
        
        This replaces ParameterDetector.build_kwargs to avoid
        ThreadManager dependency.
        
        Args:
            init_params: List of parameter names needed
            tool_class: The tool class
            
        Returns:
            Dict of kwargs to pass to tool constructor
        """
        kwargs = {}
        
        for param in init_params:
            if param == 'thread_id':
                kwargs['thread_id'] = self.thread_id
            elif param == 'project_id':
                kwargs['project_id'] = self.project_id
            elif param == 'client' or param == 'supabase_client':
                kwargs[param] = self.client
            # Add more parameters as needed
        
        return kwargs
    
    async def _register_tool_with_toolkit(
        self,
        tool_name: str,
        tool_instance: Any,
        tool_class: Any,
    ) -> None:
        """
        Register a tool instance's methods with AgentScope Toolkit.
        
        Args:
            tool_name: Name of the tool
            tool_instance: Instantiated tool object
            tool_class: The tool class for schema extraction
        """
        # Get all methods with openapi_schema decorator
        for attr_name in dir(tool_instance):
            if attr_name.startswith('_'):
                continue
            
            attr = getattr(tool_instance, attr_name)
            if callable(attr) and hasattr(attr, '_openapi_schema'):
                schema = attr._openapi_schema
                func_name = schema.get('function', {}).get('name', attr_name)
                
                # Create wrapper function
                async def tool_wrapper(
                    _bound_method=attr,
                    **kwargs
                ) -> ToolResponse:
                    try:
                        result = await _bound_method(**kwargs)
                        # Convert ToolResult to ToolResponse
                        if hasattr(result, 'output'):
                            content = str(result.output)
                        else:
                            content = str(result)
                        return ToolResponse(content=[TextBlock(text=content)])
                    except Exception as e:
                        return ToolResponse(
                            content=[TextBlock(text=f"Error: {str(e)}")],
                            metadata={"error": True},
                        )
                
                # Set the function name and schema
                tool_wrapper.__name__ = func_name
                tool_wrapper.__doc__ = schema.get('function', {}).get('description', '')
                
                # Register with toolkit
                self.toolkit.tools[func_name] = {
                    'function': tool_wrapper,
                    'schema': schema,
                }
                
                logger.debug(f"[JIT] Registered function: {func_name}")
    
    async def _get_tool_guide(self, tool_name: str) -> Optional[str]:
        """
        Get the usage guide for a tool.
        
        Args:
            tool_name: Name of the tool
            
        Returns:
            Usage guide string or None
        """
        from core.jit.tool_cache import get_tool_cache
        
        cache = get_tool_cache()
        guide = cache.get_guide(tool_name)
        
        if guide:
            return guide
        
        # Try to load from tool metadata
        from core.tools.tool_registry import get_tool_info, get_tool_class
        
        tool_info = get_tool_info(tool_name)
        if tool_info:
            _, module_path, class_name = tool_info
            try:
                tool_class = get_tool_class(module_path, class_name)
                if hasattr(tool_class, '_tool_metadata'):
                    metadata = tool_class._tool_metadata
                    return metadata.get('usage_guide', '')
            except Exception:
                pass
        
        return None
    
    async def _save_to_metadata(self, tool_names: List[str]) -> None:
        """
        Save activated tools to thread metadata.
        
        Args:
            tool_names: List of activated tool names
        """
        if not self.client:
            logger.warning("[JIT] No Supabase client, cannot save tools to metadata")
            return
        
        try:
            # Get current metadata
            result = await self.client.table('threads')\
                .select('metadata')\
                .eq('thread_id', self.thread_id)\
                .single()\
                .execute()
            
            if not result.data:
                logger.warning(f"[JIT] Thread {self.thread_id} not found")
                return
            
            metadata = result.data.get('metadata') or {}
            
            # Merge with existing tools
            existing_tools = set(metadata.get('dynamic_tools', []))
            updated_tools = list(existing_tools | set(tool_names))
            
            metadata['dynamic_tools'] = updated_tools
            
            # Save back
            await self.client.table('threads')\
                .update({'metadata': metadata})\
                .eq('thread_id', self.thread_id)\
                .execute()
            
            logger.info(f"[JIT] Saved {len(tool_names)} tools to metadata (total: {len(updated_tools)})")
            
        except Exception as e:
            logger.error(f"[JIT] Failed to save tools to metadata: {e}", exc_info=True)
    
    async def restore_dynamic_tools(self) -> int:
        """
        Restore previously activated tools from thread metadata.
        
        Call this during agent setup to restore tools from previous runs.
        
        Returns:
            Number of tools restored
        """
        if not self.client:
            logger.debug("[JIT] No Supabase client, cannot restore tools")
            return 0
        
        try:
            result = await self.client.table('threads')\
                .select('metadata')\
                .eq('thread_id', self.thread_id)\
                .single()\
                .execute()
            
            if not result.data:
                return 0
            
            metadata = result.data.get('metadata') or {}
            dynamic_tools = metadata.get('dynamic_tools', [])
            
            if not dynamic_tools:
                logger.debug("[JIT] No dynamic tools to restore")
                return 0
            
            logger.info(f"[JIT] Restoring {len(dynamic_tools)} dynamic tools")
            
            restored = 0
            for tool_name in dynamic_tools:
                if tool_name not in self._activated_tools:
                    result = await self._activate_single_tool(tool_name)
                    if isinstance(result, ActivationSuccess):
                        self._activated_tools.add(tool_name)
                        restored += 1
                    else:
                        logger.warning(f"[JIT] Failed to restore '{tool_name}': {result.message}")
            
            logger.info(f"[JIT] Restored {restored}/{len(dynamic_tools)} tools")
            return restored
            
        except Exception as e:
            logger.warning(f"[JIT] Failed to restore tools (non-fatal): {e}")
            return 0

