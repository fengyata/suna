"""
AgentScope Executor - Simplified entry point for AgentScope-based agent execution.

This module provides execute_agent_run_agentscope() as an alternative to
the native execute_agent_run() in agent_runner.py.

Key responsibilities:
- Redis stream setup and message publishing
- Stop signal checking (cross-instance via Redis)
- Langfuse trace management (via DBHooks)
- Agent run status updates
- Completion notifications
- tool_output_streaming_context setup
- AgentScopeRunner coordination
- Error handling and cleanup
"""

import uuid
import os
import asyncio
import json
import time
from datetime import datetime, timezone
from typing import Optional, Dict, Any, AsyncGenerator

import structlog

from core.utils.logger import logger
from core.utils.config import config as app_config
from core.services import redis
from core.utils.tool_output_streaming import (
    set_tool_output_streaming_context,
    clear_tool_output_streaming_context,
)

# Redis stream TTL (same as native runner)
REDIS_STREAM_TTL_SECONDS = 600  # 10 minutes (same as native runner)


async def _stream_status_message(
    status: str,
    message: str,
    stream_key: str,
) -> None:
    """Stream a status message to Redis."""
    try:
        msg = {
            "type": "status",
            "status": status,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        await redis.stream_add(
            stream_key,
            {"data": json.dumps(msg)},
            maxlen=200,
            approximate=True,
        )
    except Exception as e:
        logger.warning(f"Failed to stream status: {e}")


async def execute_agent_run_agentscope(
    agent_run_id: str,
    thread_id: str,
    project_id: str,
    model_name: str,
    agent_config: dict,
    account_id: str,
    cancellation_event: asyncio.Event,
    is_new_thread: bool = False,
    supabase_client=None,
    tool_registry=None,
    mcp_wrapper=None,
) -> None:
    """
    Execute an agent run using AgentScope.
    
    This is the main entry point for AgentScope-based execution,
    designed to match the signature of execute_agent_run().
    
    This function:
    1. Sets up Redis stream with TTL
    2. Creates Langfuse trace
    3. Starts stop signal checker (for cross-instance stops)
    4. Sets up tool_output_streaming_context
    5. Runs the AgentScope agent
    6. Updates agent run status on completion
    7. Sends completion notification if needed
    
    Args:
        agent_run_id: Agent run identifier
        thread_id: Thread identifier
        project_id: Project identifier
        model_name: LLM model name
        agent_config: Agent configuration dict
        account_id: User account for billing
        cancellation_event: Event to signal cancellation
        is_new_thread: Whether this is a new thread
        supabase_client: Supabase client for DB operations
        tool_registry: Tool registry with available tools
        mcp_wrapper: MCP tool wrapper for external integrations
    """
    from core.agentscope_core.runner import AgentScopeRunner
    from core.agentscope_core.agent.config import AgentConfig
    from core.agents.runner.agent_runner import (
        update_agent_run_status,
        send_completion_notification,
    )
    from core.ai_models import model_manager
    
    execution_start = time.time()
    
    # Set up structured logging context
    structlog.contextvars.clear_contextvars()
    structlog.contextvars.bind_contextvars(
        agent_run_id=agent_run_id,
        thread_id=thread_id,
    )
    
    logger.info(f"[AgentScope] Starting agent run: {agent_run_id}")
    
    stop_checker = None
    final_status = "failed"
    stream_key = f"agent_run:{agent_run_id}:stream"
    trace = None
    complete_tool_called = False
    error_message = None
    
    try:
        start_time = datetime.now(timezone.utc)
        
        # 1. Initialize Redis stream
        await _stream_status_message("initializing", "Starting execution...", stream_key)
        await redis.verify_stream_writable(stream_key)
        
        # Set TTL immediately to prevent orphaned streams on crash
        try:
            await redis.expire(stream_key, REDIS_STREAM_TTL_SECONDS)
        except Exception:
            pass  # Non-critical
        
        # 2. Resolve model name
        effective_model = model_manager.resolve_model_id(model_name)
        
        # 3. Create Langfuse trace
        try:
            from core.services.langfuse import langfuse
            trace = langfuse.trace(
                name="agent_run_agentscope",
                id=agent_run_id,
                session_id=thread_id,
                metadata={
                    "project_id": project_id,
                    "model": effective_model,
                    "agentscope": True,
                }
            )
        except Exception as e:
            logger.warning(f"[AgentScope] Failed to create Langfuse trace: {e}")
            trace = None
        
        # 4. Set up stop signal checker (for cross-instance stops)
        stop_state = {'received': False, 'reason': None}
        STOP_CHECK_INTERVAL = float(os.getenv("AGENT_STOP_CHECK_INTERVAL", "2.0"))
        
        async def check_stop():
            while not stop_state['received']:
                try:
                    # Check in-memory cancellation event first (immediate)
                    if cancellation_event.is_set():
                        stop_state['received'] = True
                        stop_state['reason'] = 'cancellation_event'
                        logger.info(f"[AgentScope] Stop detected via cancellation_event")
                        break
                    
                    # Check Redis stop signal (periodic, cross-instance)
                    if await redis.check_stop_signal(agent_run_id):
                        stop_state['received'] = True
                        stop_state['reason'] = 'stop_signal'
                        cancellation_event.set()
                        logger.info(f"[AgentScope] Stop detected via Redis")
                        break
                    
                    await asyncio.sleep(STOP_CHECK_INTERVAL)
                except asyncio.CancelledError:
                    break
                except Exception:
                    await asyncio.sleep(5.0)
        
        stop_checker = asyncio.create_task(check_stop())
        
        # 5. Set up tool output streaming context
        set_tool_output_streaming_context(
            agent_run_id=agent_run_id,
            stream_key=stream_key,
        )
        
        # 5a. Initialize resources if not provided
        # (These are normally passed in, but when called from api.py they are None)
        if supabase_client is None:
            from core.services.supabase import DBConnection
            db = DBConnection()
            supabase_client = await db.client
            logger.debug("[AgentScope] Created Supabase client")
        
        if tool_registry is None:
            # Create a ThreadManager to hold the tool registry and register core tools
            # This mirrors what native agent_runner.py does in setup_tools()
            from core.agentpress.tool_registry import ToolRegistry
            from core.agentpress.thread_manager import ThreadManager
            from core.agents.runner.tool_manager import ToolManager
            from core.jit.config import JITConfig
            
            # Create JIT config
            jit_config = JITConfig.from_run_context(
                agent_config=agent_config,
                disabled_tools=[]  # TODO: Parse from agent_config if needed
            )
            
            # Create ThreadManager (holds the tool_registry)
            from core.services.langfuse import langfuse
            thread_manager = ThreadManager(
                trace=trace,
                agent_config=agent_config,
                project_id=project_id,
                thread_id=thread_id,
                account_id=account_id,
                jit_config=jit_config,
            )
            
            # Register core tools
            tool_manager = ToolManager(
                thread_manager=thread_manager,
                project_id=project_id,
                thread_id=thread_id,
                agent_config=agent_config,
            )
            tool_manager.register_core_tools()
            
            # Extract the tool_registry
            tool_registry = thread_manager.tool_registry
            logger.info(f"[AgentScope] Registered {len(tool_registry.tools)} core tools")
        
        if mcp_wrapper is None and agent_config:
            # Check if MCP is configured in agent_config
            if agent_config.get('custom_mcps') or agent_config.get('configured_mcps'):
                try:
                    from core.tools.mcp_tool_wrapper import MCPToolWrapper
                    mcp_wrapper = MCPToolWrapper(
                        custom_mcp=agent_config.get('custom_mcps', []),
                        configured_mcps=agent_config.get('configured_mcps', []),
                        account_id=account_id,
                    )
                    logger.debug("[AgentScope] Created MCP wrapper")
                except Exception as e:
                    logger.warning(f"[AgentScope] Failed to create MCP wrapper: {e}")
                    mcp_wrapper = None
        
        # 6. Create runner and config
        runner = AgentScopeRunner(
            thread_id=thread_id,
            account_id=account_id,
            project_id=project_id,
            supabase_client=supabase_client,
        )
        runner.agent_run_id = agent_run_id
        
        config = AgentConfig(
            thread_id=thread_id,
            account_id=account_id,
            agent_run_id=agent_run_id,
            project_id=project_id,
            model_name=effective_model,
            max_iters=agent_config.get('max_iters', 25) if agent_config else 25,
            agent_config_dict=agent_config,
            trace=trace,
            is_new_thread=is_new_thread,
        )
        
        # 7. Setup agent (load history, create agent, register hooks)
        await runner.setup(
            config=config,
            tool_registry=tool_registry,
            mcp_wrapper=mcp_wrapper,
        )
        logger.info(f"[AgentScope] Agent setup complete")
        
        # 8. User message is already in DB (written by api.py create_message())
        # SupabaseMemory.load_history() loads it, so we pass None here
        # The agent will process the latest user message from memory
        user_message = None  # Already loaded from DB by memory
        
        # 9. Run agent and stream to Redis
        first_response = False
        total_responses = 0
        stream_ttl_set = False
        
        async for response in runner.run(
            user_message=user_message,
            cancellation_event=cancellation_event,
        ):
            # Check for stop signal
            if cancellation_event.is_set() or stop_state['received']:
                logger.warning(f"[AgentScope] Agent run stopped: {stop_state.get('reason', 'cancellation_event')}")
                final_status = "stopped"
                error_message = f"Stopped by {stop_state.get('reason', 'cancellation_event')}"
                break
            
            # Track first response timing
            if not first_response:
                first_response_time_ms = (time.time() - execution_start) * 1000
                logger.info(f"[AgentScope] First response: {first_response_time_ms:.1f}ms")
                first_response = True
                
                # Emit timing info
                try:
                    timing_msg = {
                        "type": "timing",
                        "first_response_ms": round(first_response_time_ms, 1),
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                    }
                    await redis.stream_add(
                        stream_key,
                        {"data": json.dumps(timing_msg)},
                        maxlen=200,
                        approximate=True,
                    )
                except Exception:
                    pass
            
            # Serialize and stream response
            from core.services.db import serialize_row
            if isinstance(response, dict):
                response = serialize_row(response)
            
            try:
                await redis.stream_add(
                    stream_key,
                    {"data": json.dumps(response)},
                    maxlen=200,
                    approximate=True,
                )
                
                if not stream_ttl_set:
                    try:
                        await asyncio.wait_for(
                            redis.expire(stream_key, REDIS_STREAM_TTL_SECONDS),
                            timeout=2.0,
                        )
                        stream_ttl_set = True
                    except Exception:
                        pass
            except Exception as e:
                logger.warning(f"[AgentScope] Failed to write to stream: {e}")
            
            total_responses += 1
            
            # Check for terminating tool call
            if response.get('type') == 'tool':
                # metadata may be a JSON string, parse it
                metadata = response.get('metadata', {})
                if isinstance(metadata, str):
                    try:
                        metadata = json.loads(metadata)
                    except (json.JSONDecodeError, TypeError):
                        metadata = {}
                tool_name = metadata.get('tool_execution', {}).get('tool_name', '')
                if tool_name in ('complete', 'ask'):
                    complete_tool_called = (tool_name == 'complete')
            
            # Check for completion status
            if response.get('type') == 'status':
                status = response.get('status')
                if status in ['completed', 'failed', 'stopped', 'error']:
                    final_status = status if status != 'error' else 'failed'
                    if status in ['failed', 'error']:
                        error_message = response.get('message')
                    break
        
        # 10. Normal completion
        if final_status == "failed" and not error_message:
            final_status = "completed"
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            logger.info(
                f"[AgentScope] Agent run completed "
                f"(duration: {duration:.2f}s, responses: {total_responses})"
            )
            
            # Stream completion message
            completion_msg = {
                "type": "status",
                "status": "completed",
                "message": "Completed successfully",
            }
            try:
                await redis.stream_add(
                    stream_key,
                    {'data': json.dumps(completion_msg)},
                    maxlen=200,
                    approximate=True,
                )
            except Exception:
                pass
            
            # Send completion notification
            await send_completion_notification(
                thread_id,
                agent_config,
                complete_tool_called,
            )
        
        # Handle stop signal
        if stop_state['reason']:
            final_status = "stopped"
        
        # Update agent run status
        await update_agent_run_status(
            agent_run_id,
            final_status,
            error=error_message,
            account_id=account_id,
        )
        
        logger.info(f"[AgentScope] Agent run completed: {agent_run_id} | status={final_status}")
        
    except Exception as e:
        logger.error(f"[AgentScope] Error in agent run {agent_run_id}: {e}", exc_info=True)
        await update_agent_run_status(
            agent_run_id,
            "failed",
            error=str(e),
            account_id=account_id,
        )
        
        # Stream error status
        try:
            error_msg = {
                "type": "status",
                "status": "error",
                "message": str(e),
            }
            await redis.stream_add(
                stream_key,
                {'data': json.dumps(error_msg)},
                maxlen=200,
                approximate=True,
            )
        except Exception:
            pass
        
    finally:
        cleanup_errors = []
        
        # Clear streaming context
        try:
            clear_tool_output_streaming_context()
        except Exception as e:
            cleanup_errors.append(f"streaming_context: {e}")
        
        # Cancel stop checker
        if stop_checker and not stop_checker.done():
            try:
                stop_checker.cancel()
                await asyncio.wait_for(
                    asyncio.shield(stop_checker),
                    timeout=0.5,
                )
            except Exception:
                pass
        
        # Finalize Langfuse trace
        if trace:
            try:
                trace.update(
                    status=final_status,
                    metadata={
                        "final_status": final_status,
                        "error": error_message,
                    }
                )
            except Exception as e:
                cleanup_errors.append(f"langfuse: {e}")
        
        # Flush Langfuse (ensure all traces are sent)
        try:
            from core.services.langfuse import langfuse
            await asyncio.to_thread(langfuse.flush)
        except Exception:
            pass  # Non-critical, Langfuse auto-flushes in background
        
        # Clear Redis stop signal
        try:
            await redis.clear_stop_signal(agent_run_id)
        except Exception:
            pass
        
        if cleanup_errors:
            logger.warning(f"[AgentScope] Cleanup errors: {cleanup_errors}")


async def run_with_agentscope(
    thread_id: str,
    user_message: str,
    account_id: Optional[str] = None,
    project_id: Optional[str] = None,
    agent_config: Optional[Dict[str, Any]] = None,
    supabase_client=None,
    tool_registry=None,
    mcp_wrapper=None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Convenience wrapper for execute_agent_run_agentscope.
    
    Generates agent_run_id automatically and returns an async generator.
    For direct streaming use cases (not background task).
    """
    from core.agentscope_core.runner import AgentScopeRunner
    from core.agentscope_core.agent.config import AgentConfig
    
    agent_run_id = str(uuid.uuid4())
    cancellation_event = asyncio.Event()
    
    # Create runner
    runner = AgentScopeRunner(
        thread_id=thread_id,
        account_id=account_id,
        project_id=project_id,
        supabase_client=supabase_client,
    )
    runner.agent_run_id = agent_run_id
    
    # Build config
    config = AgentConfig(
        thread_id=thread_id,
        account_id=account_id,
        agent_run_id=agent_run_id,
        project_id=project_id,
        model_name=agent_config.get('model', 'gpt-4o') if agent_config else 'gpt-4o',
        max_iters=agent_config.get('max_iters', 25) if agent_config else 25,
        agent_config_dict=agent_config,
    )
    
    # Setup agent
    await runner.setup(
        config=config,
        tool_registry=tool_registry,
        mcp_wrapper=mcp_wrapper,
    )
    
    # Run and yield results
    async for message in runner.run(
        user_message=user_message,
        cancellation_event=cancellation_event,
    ):
        yield message
