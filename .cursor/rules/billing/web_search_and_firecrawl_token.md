# Web Search（Tavily）与 Firecrawl：Flashlabs Token 扣费规则

## 目标

为 `backend/core/tools/web_search_tool.py` 的两个能力补齐 Flashlabs Token 扣费：

- **Tavily（web_search）**：
  - **单 query**：成功时扣 **1 个 token**
  - **batch（多个 query）**：按成功次数 **N**，一次性扣 **N 个 token**
- **Firecrawl（scrape_webpage）**：**触发即扣 1 个 token**（见下文“触发”定义），并沿用既有抓取类 featId：`FeatIdConfig.WEB_SCRAPE`。

统一策略（本版本的硬性口径）：

- **扣费时机**：
  - `web_search`：Tavily 搜索完成后，根据成功次数触发扣费
  - `scrape_webpage`：Firecrawl 抓取流程结束后触发扣费（先抓取，后扣费）
- **性能约束**：扣费逻辑必须 **异步执行**（fire-and-forget），**不阻塞**工具调用返回。
- **失败策略（重要变更）**：扣费采用 **best-effort**，扣费失败 **不阻断**工具调用（不再 fail-closed），仅记录日志以便排查。

---

## 扣费规则

### 1) Tavily（web_search）

#### 1.1 扣费金额/单位

- **不做 USD 成本计算**。
- **单 query**：成功固定扣 **1 token**（`value = 1`）
- **batch**：按成功次数 `success_count` 固定扣 **success_count token**（`value = success_count`，一次扣费）

#### 1.2 扣费时机

- **Tavily 调用完成后再扣费**：
  - 单 query：仅当该 query 成功时扣 1 token
  - batch：统计所有 query 的成功次数 `success_count`，若 `success_count > 0`，一次扣 `success_count` token
- Tavily 请求失败/超时：该次 query 视为失败，不计入 `success_count`，因此不扣费。

#### 1.3 扣费接口（强约束）

不走 `deduct_for_tool(cost_usd->token)` 的“按 USD 计费”路径。本版本需要 **固定扣 token**，因此在 `backend/core/services/api_billing_service.py` 参考 `deduct_for_tool` 的实现方式，新增一个按 token_value 直接扣费的封装方法，由该方法内部完成 `account_uuid -> (company_id,user_id)` 解析与 `reduce_token` 调用。

新增方法（落地实现）：

```python
async def deduct_tokens_for_tool(
    self,
    account_uuid: str,
    feat_id: str,
    token_value: int,
    message_id: str
) -> bool:
    """
    与 deduct_for_tool 类似，但不接收 cost_usd，不做 usd_to_token 换算，
    直接按 token_value 扣减（用于固定扣 token 的工具）。
    内部：resolve_company_user(account_uuid) -> reduce_token(...)
    并遵循 billing_enabled 的 local 跳过规则。
    """
```

工具侧调用：

- `token_service.deduct_tokens_for_tool(account_uuid=account_id, feat_id=FeatIdConfig.WEB_SEARCH, token_value=<1 or success_count>, message_id=...)`

featId：

- Tavily 单独分账：新增 `FeatIdConfig.WEB_SEARCH = "web_search"`。

local 规则（与仓库现状保持一致）：

- 当 `token_service.billing_enabled == False`（local 默认）：
  - **跳过扣费**，直接执行 Tavily；
  - 仅用于开发调试；如需本地联调扣费，设置 `TOKEN_BILLING_ENABLE_LOCAL=true`。

---

### 2) Firecrawl（scrape_webpage）

#### 2.1 featId（你指定的约束）

- **不要使用** `WEB_SCRAPE_FIRECRAWL`
- **统一使用**：`FeatIdConfig.WEB_SCRAPE`

#### 2.2 计费方式（版本 2：可执行口径）

为保证规则简单、可执行，本版本采用 **固定扣 1 token**：

- **value**：`value = 1`
- **扣费时机**：**先抓取，后扣费**（抓取流程结束后触发）
- **成功定义（重要变更）**：**只要触发了 `scrape_webpage`（见下文“触发”定义）就扣费**，不要求抓取成功；但若发生异常（抛出异常进入 `except` 分支）则不扣费。

“触发”定义（用于避免空参数误扣）：
- `urls` 解析后得到 `url_list` 且 `len(url_list) > 0`，并进入实际抓取流程。

Firecrawl 失败/超时：
- 若是**正常返回的失败**（例如所有 URL 抓取失败，但流程正常结束并返回错误结果）：**仍扣费**（因为已触发）。
- 若是**异常**（抛异常进入 except）：**不扣费**。

local 规则：

- 当 `token_service.billing_enabled == False`（local 默认）：
  - 跳过扣费，直接执行 Firecrawl；
  - 本地联调扣费同上。

---

## 幂等与审计（messageId 传递规则，必读）

Token 服务扣减接口依赖 `messageId` 做服务端幂等。必须满足：

- **同一次工具调用重试**：`messageId` 必须保持不变（否则会重复扣费）。
- **不同工具调用**：`messageId` 必须不同（避免误去重）。

### 推荐 messageId 规则（强幂等）

使用工具调用上下文中的 `tool_call_id`（由 response_processor 在执行工具前设置，可通过 `get_current_tool_call_id()` 取到）。

- Tavily：
  - `messageId = "{thread_id}:tavily:{tool_call_id|no_tool_call_id}"`
- Firecrawl：
  - `messageId = "{thread_id}:firecrawl:{tool_call_id|no_tool_call_id}"`

兜底（不推荐但必须有，且需要显式记录风险）：

- 若取不到 `tool_call_id`：
  - 允许退化为 `"{thread_id}:{action}:no_tool_call_id"`；
  - **风险**：同一 thread 内并发/重复调用可能发生“误去重或重复扣费”，因此应优先确保 `tool_call_id` 可用（强建议把它视为必需条件）。

---

## 改动点（最小集）

### 1) `backend/core/tools/web_search_tool.py`

需要新增/调整：

- **异步扣费调度**（不阻塞工具返回）：
  - 从 structlog context 获取 `thread_id`（并作为参数显式传入扣费调度）
  - 从 tool streaming context 获取 `tool_call_id`
  - 调用 `token_service.schedule_deduct_tokens(thread_id=..., db=thread_manager.db, feat_id=..., token_value=..., tool_call_id=...)`
  - `schedule_deduct_tokens` 内部使用 `asyncio.create_task(...)` 后台执行扣费
  - 后台任务内通过 `token_service.resolve_account_uuid_from_thread(thread_id, client)` 获取 `account_uuid`（带缓存）
- **Tavily（web_search）扣费**：
  - 单 query：成功时异步扣 `1 token`
  - batch：统计成功次数 `success_count`，若 `success_count > 0`，异步扣 `success_count token`（一次扣费）
- **Firecrawl（scrape_webpage）扣费**：
  - `url_list` 非空且触发抓取：在抓取流程结束时异步扣 `1 token`
  - 异常（抛异常进入 except）不扣费

### 2) `backend/core/services/api_billing_service.py`

- 需要 Tavily 单独分账：新增 `FeatIdConfig.WEB_SEARCH = "web_search"`。
- 新增 `token_service.deduct_tokens_for_tool(...)`：用于固定扣 token 的工具。
- 新增 `token_service.schedule_deduct_tokens(...)`：统一的异步扣费调度入口（fire-and-forget）。
- 新增 `token_service.resolve_account_uuid_from_thread(thread_id, supabase_client)`：
  - **带缓存**：Redis key `account_uuid_from_thread:{thread_id}`
  - 缓存 TTL 可复用现有 TTL 配置（当前实现复用 `USER_MAPPING_CACHE_TTL`）

---

## 验收/测试清单

### Tavily（web_search）

- **扣费规则**：
  - 单 query：成功扣 `1 token`；失败不扣
  - batch：成功次数为 N，则扣 `N token`（一次扣费）；N=0 不扣
- **扣费时机**：
  - Tavily 返回后触发扣费（异步），不阻塞工具返回。
- **幂等**：
  - 同一次 tool_call 重试（相同 `tool_call_id`）不应重复扣费（Token 服务幂等命中）。
- **扣费失败**：
  - 扣费失败不影响工具返回（best-effort），但应有错误日志可排查。

### Firecrawl（scrape_webpage）

- **featId 正确**：
  - 所有 Firecrawl 抽取扣费的 `featId` 均为 `FeatIdConfig.WEB_SCRAPE`。
- **扣费规则**：
  - `url_list` 非空且触发抓取：扣 `1 token`（异步）
  - `urls` 为空 / 无有效 URL：不扣费
  - **异常（抛异常）**：不扣费