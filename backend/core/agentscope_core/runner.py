"""
AgentScope Runner - Entry point for AgentScope-based agent execution.

This module provides the main entry point for running agents using
the AgentScope framework, replacing ThreadManager.run_thread().

Key differences from the old architecture:
- Uses AgentScope's native ReActAgent and model classes
- No LiteLLM bridging - direct AgentScope model calls
- Streaming handled through hooks, not generator yields
- Cleaner separation of concerns
"""

import uuid
import asyncio
from typing import Dict, Any, Optional, AsyncGenerator

from agentscope.message import Msg
from agentscope.agent import ReActAgent
from agentscope.tool import Toolkit

from core.utils.logger import logger
from core.agentscope_core.agent.config import AgentConfig
from core.agentscope_core.agent.factory import create_agent
from core.agentscope_core.memory.supabase_memory import SupabaseMemory
from core.agentscope_core.hooks.db_hooks import DBHooks
from core.agentscope_core.hooks.streaming_hooks import StreamingHooks
from core.agentscope_core.hooks.termination_hooks import TerminationHooks
from core.agentscope_core.toolkit.adapter import ToolkitAdapter
from core.agentscope_core.toolkit.mcp_adapter import MCPAdapter


class AgentScopeRunner:
    """
    Runner for AgentScope-based agent execution.
    
    Replaces the combination of AgentRunner + ThreadManager + ResponseProcessor
    with a cleaner, more maintainable architecture using AgentScope native features.
    """
    
    def __init__(
        self,
        thread_id: str,
        account_id: Optional[str] = None,
        project_id: Optional[str] = None,
        supabase_client=None,
    ):
        """
        Initialize the runner.
        
        Args:
            thread_id: Thread identifier
            account_id: User account for billing
            project_id: Project identifier
            supabase_client: Supabase client for DB operations
        """
        self.thread_id = thread_id
        self.account_id = account_id
        self.project_id = project_id
        self.client = supabase_client
        
        self.agent_run_id = str(uuid.uuid4())
        self.thread_run_id = str(uuid.uuid4())
        
        # Async queue for streaming output
        self.stream_queue: asyncio.Queue = asyncio.Queue()
        
        # Components (initialized in setup)
        self.agent: Optional[ReActAgent] = None
        self.db_hooks: Optional[DBHooks] = None
        self.streaming_hooks: Optional[StreamingHooks] = None
        self.termination_hooks: Optional[TerminationHooks] = None
    
    async def setup(
        self,
        config: AgentConfig,
        tool_registry=None,
        mcp_wrapper=None,
    ) -> None:
        """
        Setup the agent and all components.
        
        Args:
            config: Agent configuration
            tool_registry: Existing tool registry
            mcp_wrapper: MCP tool wrapper
        """
        logger.info(f"Setting up AgentScope runner for thread {self.thread_id}")
        
        # Update config with IDs
        config.agent_run_id = self.agent_run_id
        config.account_id = self.account_id
        config.project_id = self.project_id
        
        # Create the agent using factory (handles all setup)
        self.agent = await create_agent(
            config=config,
            tool_registry=tool_registry,
            mcp_wrapper=mcp_wrapper,
            supabase_client=self.client,
            stream_queue=self.stream_queue,
        )
        
        # Get hooks references from factory-created agent
        # (hooks are registered in create_agent)
        
        logger.info(f"AgentScope runner setup complete for thread {self.thread_id}")
    
    async def run(
        self,
        user_message: Optional[str] = None,
        cancellation_event: Optional[asyncio.Event] = None,
    ) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Run the agent and yield streaming responses.
        
        Uses AgentScope's native agent.reply() method.
        Streaming is handled through the stream_queue populated by hooks.
        
        Args:
            user_message: Optional user message to process
            cancellation_event: Event to signal cancellation
            
        Yields:
            Message chunks in frontend format
        """
        if not self.agent:
            raise RuntimeError("Agent not initialized. Call setup() first.")
        
        # Get streaming hooks from agent (registered in factory)
        streaming_hooks = None
        for hook_name, hook in getattr(self.agent, '_instance_hooks', {}).get('post_reasoning', {}).items():
            if 'stream' in hook_name.lower():
                streaming_hooks = hook.__self__ if hasattr(hook, '__self__') else None
                break
        
        # Yield initial status
        yield {
            "sequence": 0,
            "thread_id": self.thread_id,
            "type": "status",
            "is_llm_message": False,
            "content": '{"status_type": "processing"}',
            "metadata": f'{{"thread_run_id": "{self.thread_run_id}", "agent_run_id": "{self.agent_run_id}"}}',
        }
        
        try:
            # NOTE: User message is added to memory automatically by AgentScope's reply()
            # Do NOT manually add here to avoid duplicate messages
            
            # Run agent in background task, collect output from queue
            agent_task = asyncio.create_task(
                self._run_agent(user_message, cancellation_event)
            )
            
            # Yield messages from stream queue
            sequence = 1
            while True:
                try:
                    # Check if agent task is done
                    if agent_task.done():
                        # Drain remaining queue items
                        while not self.stream_queue.empty():
                            msg = self.stream_queue.get_nowait()
                            msg["sequence"] = sequence
                            sequence += 1
                            yield msg
                        break
                    
                    # Check for cancellation
                    if cancellation_event and cancellation_event.is_set():
                        agent_task.cancel()
                        break
                    
                    # Get next message with timeout
                    try:
                        msg = await asyncio.wait_for(
                            self.stream_queue.get(),
                            timeout=0.1
                        )
                        msg["sequence"] = sequence
                        sequence += 1
                        yield msg
                    except asyncio.TimeoutError:
                        continue
                        
                except asyncio.CancelledError:
                    break
            
            # Check for agent task errors
            if agent_task.done() and not agent_task.cancelled():
                exc = agent_task.exception()
                if exc:
                    raise exc
            
            # Yield finish status
            yield {
                "sequence": sequence,
                "thread_id": self.thread_id,
                "type": "status",
                "is_llm_message": False,
                "content": '{"status_type": "finish", "finish_reason": "stop"}',
                "metadata": f'{{"thread_run_id": "{self.thread_run_id}", "agent_run_id": "{self.agent_run_id}"}}',
            }
            
        except Exception as e:
            logger.error(f"Agent execution error: {e}", exc_info=True)
            yield {
                "sequence": 999,
                "thread_id": self.thread_id,
                "type": "status",
                "is_llm_message": False,
                "content": f'{{"status_type": "error", "error": "{str(e)}"}}',
                "metadata": f'{{"thread_run_id": "{self.thread_run_id}", "agent_run_id": "{self.agent_run_id}"}}',
            }
            raise
    
    async def _run_agent(
        self,
        user_message: Optional[str],
        cancellation_event: Optional[asyncio.Event],
    ) -> None:
        """
        Run the agent using AgentScope's native reply() method.
        
        This is executed as a background task. Output is streamed
        through hooks that push to stream_queue.
        
        Args:
            user_message: User message (already added to memory)
            cancellation_event: Event to signal cancellation
        """
        try:
            # Create user message for reply
            user_msg = None
            if user_message:
                user_msg = Msg(
                    name="user",
                    content=user_message,
                    role="user",
                )
            
            # Use AgentScope's native reply() method (async)
            # This runs the full ReAct loop internally
            # Hooks handle streaming, DB persistence, and termination
            # AgentScope's reply() automatically adds user_msg to memory
            response = await self.agent.reply(user_msg)
            
            logger.info(f"Agent completed with response: {str(response)[:100]}...")
            
        except asyncio.CancelledError:
            logger.info("Agent task cancelled")
            raise
        except Exception as e:
            logger.error(f"Agent execution failed: {e}", exc_info=True)
            raise


async def run_with_agentscope(
    thread_id: str,
    user_message: Optional[str] = None,
    config: Optional[AgentConfig] = None,
    tool_registry=None,
    mcp_wrapper=None,
    supabase_client=None,
    account_id: Optional[str] = None,
    project_id: Optional[str] = None,
    cancellation_event: Optional[asyncio.Event] = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Convenience function to run an agent with AgentScope.
    
    This is the main entry point that replaces the existing
    ThreadManager.run_thread() call chain.
    
    Args:
        thread_id: Thread identifier
        user_message: Optional user message
        config: Agent configuration
        tool_registry: Existing tool registry
        mcp_wrapper: MCP tool wrapper
        supabase_client: Supabase client
        account_id: User account for billing
        project_id: Project identifier
        cancellation_event: Event to signal cancellation
        
    Yields:
        Message chunks in frontend format
    """
    if config is None:
        config = AgentConfig(thread_id=thread_id)
    
    runner = AgentScopeRunner(
        thread_id=thread_id,
        account_id=account_id,
        project_id=project_id,
        supabase_client=supabase_client,
    )
    
    await runner.setup(
        config=config,
        tool_registry=tool_registry,
        mcp_wrapper=mcp_wrapper,
    )
    
    async for chunk in runner.run(
        user_message=user_message,
        cancellation_event=cancellation_event,
    ):
        yield chunk
