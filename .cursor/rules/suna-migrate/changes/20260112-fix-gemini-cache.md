# 20260112 - Fix Gemini Cache（Vertex CachedContent 与 tools/system 冲突）

## 背景/目的
- 在切换到 Gemini（直连）后，线上/本地出现 Vertex 400：
  - `CachedContent can not be used with GenerateContent request setting system_instruction, tools or tool_config`
- 目的：**最小化改动**下，让 Gemini 能稳定进行工具调用与系统提示，不再触发 CachedContent 冲突。

## 涉及文件
- `backend/core/ai_models/registry.py`
- `backend/core/agentpress/prompt_caching.py`（仅恢复到“只按 capability 判断”的最小版本）
- （如适用）`backend/core/knowledge_base/file_processor.py`（修正 LiteLLM Gemini provider 前缀）

## 关键行为变化（Before/After）
### Before
- `kortix/basic` / `kortix/power`（Gemini）声明了 `ModelCapability.PROMPT_CACHING`。
- `prompt_caching.py` 会对“支持缓存”的模型给 message 插入 `cache_control`，在 Gemini/Vertex 路径下会触发 CachedContent。
- Agent 请求又必然带 `system_instruction` / `tools`，导致 Vertex 直接 400。

### After
- Gemini 默认模型 **不再声明** `ModelCapability.PROMPT_CACHING`，从源头避免对 Gemini 注入 `cache_control`。
- `prompt_caching.py` 保持最小逻辑：仅按 registry capability 判断，不做额外 provider gating（便于最小化改动）。
- 结果：Gemini/Vertex 下不再走 CachedContent，从而不再触发 tools/system 冲突。

## 配置变更（如有）
- 无新增必需配置（仍需要 Gemini 直连相关 key，如 `GEMINI_API_KEY`）。

## 验证步骤
- 触发一次带工具调用的对话（例如会调用 `load_image`/搜索/其它工具）：
  - 期望：不再出现 `CachedContent can not be used...` 的 Vertex 400
- 检查日志：
  - `backend/core/services/llm.py` 中 `BEFORE litellm.acompletion` 正常返回流式输出（非 0 chunks）

## 回滚方式
- 若必须恢复 prompt caching（不推荐在 Gemini 上）：
  - 仅在 `registry.py` 中给 Gemini 模型加回 `ModelCapability.PROMPT_CACHING`（会重新触发 Vertex 400 风险）
  - 或者将默认模型切回不受该限制的 provider（如 Anthropic/Bedrock），并在对应模型保持 caching 能力

## 备注
- 如果未来需要 Gemini 真正支持 caching，需要另写 Gemini/Vertex 专用 caching（将 system/tools/tool_config 管理迁移进 CachedContent）。


