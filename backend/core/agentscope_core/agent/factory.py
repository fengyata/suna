"""
Agent Factory for creating AgentScope agents.

This module creates fully configured ReActAgent instances with:
- Custom SupabaseMemory for message persistence
- CompressionConfig for automatic context compression
- Hooks for billing, DB persistence, streaming, and termination
- JIT dynamic tool loading
- expand_message tool for compressed message retrieval
"""

import uuid
from typing import Optional, List, Dict, Any, AsyncGenerator

from agentscope.agent import ReActAgent
from agentscope.tool import Toolkit

from core.agentscope_core.agent.config import AgentConfig
from core.agentscope_core.memory.supabase_memory import SupabaseMemory
from core.agentscope_core.hooks.db_hooks import DBHooks
from core.agentscope_core.hooks.streaming_hooks import StreamingHooks
from core.agentscope_core.hooks.termination_hooks import TerminationHooks
from core.agentscope_core.hooks.billing_hooks import BillingHooks
from core.agentscope_core.toolkit.adapter import ToolkitAdapter
from core.agentscope_core.toolkit.jit_adapter import JITToolkitAdapter
from core.agentscope_core.model_factory import create_agentscope_model
from core.agentscope_core.compression_schema import (
    SunaCompressedSummary,
    SUNA_SUMMARY_TEMPLATE,
    SUNA_COMPRESSION_PROMPT,
)
from core.utils.logger import logger


async def create_agent(
    config: AgentConfig,
    tool_registry=None,
    mcp_wrapper=None,
    supabase_client=None,
    stream_queue=None,
) -> ReActAgent:
    """
    Create a fully configured AgentScope ReActAgent.
    
    Args:
        config: Agent configuration
        tool_registry: Existing tool registry to migrate
        mcp_wrapper: MCP tool wrapper for external integrations
        supabase_client: Supabase client for message persistence
        stream_queue: Async queue for streaming output to frontend
        
    Returns:
        Configured ReActAgent ready for execution
    """
    
    # 1. Create AgentScope model using native model factory
    model = create_agentscope_model(
        model_name=config.model_name,
        stream=True,  # Always stream for UI responsiveness
    )
    logger.info(f"Created AgentScope model for {config.model_name}")
    
    # 2. Create toolkit and register tools
    toolkit = Toolkit()
    if tool_registry:
        adapter = ToolkitAdapter(toolkit, tool_registry)
        adapter.register_all_tools()
        logger.info(f"Registered {len(toolkit.tools)} tools from existing registry")
    
    # 2b. Register MCP tools if wrapper provided
    if mcp_wrapper:
        from core.agentscope_core.toolkit.mcp_adapter import MCPAdapter
        mcp_adapter = MCPAdapter(toolkit, mcp_wrapper)
        mcp_adapter.register_base_tools()
        logger.info("Registered MCP base tools: discover_mcp_tools, execute_mcp_tool")
    
    # 2c. Register JIT dynamic tool loading
    jit_adapter = JITToolkitAdapter(
        toolkit=toolkit,
        thread_id=config.thread_id,
        project_id=config.project_id,
        supabase_client=supabase_client,
    )
    jit_adapter.register_jit_tools()
    logger.info("Registered JIT initialize_tools function")
    
    # NOTE: expand_message is already registered via native ExpandMessageTool
    # through ToolkitAdapter.register_all_tools() - no need for separate adapter
    
    # 2d. Restore dynamic tools from previous runs (if not new thread)
    if not config.is_new_thread:
        restored = await jit_adapter.restore_dynamic_tools()
        if restored > 0:
            logger.info(f"Restored {restored} dynamic tools from previous runs")
    
    # 3. Create custom memory with Supabase integration
    memory = SupabaseMemory(
        thread_id=config.thread_id,
        client=supabase_client,
        memory_context=config.memory_context,
    )
    await memory.load_history()
    msg_count = await memory.size()
    logger.info(f"Loaded {msg_count} messages from history")
    
    # 4. Build system prompt using PromptManager
    from core.agents.runner.prompt_manager import PromptManager
    
    system_message, context_message = await PromptManager.build_system_prompt(
        model_name=config.model_name,
        agent_config=config.agent_config_dict,
        thread_id=config.thread_id,
        mcp_wrapper_instance=mcp_wrapper,
        client=supabase_client,
        tool_registry=tool_registry,
        user_id=config.account_id,
    )
    system_prompt_content = system_message["content"]
    logger.info(f"Built system prompt: {len(system_prompt_content)} chars")
    
    # NOTE: context_message (user memories, file context) is intentionally not used
    # during AgentScope migration. See migrate_todo_list.md for details.
    if context_message:
        logger.debug("context_message available but not injected (deferred for migration)")
    
    # 5. Create CompressionConfig using AgentScope's built-in compression
    compression_config = None
    if config.compression_enabled:
        compression_config = ReActAgent.CompressionConfig(
            enable=True,
            trigger_threshold=config.compression_token_threshold,
            keep_recent=config.compression_keep_recent,
            summary_schema=SunaCompressedSummary,
            summary_template=SUNA_SUMMARY_TEMPLATE,
            compression_prompt=SUNA_COMPRESSION_PROMPT,
        )
        logger.info(
            f"Enabled compression: threshold={config.compression_token_threshold}, "
            f"keep_recent={config.compression_keep_recent}"
        )
    
    # 6. Create the ReActAgent with native AgentScope configuration
    agent = ReActAgent(
        name=f"SunaAgent-{config.thread_id[:8]}",
        sys_prompt=system_prompt_content,
        model=model,
        toolkit=toolkit,
        max_iters=config.max_iters,
        memory=memory,
        compression_config=compression_config,
    )
    
    # 7. Create hooks for billing, streaming, and termination
    # NOTE: Message persistence is handled by SupabaseMemory.add()
    
    # Billing hooks (pre_reasoning credit check)
    billing_hooks = BillingHooks(
        account_id=config.account_id,
        model_name=config.model_name,
    )
    
    # DB hooks for billing deduction and Langfuse tracing
    db_hooks = DBHooks(
        thread_id=config.thread_id,
        account_id=config.account_id,
        agent_run_id=config.agent_run_id,
        trace=config.trace,
        client=supabase_client,
    )
    
    streaming_hooks = StreamingHooks(
        thread_id=config.thread_id,
        agent_run_id=config.agent_run_id,
        stream_queue=stream_queue,
        memory=memory,  # Pass memory for assistant_message_id lookup
    )
    
    termination_hooks = TerminationHooks(
        agent=agent,
    )
    
    # 8. Register hooks using correct AgentScope API
    # API: register_instance_hook(hook_type: str, hook_name: str, hook: Callable)
    # Hook signatures (AgentScope passes agent as first arg):
    #   Pre-hook: (agent: AgentBase, kwargs: dict) -> dict | None
    #   Post-hook: (agent: AgentBase, kwargs: dict, output: Any) -> Any | None
    # We use lambda wrappers since our hook classes don't expect agent param
    
    # Billing pre-check (runs before each LLM call)
    agent.register_instance_hook(
        "pre_reasoning",
        "billing_check",
        lambda agent, kwargs: billing_hooks.pre_reasoning(kwargs)
    )
    
    # DB persistence hooks (billing and tracing)
    agent.register_instance_hook(
        "post_reasoning", 
        "db_save_assistant", 
        lambda agent, kwargs, output: db_hooks.post_reasoning(kwargs, output)
    )
    agent.register_instance_hook(
        "post_acting", 
        "db_save_tool_result", 
        lambda agent, kwargs, output: db_hooks.post_acting(kwargs, output)
    )
    
    # Streaming hooks
    agent.register_instance_hook(
        "post_reasoning", 
        "stream_assistant", 
        lambda agent, kwargs, output: streaming_hooks.post_reasoning(kwargs, output)
    )
    agent.register_instance_hook(
        "post_acting", 
        "stream_tool_result", 
        lambda agent, kwargs, output: streaming_hooks.post_acting(kwargs, output)
    )
    
    # Termination hooks
    agent.register_instance_hook(
        "post_acting", 
        "check_termination", 
        lambda agent, kwargs, output: termination_hooks.post_acting(kwargs, output)
    )
    
    logger.info(f"Created AgentScope agent with {config.max_iters} max iterations")
    
    return agent


async def run_agent(
    agent: ReActAgent,
    user_message: str,
    config: AgentConfig,
) -> Dict[str, Any]:
    """
    Run the agent with a user message.
    
    AgentScope's ReActAgent handles the entire ReAct loop internally.
    Streaming is handled through the registered hooks.
    
    Args:
        agent: Configured ReActAgent
        user_message: The user's input message
        config: Agent configuration
        
    Returns:
        Final response from the agent
    """
    from agentscope.message import Msg
    
    # Create user message
    user_msg = Msg(
        name="user",
        content=user_message,
        role="user",
    )
    
    # NOTE: Do NOT manually add to memory - AgentScope's reply() does this automatically
    
    try:
        # Run the agent using AgentScope's native reply() method (async)
        # This handles the entire ReAct loop internally
        # Streaming content is captured by hooks
        response = await agent.reply(user_msg)
        
        return {
            "success": True,
            "content": response.content if hasattr(response, 'content') else str(response),
            "role": "assistant",
        }
        
    except Exception as e:
        logger.error(f"Agent execution error: {e}")
        return {
            "success": False,
            "error": str(e),
        }
