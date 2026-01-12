# 20260112 - Fix Vision（上传图片/带图对话不可用）

## 背景/目的
- 用户上传/加载图片后，后续对话无法稳定“看图”（在 Bedrock/Anthropic 或 Gemini/Vertex 下均可能失败）。
- 目的：用**最小且通用**的方式，让 LLM 侧稳定拿到图像内容。

## 涉及文件
- `backend/core/tools/sb_vision_tool.py`
-（理解链路用）`backend/core/agentpress/response_processor.py`
-（理解链路用）`backend/core/agentpress/thread_manager.py`
-（理解链路用）`backend/core/ai_models/registry.py`（`IMAGE_MODEL_ID = "kortix/haiku"`）

## 关键行为变化（Before/After）
### Before
- `load_image` 工具在写入给 LLM 的 `image_context` 消息里，用的是 **Supabase public URL**：
  - `{"type":"image_url","image_url":{"url":"https://..."}}`
- 部分 provider 不会/不能抓取外部 URL（或受网络/权限限制），导致“看不到图/报错”。

### After
- `load_image` 在 `_image_context_data.message_content` 里改为 **data URL（base64 inline）**：
  - `{"type":"image_url","image_url":{"url":"data:image/...;base64,..."}}`
- 同时 tool 的输出仍保留 `public_url`，便于前端展示/下载；但 LLM 侧不依赖远程 fetch。

## 配置变更（如有）
- 无新增必需配置。
- 注意：如果带图线程会切换到 `IMAGE_MODEL_ID`（`kortix/haiku`），在 STAGING/PROD 下通常走 Bedrock，需要确保对应鉴权（例如 `AWS_BEARER_TOKEN_BEDROCK`）已配置。

## 验证步骤
- 在对话中执行 `load_image`：
  - 期望 tool 成功返回
  - 期望后续对话能正确描述图片内容
- 检查 thread 是否被标记为带图：
  - 日志中出现 `🖼️ Set has_images=True`
- 检查模型切换（如果当前模型不支持 vision）：
  - 日志中出现 `🖼️ Thread has images - switching to image model: ...`

## 回滚方式
- 将 `sb_vision_tool.py` 中写入 `image_context` 的 `image_url.url` 恢复为 public_url（不推荐，回到不稳定的远程 fetch）。

## 备注
- 若未来 Gemini Basic/Advanced 直接支持 vision，可考虑给其加 `VISION` capability 并取消“带图切换到 `kortix/haiku`”，但需确认 provider 对多模态消息格式的真实兼容性。


