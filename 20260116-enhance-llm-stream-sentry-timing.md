# 20260116 - Enhance LLM Streaming Sentry Timing（异常时间信息补齐）

## 背景/目的
- 现有 LLM 流式输出在异常/中断时，Sentry 事件中缺少关键的时序信息（LLM 开始时间、异常时间、总耗时、最后两次 chunk 的间隔等），并且部分情况下 LiteLLM 的原始异常链信息不完整。
- 目的：在**所有 LLM 相关异常**下补齐更细粒度的时间上下文，并把结构化上下文写入 Sentry `extras`，提升排障效率（定位卡顿/断流/超时点）。

## 涉及文件
- 新增：`backend/core/services/llm_timing.py`
- 修改：
  - `backend/core/services/llm.py`
  - `backend/core/agentpress/response_processor.py`
  - `backend/core/agentpress/error_processor.py`
  - `backend/core/services/sentry_service.py`

## 关键行为变化（Before/After）
### Before
- LLM 流式异常时：
  - Sentry 事件主要只有异常本身，**缺少**“LLM 开始时间 / 异常发生时间 / 总耗时 / 最近两次 chunk 间隔 / chunk 数”等关键上下文。
  - 上层抛出的 `LLMError` 可能丢失 LiteLLM 原始异常链（`__cause__`），导致排查 provider / network / timeout 根因信息不足。

### After
- LLM 流式异常时（以及 LLM 调用异常）：
  - 通过 `LLMTimingContext` 统一采集时间信息，并注入到 `ErrorProcessor` 的 `context["llm_timing"]`。
  - `ErrorProcessor.log_error()` 在上报 Sentry 时把结构化 `extras` 一并写入（包含 `llm_stage`、`model`、`thread_id`、`llm_timing` 等）。
  - `sentry_service.capture_exception()` 支持 `extras` 参数，并对复杂对象进行安全裁剪/序列化，避免“上报失败或字段丢失”。
  - `llm.py` 抛出 `LLMError` 时使用 `raise ... from e` 保留 LiteLLM 原始异常链，Sentry 可更完整看到异常来源。

## 配置变更（如有）
- 无新增必需配置。

## 验证步骤
- **验证 Sentry 时间字段（流式异常）**：
  - 构造一个会触发 streaming 异常的场景（例如：断网、provider 主动断流、非法 key、超时等）。
  - 在对应 Sentry event 中检查 `extras` 是否包含：
    - `llm_timing.total_duration_seconds`
    - `llm_timing.last_chunk_interval_seconds`
    - `llm_timing.call_start_time`
    - `llm_timing.exception_time`
    - `llm_timing.chunk_count`
  - 检查 `tags.llm_stage` / `tags.error_type` 是否可用于筛选（例如 `llm.stream` / `llm.call` / `response_processor.stream`）。
- **验证异常链（LiteLLM 原始异常）**：
  - 确认 Sentry event 的异常栈中存在 `LLMError` 的 `__cause__`（原始 LiteLLM 异常），便于定位 provider 错误码/超时来源。

## 回滚方式
- 回滚本次变更涉及的文件：
  - 删除 `backend/core/services/llm_timing.py`
  - 恢复 `llm.py` / `response_processor.py` / `error_processor.py` / `sentry_service.py` 的 timing 注入与 `extras` 上报逻辑
- 若只想快速降噪（不推荐）：保留异常上报但移除 `extras`（Sentry 字段会变少，排障能力回退）。

## 备注
- `response_processor.py` 的 streaming 兜底异常（最外层 `except`）也会带上 `llm_timing`，用于覆盖“LLM 侧未抛到 llm.py 包装层”的异常路径（例如处理器内部异常）。

