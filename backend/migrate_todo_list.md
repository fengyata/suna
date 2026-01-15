# AgentScope Migration - TODO List

This file tracks features that are intentionally deferred during the AgentScope migration.
These items should be addressed in future iterations.

## Deferred Features

### 1. AgentScope Knowledge Base Integration
**Status**: Not migrated  
**Priority**: Medium  
**Current behavior**: KB content injected directly into system prompt (token-heavy)  
**Recommended approach**: 
- Use AgentScope's native `KnowledgeBase` with vector retrieval
- Adapt existing Supabase KB table structure
- Enable `enable_rewrite_query=True` for better retrieval

**Files to modify**:
- `core/agentscope_core/agent/factory.py` - Add `knowledge` parameter to ReActAgent
- Create `core/agentscope_core/knowledge/supabase_kb.py` - Adapter for Supabase KB

---

### 2. User Memories (Vector Retrieval)
**Status**: Not migrated  
**Priority**: Medium  
**Current behavior**: `PromptManager._fetch_user_memories()` performs vector similarity search  
**Reason for deferral**: Complex logic with subscription tier checks and permissions

**Files to reference**:
- `core/agents/runner/prompt_manager.py` L464-536

---

### 3. File Context Injection
**Status**: Not migrated  
**Priority**: Low  
**Current behavior**: `PromptManager._fetch_file_context()` loads full file content from Redis  
**Reason for deferral**: Token explosion risk - needs redesign

**Recommended approach**:
- Inject only file list (names + sizes), not full content
- Use `expand_message` or dedicated tool for on-demand file reading
- Consider AgentScope RAG for file content retrieval

**Files to reference**:
- `core/agents/runner/prompt_manager.py` L543-558

---

### 4. Prompt Caching (Anthropic)
**Status**: Not migrated  
**Priority**: Low  
**Current behavior**: Uses Anthropic's prompt caching for repeated system prompts  
**Reason for deferral**: AgentScope doesn't directly support this optimization

**Recommended approach**:
- Investigate AgentScope model wrapper customization
- Or implement caching at a higher level

---

### 5. Prefetch Optimization
**Status**: Not migrated  
**Priority**: Low  
**Current behavior**: `asyncio.create_task` for concurrent message and stats prefetching  
**Reason for deferral**: Optimization can be re-added after core migration is stable

---

### 6. Disabled Tools Configuration
**Status**: Deferred  
**Priority**: Low  
**Current behavior**: `AgentRunner._get_disabled_tools_from_config` reads `agentpress_tools` from agent_config  
**Reason for deferral**: `agentpress_tools` defaults to empty in DB; no tools currently configured to disable

**Files to reference**:
- `core/agents/runner/agent_runner.py` - `_get_disabled_tools_from_config` method

---

### 7. Other Optimizations
**Status**: Not migrated  
**Priority**: Low  
**Items**:
- `ensure_project_metadata_cached` - Caches project metadata for faster access
- `tool_cache.warm_cache` - Pre-warms tool cache for frequently used tools
- `MCPManager.clean_legacy_mcp_tools` - Cleans up old MCP tool definitions
- `ThreadManager.cleanup` - Periodic cleanup of thread resources

**Reason for deferral**: These are performance/cleanup optimizations that can be added after core migration is stable

---

### 8. Image URL Refresh for Long Sessions
**Status**: Deferred  
**Priority**: Medium  
**Current behavior**: Supabase signed URLs expire after 1 hour  
**Problem**: Long conversations may have expired image URLs in message history

**Recommended approach**:
- Use `refresh_image_urls_in_messages()` from `core/files/url_refresh.py`
- Call before LLM API calls to refresh expired signed URLs
- May need integration point in SupabaseMemory or agent hooks

**Files to reference**:
- `core/files/url_refresh.py` - URL refresh implementation

---

### 9. Async Tool Registration
**Status**: Deferred  
**Priority**: Low  
**Current behavior**: Tool registration in executor.py is synchronous  
**Problem**: Blocks event loop during agent initialization

**Recommended approach**:
- Convert `ToolManager.register_core_tools()` to async
- Use `run_in_executor()` for CPU-bound schema parsing
- Or move registration to background task

**Files to reference**:
- `core/agentscope_core/executor.py` L207-243
- `core/agents/runner/tool_manager.py`

---

### 10. ThreadManager Dependency Refactor
**Status**: Deferred  
**Priority**: Low  
**Current behavior**: AgentScope executor creates full ThreadManager just for ToolRegistry  
**Problem**: 16+ tool classes depend on ThreadManager for DB access, MCP, JIT loading

**Recommended approach**:
- Create lightweight `AgentScopeToolContext` adapter class
- Refactor tool classes to use interface instead of concrete ThreadManager
- Large refactoring effort - evaluate after migration is stable

**Files to reference**:
- `core/agentscope_core/executor.py` L207-243
- `core/tools/expand_msg_tool.py` - Example of deep ThreadManager usage

---

## Completed Items

- [x] XML tool calling removal
- [x] AgentScope skeleton creation
- [x] SupabaseMemory implementation
- [x] Compression with custom schema
- [x] ToolkitAdapter with ToolResponse
- [x] MCPAdapter integration
- [x] PromptManager integration for system prompt
- [x] Executor entry point (with Redis, stop signal, Langfuse, status updates)
- [x] Frontend cumulative streaming adaptation
- [x] BillingHooks for pre_reasoning credit check
- [x] JITToolkitAdapter for dynamic tool loading
- [x] ExpandMessageAdapter for compressed message retrieval
- [x] Dynamic tools restoration from thread metadata
- [x] Langfuse flush in executor cleanup

---

## Notes

- All deferred items should be re-evaluated after the AgentScope migration is stable
- The native implementation (`agent_runner.py`) will be deprecated once AgentScope is fully validated
- Historical data repair script should be created before production deployment

