---
description: "Sentry rules for this repo (backend FastAPI + frontend Next.js): enablement, tagging, spans, and safe payload policy"
alwaysApply: false
globs:
  - "backend/api.py"
  - "backend/core/services/sentry_service.py"
  - "backend/core/agents/**/*.py"
  - "backend/core/agentpress/**/*.py"
  - "apps/frontend/sentry.*.config.ts"
  - "apps/frontend/src/app/monitoring/route.ts"
---

# Sentry（Backend + Frontend）规则（本仓库专用）

## 目标与边界（强约束）
- **目标**：Sentry 作为系统告警/错误入口；LLM 深度回放由 **Langfuse** 承担（chunks、完整 prompt/response 等）。
- **边界**：只允许“埋点/观测层”改动；**不要重写业务流程**。优先使用 `backend/core/services/sentry_service.py` 的封装。

## 启用方式（DSN 缺失 = 全程 no-op）

### Backend（FastAPI）
- **必需**
  - `SENTRY_DSN=<backend project DSN>`
- **可选**
  - `SENTRY_TRACES_SAMPLE_RATE=1.0`（默认 1.0）
  - `SENTRY_RELEASE=<git sha>`
  - `ENV_MODE=local|staging|production`
- **代码入口**
  - `backend/api.py` 启动时会调用 `init_backend_sentry()`（无需额外接线）。

### Frontend（Next.js）
- **必需**
  - `NEXT_PUBLIC_SENTRY_DSN=<frontend project DSN (Public DSN)>`
- **可选**
  - `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=0..1`（默认 0：不出 tracing）
  - `NEXT_PUBLIC_SENTRY_RELEASE=<git sha>`
  - `NEXT_PUBLIC_ENV_MODE=development|staging|production`
- **说明**
  - 前端使用 `tunnel: '/monitoring'`，由 `apps/frontend/src/app/monitoring/route.ts` 转发到自建 Sentry。

## Langfuse 分工与联动（强约束）

### 分工原则（本仓库的最终口径）
- **Langfuse = LLM 排查主系统**：完整 prompt/response、stream chunks、tool call 细节、generation 级数据。
- **Sentry = 系统入口与告警**：errors/perf（transaction+spans）、小型快照/摘要、以及**指向 Langfuse 的可点击关联信息**。

### 关联字段约定（必须）
- **Sentry tags（必须写入）**
  - `langfuse_trace_id`: **= `agent_run_id`**（phase-1 约定：trace_id == agent_run_id）
  - `agent_run_id`, `thread_id`, `run_number`（用于从 Sentry 精确定位到 Langfuse 的具体 run/generation）
- **Langfuse（建议写入/保留）**
  - `trace_id = agent_run_id`
  - `generation_id`（如果系统里有明确 id，建议同步进 Sentry tag：`langfuse_generation_id`）

### Langfuse 可点击直达（必须）
- **必须在 Sentry event/transaction 中提供可点击直达信息**（用于从 Sentry 一键打开 Langfuse）
- 约定字段（建议作为 Sentry tag 或 extra）：
  - `langfuse_url = {LANGFUSE_HOST}/trace/{agent_run_id}`
- `LANGFUSE_HOST` 的来源（统一口径）：
  - 后端：从 Langfuse 配置/环境变量读取（不要硬编码 cloud host）
  - 前端：如果需要展示/上报 URL，则从前端环境变量读取（或由后端下发）

### stream chunks 的摘要位置（必须）
- **chunks 本体不进入 Sentry**。
- chunks 的“摘要/统计”（chunk_count、finish_reason、最后 N 字符、是否出现 tool_calls 等）必须写入 **Langfuse generation metadata**（与每次 LLM 调用强绑定）。

## 必填关联字段（用于检索与联动）

### Backend tags（由 `structlog.contextvars` 自动同步到 Sentry）
`agent_run_id`, `thread_id`, `project_id`, `account_id`, `request_id`, `method`, `path`

### 强约束
- **每个 Sentry error event：必须可检索到 `agent_run_id`**
  - 有 agent run 上下文：确保代码路径已经 `bind_contextvars(agent_run_id=...)`
  - 无 agent run（例如普通 API 请求/启动错误）：必须至少可检索 `request_id` + `path`（已在 `backend/api.py` middleware 绑定），并会自动打 `has_agent_run_id=false`

### Frontend 关联字段策略（必须明确）
- 前端错误事件**可能天然没有** `agent_run_id/thread_id/run_number`，这是允许的；但必须确保可检索性：
  - **至少**：`path`（路由/页面），`release`，`environment`
  - **如果能拿到**：从后端响应/页面状态中提取 `thread_id` / `agent_run_id`，用 `Sentry.setTag(...)` 写入
- 强约束：
  - **不要**把用户输入全文/附件内容/沙箱内容塞到前端 Sentry 的 tag/extra

## 异步上下文传播（避免断链，强约束）
- 本仓库大量使用 `asyncio`，**不要假设 contextvars 在任意 create_task/队列/后台任务中都稳定继承**。
- 最稳的口径（推荐）：
  - 把“必需关联信息”作为参数显式传递（或作为队列 item 字段），至少包含：
    - `agent_run_id`, `thread_id`, `run_number`, `request_id`（如果有）
  - 在新任务入口（协程/worker）第一行：`structlog.contextvars.bind_contextvars(...)`
- 如果该异步任务可能上报 Sentry：
  - 必须确保 `agent_run_id`（agent 场景）或 `request_id+path`（非 agent 场景）在 scope tags 中可检索。

## 埋点规范（Backend）

### 1) Transaction（每个 agent_run 作为一个 transaction）
- 使用：`from core.services.sentry_service import transaction_agent_run`
- 规则：仅在 agent-run 顶层包裹；不要在深层重复起 transaction。
- 命名建议（便于检索/聚类）：
  - transaction op 固定 `agent.run`
  - name 建议包含 `agent_run_id`（或至少可通过 tags 搜到 `agent_run_id`）

### 2) Span（必须用统一 op 命名）
- 使用：`from core.services.sentry_service import span`
- 推荐 op：
  - `llm.call`（模型调用）
  - `tool.execute`（工具执行）
  - `tool.parse`（native tool call 解析/修复）
  - `agent.run`（ReAct 主循环/一次 run）
  - `agent.compress`（压缩）
  - `sandbox.*`（沙箱相关）
- Cardinality（强约束，避免 tag 爆炸/查询不可用）：
  - tag 值必须是“低基数”或“业务主键”（如 `agent_run_id/thread_id/tool_name/model`）
  - **不要**把 prompt/response/用户输入/大 JSON 放到 tag

### 3) Breadcrumb vs Info Event（仓库约定）
- **Breadcrumb**：上层 try/except 的“上下文线索”（避免刷屏）
- **Info event**：可检索、可聚类的“信号类事件”
  - 本仓库：**native tool-call JSON repair** 使用 info event（类型 `ToolCallJsonRepaired`）

### 4) 报错上报（允许重复 capture）
- 使用：`from core.services.sentry_service import capture_exception`
- 传参规范（强建议）：
  - `llm_stage`: 例如 `agent.run` / `llm.call` / `tool.execute`
  - `error_type`: 业务分类字符串（用于检索/聚类）
  - `tags`: 小型键值（不要塞大 payload）

### 5) Breadcrumb vs capture_exception 的执行口径（必须统一）
- **下层/局部 try/except**：默认只打 breadcrumb（stage + 关键 id），除非你能确定这是“根因”且会导致本次 run 失败
- **会导致用户失败/中断的异常**：必须 `capture_exception`
- **JSON repair**：固定走 info event（已实现去重）

## 负载策略（强约束：不上传文件内容）

### 禁止上传到 Sentry 的内容
- **用户上传附件内容**：只允许上传文件名（filename）
- **sandbox 文件内容**：只允许上传地址/路径/url（通过 ToolResult.artifacts 统一承载）
- **LLM stream chunks**：不进入 Sentry；放 Langfuse（可写 chunk 摘要到 generation metadata）

### 允许上传到 Sentry 的内容（建议“小而可检索”）
- tags：`agent_run_id/thread_id/run_number/model/tool_name/...`
- extra：长度受控的 summary（例如 last_n_chars、count、len、finish_reason、ttft）
- hashes：`tools_hash/params_hash`（用于定位污染/变化）

### 字符串/摘要的硬限制（必须）
- 任意写入 Sentry 的 `message/tag/extra/data`：
  - **必须截断**（推荐上限：2KB～8KB；以“能定位问题”为准）
  - **禁止**写入完整 prompt/完整 response/完整 chunks/文件内容

## ToolResult.artifacts（沙箱产物地址的统一承载）
- 形状：`[{ sandbox_id, path, url? }, ...]`
- 只允许地址元信息，不允许内容。
- 上报方式：调用 `record_sandbox_artifacts(artifacts)`（会写 breadcrumb）。

## JSON repair 信号（native tool calling）
- 统一调用：`record_tool_call_json_repaired(...)`
- 去重策略：`agent_run_id + run_number + tool_call_id`，窗口 60s（实现已在 `sentry_service.py`）

## “在 Cursor 里直接完成任务”的执行模板

### A) 给某个 backend 阶段加可观测性（不污染业务）
1. 找到阶段边界（例如 LLM 调用、工具执行、压缩、沙箱 I/O）。
2. 用 `span(op=..., description=..., data=...)` 包裹边界代码。
3. 在 except 块调用 `capture_exception(e, llm_stage=..., error_type=...)`（允许重复）。
4. 确认不会把用户文件/沙箱内容放进 tags/extra。

### B) 让某类异常在 Sentry 里“必带 agent_run_id”
1. 找到该异常发生点最近的上下文：是否能拿到 `agent_run_id`？
2. 如果能拿到：优先 `structlog.contextvars.bind_contextvars(agent_run_id=...)`（并保持生命周期覆盖该异常）。
3. 如果拿不到：确保 request middleware 已绑定 `request_id/path/method`，并依赖 `has_agent_run_id=false` 检索。

## 验收清单（做完必须能自证）

### Backend
- 启动日志出现：`[SENTRY] Enabled ...`
- 人工制造一次异常（或触发已知错误路径）：
  - Sentry 中能看到 error event
  - event 中可检索：`agent_run_id`（agent 场景）或 `request_id + path`（非 agent 场景）

### Frontend
- 人工制造一次前端错误：
  - 浏览器 Network 能看到 `POST /monitoring`
  - Sentry 能收到 event（且带 `release/environment/path`）

## Release / Sourcemaps（前端排查体验关键）
- **必须设置 release**（前后端可以不同，但必须可区分且稳定）
  - frontend：`NEXT_PUBLIC_SENTRY_RELEASE`
  - backend：`SENTRY_RELEASE`
- 如果你希望前端堆栈可读（还原到源码），部署流水线必须上传 sourcemaps（自建 Sentry 同理）

## 自建 Sentry + Tunnel 注意事项（前端）
- 本仓库使用 `tunnel: '/monitoring'`：
  - `apps/frontend/src/app/monitoring/route.ts` 会校验 **hostname/project_id**，确保只转发到你 DSN 指向的 Sentry 项目。
- 变更 DSN（host 或 project）后：
  - 必须同步更新前端环境变量并重新部署，否则 tunnel 会返回 500（host/project 校验失败）。

