# Fix Bugs Runbook（Gemini 直连 / Prompt Caching / 图片上传不可用）

本文记录一次完整的线上/本地问题链路与修复方式，供后续 Cursor 直接读取并快速定位同类问题。

---

## 现象与根因一览

### A) `LLM Provider NOT provided`（LiteLLM）
**现象日志（典型）**：
- `litellm.BadRequestError: LLM Provider NOT provided... You passed model=google/gemini-3-flash-preview`

**根因**：
- LiteLLM 直连 Gemini 时，model 名必须使用 LiteLLM 认可的 provider 前缀。
- `google/...` **不是** LiteLLM 的 Gemini provider 前缀；需要使用 `gemini/...`。

**修复**：
- 把默认模型 `litellm_model_id` 从 `google/gemini-...` 改为 `gemini/gemini-...`。
- 相关文件：`backend/core/ai_models/registry.py`

---

### B) Vertex/Gemini 400：`CachedContent can not be used with GenerateContent request setting system_instruction, tools or tool_config`
**现象日志（典型）**：
- `Vertex_ai_betaException BadRequestError ... CachedContent can not be used with GenerateContent request setting system_instruction, tools or tool_config`

**根因**：
- 项目内的 prompt caching 机制（`backend/core/agentpress/prompt_caching.py`）通过给 message `content` 插入 `cache_control` 来触发缓存（Anthropic 风格）。
- 在 Gemini/Vertex 路径下，这会触发 CachedContent；而 Vertex 限制 CachedContent **不能与** system_instruction/tools/tool_config 同时使用。
- Agent 对话通常必然带 system + tools，因此会直接 400。

**最小修复（推荐）**：
- **不要让 Gemini 模型宣称支持 `PROMPT_CACHING`**，否则会被套用 Anthropic 风格缓存。
- 相关文件：`backend/core/ai_models/registry.py`（移除 `ModelCapability.PROMPT_CACHING`）
- 注意：`backend/core/agentpress/prompt_caching.py` 最小化改动版本仅看 capability，不做 provider gating。

**非最小修复（更大工程）**：
- 为 Gemini/Vertex 单独实现缓存：把 system/tools/tool_config 移到 CachedContent 里并复用（需 provider 分支，工程量大）。

---

### C) “上传图片/带图对话不可用”
**现象**：
- 用户上传/加载图片后，后续对话无法正确“看图”，或在 Bedrock/Gemini 下报错。

**项目现有设计**：
- `load_image` 工具（`backend/core/tools/sb_vision_tool.py`）会把图片写入 `image_context` 消息（role=user，content 包含 `type=image_url`）。
- `response_processor` 在 tool_result 之后把 `image_context` 保存进 thread，并设置 `has_images=true`。
- `thread_manager` 在执行 run 时，如果 thread 有图且当前模型不支持 vision，会切换到 `IMAGE_MODEL_ID`（默认 `kortix/haiku`）：
  - `backend/core/agentpress/thread_manager.py` `_execute_run()`：`supports_vision + thread_has_images` 判断
  - `backend/core/ai_models/registry.py`：`IMAGE_MODEL_ID = "kortix/haiku"`

**根因（高概率）**：
- `image_context` 原本使用 **Supabase public URL** 作为 `image_url.url`，很多 provider 不会拉取外部 URL 或受限，导致“看不到图/报错”。

**修复（最小且通用）**：
- 在写入给 LLM 的 `image_context` 时，把 `image_url.url` 改成 **data URL（base64 inline）**，避免 provider 取远程 URL。
- 仍可在 tool 输出里保留 `public_url` 方便前端展示。
- 相关文件：`backend/core/tools/sb_vision_tool.py`

---

## 实际落地改动点（本 repo）

### 1) 默认模型（Basic/Advanced）改为 Gemini 直连
- 文件：`backend/core/ai_models/registry.py`
- 要点：
  - `kortix/basic.litellm_model_id = "gemini/gemini-3-flash-preview"`
  - `kortix/power.litellm_model_id = "gemini/gemini-3-pro-preview"`
  - pricing 映射覆盖 `gemini/...`（并可保留 `google/...` 仅用于定价/兼容解析）
  - **Gemini 模型不要带 `ModelCapability.PROMPT_CACHING`**

### 2) 修复 KB 摘要里的 Gemini provider 前缀
- 文件：`backend/core/knowledge_base/file_processor.py`
- 要点：
  - 把 `google/gemini-2.5-flash-lite` 改为 `gemini/gemini-2.5-flash-lite`

### 3) 修复图片上下文：用 data URL 传给 LLM
- 文件：`backend/core/tools/sb_vision_tool.py`
- 要点：
  - `_image_context_data.message_content.content` 中的 `image_url.url` 使用 `data:<mime>;base64,...`
  - tool 输出 `image_url` 仍可保留 public_url

---

## 排查清单（快速定位）

### 1) LLM 实际调用的 model 是什么？
看日志：`backend/core/services/llm.py`
- `BEFORE litellm.acompletion: <actual_model>`

### 2) 是否触发了图片线程的模型切换？
看日志：`backend/core/agentpress/thread_manager.py`
- `🖼️ Thread has images - switching to image model: ...`

### 3) 是否发生 CachedContent 冲突？
看 Vertex/Gemini 报错：
- `CachedContent can not be used with GenerateContent request setting system_instruction, tools or tool_config`

### 4) 图片消息是否是 data URL？
检查 `image_context` 里 message content：
- `{"type":"image_url","image_url":{"url":"data:image/...;base64,..."}}`

---

## 注意事项
- `IMAGE_MODEL_ID` 当前指向 `kortix/haiku`，在 STAGING/PROD 通常走 Bedrock inference profile；需确保对应 Bedrock 鉴权（例如 `AWS_BEARER_TOKEN_BEDROCK`）已配置，否则带图线程切换后也会失败。
- 如果未来想让 Gemini Basic/Advanced 直接支持 vision，需要确认：
  - provider 支持图像输入
  - 消息格式（image_url/data URL）与 LiteLLM/Vertex 兼容
  - 以及是否仍然需要 `IMAGE_MODEL_ID` 的兜底策略


