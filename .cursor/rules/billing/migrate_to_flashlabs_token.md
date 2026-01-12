# 迁移到 Flashlabs Token 计费（Company 维度）规则

## 背景与目标
- **背景**：现有系统内置 billing/credits 体系以 `account_id(UUID)` 为主键，按模型定价（USD）计算成本，再换算/展示为 credits。你们已有一套 **Flashlabs Token** 服务，按 **companyId(long)** 维护额度与扣减。
- **目标**：将后端计费从“内置 credit_accounts/credit_ledger”迁移为“调用 Flashlabs Token HTTP 服务”，并且：
  - **扣费主体**：company 级别（公司内多人共享额度）。
  - **扣减单位**：调用 Token 服务时 `value` 为正整数 token，按 **USD 换算**向上取整。
  - **展示**：对前端仍沿用字段名 **credits**（尽量少改前端），但数值来源于 token 服务（本质是 company token）。
  - **阻止新请求**：当 `remaining = tokenTotal - tokenUsed` 且 **remaining <= 0** 时阻止新请求。

## 关键口径（必须一致）

### 1) LLM/工具成本计算仍以 USD 作为中间量（Decimal）
- **LLM 成本（USD）**：沿用现有 `calculate_token_cost(...)`（含 1.2x markup）。
- **工具成本（USD）**：沿用现有工具逻辑（Apify/Media 按实际/模型价格，Search 固定 $0.45 等）。

### 2) USD → Flashlabs Token 换算（重要）
- Flashlabs Token 服务口径：`0.012` 的单位为 **USD/token**（已确认）。
- 后端调用 `reduce/token` 时：  
  - `value = ceil(cost_usd / 0.012)`  
  - **value 必须为正整数**（>=1，cost_usd>0 时）。

### 3) 展示字段名保持为 credits
- 对前端返回字段仍使用 `credits`/`balance` 等既有字段名。
- 实际数值由 token 服务返回的 `tokenTotal/tokenUsed` 推导（例如 remaining、used 等），但字段名继续沿用 `credits` 以减少前端改动。

## companyId/userId 的来源（无需依赖前端 header）
- 后端通过 JWT 校验拿到 `auth.users.id`（UUID）。
- 用 UUID 查询 `auth.users.email`，email 格式：`{userId}_{companyId}@flashlabs.ai`。
- 从 email 解析得到 `userId(long)` 与 `companyId(long)`。
- 必须加缓存（建议 Redis）：`auth_user_uuid -> {companyId,userId}` TTL 5-10 分钟，避免每次请求查库。

## Flashlabs Token HTTP API（来自 `api.md`）

### 1) 扣减 token
- `POST /api/v2/sales/agent/reduce/token`
- Body（JSON）：
  - `companyId: Long`（必填）
  - `messageId: String`（必填，用于服务端幂等）
  - `userId: Long`（必填）
  - `featId: String`（必填，不能为空）
  - `value: Long`（必填，>0）
- 响应：`{ code, message, data: boolean }`
- **成功判定（重要，按你确认的规则）**：
  - 仅当 **`code == 200` 且 `data == true`** 才视为扣减成功。
  - 其余情况（**任何 `code != 200`** 或 `data != true`）都视为**扣减失败/额度不足**，在后端侧按 **fail-closed** 处理（阻断本次请求/操作），并记录告警日志（包含 code/message/companyId/userId/featId/value）。
- **透支**：服务端允许透支（已确认）；但后端在“开始新请求”仍按 remaining<=0 阻止。

### 2) 查询 token 信息
- `GET /api/v2/sales/agent/get/token/{companyId}`
- 响应：`data: { tokenTotal: Long, tokenUsed: Long }`
- **成功判定（必须与扣减接口一致）**：
  - 仅当 **`code == 200` 且 `data` 存在且包含 `tokenTotal/tokenUsed`** 才视为查询成功。
  - 其余情况（**任何 `code != 200`**、缺少 data、字段缺失、解析异常、网络/超时/5xx）都视为**查询失败/无额度**，按 **fail-closed** 处理（阻断新请求/操作），并记录告警日志（包含 code/message/companyId）。

## 配置约定

### 1) `.env`
- `TOKEN_API_BASE_URL`：token 服务 base_url（仅 base，不含路径）。

### 2) FeatIdConfig（必须有默认值，避免 3000003）
featId 是 Token 服务的“功能/成本模型”标识。你要求 **LLM 的 featId 需要按模型区分**（例如 `LLM_XXXX`），因此这里不能只有一个固定 `LLM` 值。

约束：仍需提供默认值（避免 featId 为空触发 3000003），并提供按模型映射的配置入口（后续你们可替换为真实值）：
- **LLM 模型映射（推荐）**
  - `LLM_DEFAULT = "LLM_DEFAULT"`（兜底，避免缺映射时扣减失败）
  - `LLM_BY_MODEL = { "<model_key>": "<featId>" }`
    - 例如：
      - `"claude_haiku_4_5": "LLM_CLAUDE_HAIKU_4_5"`
      - `"claude_sonnet_4_5": "LLM_CLAUDE_SONNET_4_5"`
      - `"gemini_flash": "LLM_GEMINI_FLASH"`
      - `"gemini_3_preview": "LLM_GEMINI_3_PREVIEW"`
- **非 LLM 类工具（固定分类即可）**
  - `APIFY = "apify"`
  - `SEARCH = "search"`
  - `MEDIA = "media"`

实现规则（必须写进代码，避免歧义）：
- `deduct_usage` 扣费时：**先根据 model 选择 featId**：`featId = LLM_BY_MODEL.get(model_key, LLM_DEFAULT)`。
- `model_key` 的来源必须稳定：建议对传入的 `model` 做一次规范化（小写、去掉 provider 前缀、把 `-` 替换成 `_` 等），再做映射匹配。
  - 例如把 `anthropic/claude-sonnet-4.5`、`openrouter/anthropic/claude-sonnet-4.5` 都归一到 `claude_sonnet_4_5`（具体规则由实现方统一）。\n 

## 代码组织（强约束）

### 1) Token HTTP Client + 适配层放置位置/命名
- 新增文件：`backend/core/services/api_billing_service.py`
- 该文件职责：
  - 读取 `TOKEN_API_BASE_URL`
  - 封装 `get_token(company_id)` / `reduce_token(company_id,user_id,feat_id,value)`
  - 内置 `FeatIdConfig`
  - 提供统一的日志与错误策略（见下文）

### 2) 错误策略（必须明确并实现）
- **余额查询（GET token）失败**：**fail-closed**（当作无额度处理，直接阻断新请求/操作），并必须打 **告警级日志**（warning/error，带 companyId、request_id、异常摘要）。
- **扣减（POST reduce）失败**：**fail-closed**（返回失败/抛出，避免无限免费），并记录 **告警级日志**。

## 必须改动的扣费/校验入口（按优先级）

### 1) 运行前校验（阻止新请求）
- 位置：`backend/core/billing/credits/integration.py`
- 改造：`check_and_reserve_credits(account_id)` 由内置余额查询改为：
  - UUID → (companyId,userId)
  - `GET token/{companyId}`
  - `remaining = tokenTotal - tokenUsed`
  - `remaining <= 0` 返回失败（阻止新请求）

### 2) LLM 扣费（llm_response_end）
- 位置：`backend/core/agentpress/thread_manager.py` → `_handle_billing` → `billing_integration.deduct_usage(...)`
- 改造：`deduct_usage` 改为调用 token reduce：
  - 仍算 `cost_usd`（Decimal）
  - `value = ceil(cost_usd / 0.012)`
  - `featId`：**按模型选择**（来自 `FeatIdConfig.LLM_BY_MODEL`，缺省用 `FeatIdConfig.LLM_DEFAULT`）
  - `POST reduce/token`

### 3) 工具独立扣费（替换 credit_manager 调用）
以下工具目前直接扣内置 credits，需切换为 token reduce（不重写业务，只替换扣费动作）：
- `backend/core/tools/people_search_tool.py`：featId=SEARCH
- `backend/core/tools/company_search_tool.py`：featId=SEARCH
- `backend/core/tools/apify_tool.py` 与 `backend/core/endpoints/apify_approvals_api.py`：featId=APIFY
- `backend/core/billing/credits/media_integration.py`（以及调用它的 media tools）：featId=MEDIA

## 展示类接口（必须改）
目标：前端仍看见 `credits` 字段，但数值来自 token 服务。

建议改动点：
- `backend/core/billing/endpoints/account_state.py`
  - 原先读取 `credit_accounts` 的 balance/credits，改为调用 token 服务获取 `tokenTotal/tokenUsed`。
  - 返回中保留字段名 `credits`（例如把 remaining 映射为 balance_credits 等，具体字段与前端契约对齐）。
- `backend/core/billing/endpoints/core.py`
  - `/credit-breakdown`、`/usage-history`：如果前端使用这些展示明细，需要改为 token 口径或标记 legacy（现有 credit_ledger 不再代表真实余额）。

## 幂等与审计（messageId 传递规则，必读）
Token 服务扣减接口支持 `messageId` 做服务端幂等。对现有代码库的影响很小：**只需要在所有扣减调用时额外提供 messageId**，核心是选择“稳定且唯一”的来源。

### 总原则
- **同一次扣费事件的重试**：`messageId` 必须保持不变（否则会被当成新扣费）。
- **不同扣费事件**：`messageId` 必须不同（避免误去重）。

### 推荐 messageId 来源（最小改动）
- **LLM 扣费（llm_response_end）**：使用 `llm_response_end` 对应的 `message_id`（现成就有，最稳）。
- **Apify approve hold**：使用 `approval_id`。
- **Apify run 实际扣费**：使用 `run_id`（或 `approval_id:run_id`）。
- **People/Company Search**：使用 `thread_id:search:{tool_call_id}`；若获取不到 tool_call_id，则退化为 `thread_id:search:{uuid4}`，并确保在一次调用链内重试复用同一个 uuid。
- **Media（图片/视频）**：使用 `thread_id:media:{tool_call_id}`；同上退化逻辑。

### 双保险（建议保留）
- 即使 token 服务做幂等，后端仍建议保留现有“避免重复扣”的本地保护逻辑（尤其 Apify），把幂等做成双保险。
## 验收/测试清单
- **LLM**：
  - 正常对话后，触发一次 token reduce，value 与 `ceil(cost_usd/0.012)` 一致。
  - 当 remaining<=0 时，新的 run 被阻止（返回明确错误信息）。
- **Search 工具**：
  - 每次调用扣一次 token（按固定 USD 成本换算），不足/失败路径符合错误策略。
- **Apify**：
  - approve 阶段扣费/或执行后扣费（按现有时序保留），不出现重复扣。
- **Media**：
  - 成功后扣费；失败不扣费。
- **展示**：
  - account_state 返回的 `credits` 与 token 服务一致（至少 remaining/total/used 三者逻辑自洽）。
- **容错**：
  - token 查询超时/失败：当作无额度处理并阻断（fail-closed）；token 扣减失败：请求失败并告警。

