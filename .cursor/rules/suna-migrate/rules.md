# Gemini（直连 Google）模型迁移规则（Basic/Advanced 默认模型）

## 背景与目标
- **背景**：当前系统通过 LiteLLM 统一调用不同模型。历史上部分 Google 模型可能通过 OpenRouter（`openrouter/...`）调用。
- **目标**：将默认对话模型切换为 **Google 官方直连**（LiteLLM 的 Google provider，`google/...`），并确保：
  - `kortix/basic` 默认使用 **Gemini 3 Flash**（`google/gemini-3-flash-preview`）
  - `kortix/power`（Advanced）默认使用 **Gemini 3 Pro**（`google/gemini-3-pro-preview`）
  - **不使用 OpenRouter**（不走 `openrouter/...` 的 model id，不依赖 `OPENROUTER_API_KEY`）
  - 计费/成本计算能正确解析定价（避免回退到默认兜底成本）

---

## 迁移范围（本次变更点）
### 模型注册表（核心）
- 文件：`backend/core/ai_models/registry.py`
- 变更：
  - `kortix/basic.litellm_model_id` → `google/gemini-3-flash-preview`
  - `kortix/power.litellm_model_id` → `google/gemini-3-pro-preview`
  - `provider` → `ModelProvider.GOOGLE`
  - `context_window` → `1_000_000`（与 Gemini 3 系列对齐）
  - 注册 `google/...` 的 pricing 映射，供 billing 成本计算解析

### 计费/成本计算（依赖 registry 定价解析）
- 文件：`backend/core/billing/credits/calculator.py`
- 行为：
  - 成本计算通过 `model_manager.get_pricing(model)` → `registry.get_pricing(...)` 解析定价
  - 若定价解析失败会 fallback（目前是小额兜底），因此必须保证 Gemini 3 的 model id 能返回 pricing

### LLM 调用链路（确认不会走 OpenRouter 分支）
- 文件：`backend/core/services/llm.py`
- 行为：
  - `make_llm_api_call()` 会通过 `model_manager.get_litellm_params(...)` 取得最终 `params["model"]`
  - 只有当 `params["model"]` 以 `openrouter/` 开头才会注入 OpenRouter 专属参数（例如 `extra_body.app`）
  - 本次迁移要求：`params["model"]` 必须是 `google/...`（不触发 OpenRouter 分支）

---

## 配置要求（必须满足）
### 1) 环境变量 / 配置项
- **必须**：`GEMINI_API_KEY`
  - 位置：`backend/core/utils/config.py` 中的 `GEMINI_API_KEY`
  - 用途：LiteLLM Google provider 直连 Google Gemini 的鉴权

### 2) 可选（但建议保留/不依赖）
- `OPENROUTER_API_KEY` / `OPENROUTER_API_BASE`
  - 本次迁移**不需要**，但可以保留用于其他模块（例如 canvas 的 OpenRouter 图像模型等）

---

## 上线步骤（推荐顺序）
### Step 0：准备（STAGING 先行）
- 确认 STAGING/PROD 已配置 `GEMINI_API_KEY`
- 确认 Gemini 相关调用在 STAGING 可用（网络、配额、计费账户等）

### Step 1：合并代码并发布到 STAGING
- 发布包含 `backend/core/ai_models/registry.py` 改动的版本

### Step 2：STAGING 验证（必须完成）
- **功能**：
  - 新建对话，默认模型为 `kortix/basic` 时，实际调用模型应为 `google/gemini-3-flash-preview`
  - 切换到 Advanced（`kortix/power`）时，实际调用模型应为 `google/gemini-3-pro-preview`
- **日志验证**（关键）：
  - 在 `backend/core/services/llm.py` 日志中确认 `BEFORE litellm.acompletion` 的 `actual_model` 以 `google/` 开头
  - 不应出现 OpenRouter 专属日志：`OpenRouter app param added ...`
- **计费**：
  - 触发一次对话产生 token usage 后，`calculate_token_cost` 能解析到 Gemini 3 的 pricing（不走兜底）

### Step 3：发布到 PRODUCTION
- 观察 30-60 分钟：
  - LLM 错误率、TTFT、平均耗时、超时比例
  - Google 侧配额/限流错误（429 / quota）是否上升

---

## 回滚策略（必须可执行）
如果出现以下任一情况，建议回滚：
- 大面积鉴权失败（401/403）、配额不足导致不可用
- 关键功能不可用或错误率显著上升

### 回滚方式（最小改动）
- 在 `backend/core/ai_models/registry.py` 中将：
  - `kortix/basic.litellm_model_id` 与 `kortix/power.litellm_model_id`
  - 恢复为上一版本可用的模型（例如你们此前的 MiniMax / Bedrock / OpenRouter 方案）
- 重新发布后端服务

---

## 验收清单（交付标准）
- **默认模型正确**：
  - Basic → `google/gemini-3-flash-preview`
  - Advanced → `google/gemini-3-pro-preview`
- **不走 OpenRouter**：
  - 最终 `params["model"]` 不以 `openrouter/` 开头
  - 不依赖 `OPENROUTER_API_KEY`
- **计费定价可解析**：
  - `model_manager.get_pricing("google/gemini-3-flash-preview")` 有返回
  - `model_manager.get_pricing("google/gemini-3-pro-preview")` 有返回
- **可观测性**：
  - 能从日志定位实际 model id、TTFT、错误原因（`backend/core/services/llm.py`）

---

## 注意事项
- **Canvas/图像相关**：仓库内仍有使用 OpenRouter 的 Gemini 图像模型（例如 `google/gemini-3-pro-image-preview`），它与本次“对话默认模型直连 Google”是两条链路，避免误删其 OpenRouter Key 依赖。
- **pricing 数据来源**：当前 pricing 在 registry 内是静态配置；如未来定价变化，需同步更新该文件以避免成本估算偏差。


