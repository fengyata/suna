---
description: "Brand 文案替换规则（backend/）：Suna→SuperAgent；产品语境 Kortix→SuperAgent；团队/公司语境 Kortix→Flashlabs。禁止改动内部标识符/DB/RPC/路由/infra 字符串；附 Review 清单与示例。"
alwaysApply: false
globs:
  - "backend/**/*.py"
  - "backend/**/*.sql"
  - "backend/**/*.md"
  - "backend/**/*.html"
---

## Brand 替换规则：SuperAgent（产品）/ Flashlabs（团队）

> English note: This rule is **copywriting-only**. Do not rename internal identifiers, routes, DB keys, or infrastructure strings.

### 目标
- **统一对外产品品牌文案**：把用户可见文案中的 **Suna / Kortix（产品语境）** 统一替换为 **SuperAgent**。
- **统一团队/公司品牌文案**：把明确指向 **团队/公司** 的 **Kortix** 替换为 **Flashlabs**。
- **保持系统兼容**：避免引入数据迁移与接口破坏，所有内部标识符保持不变。

### 词汇映射（强制）
- **Suna → SuperAgent**
  - 仅限用户可见文案（prompt 文本、邮件/模板、异常提示、OpenAPI 描述、SQL COMMENT/description、日志文案等）。
- **Kortix → SuperAgent（默认）**
  - 只要是“产品/品牌/平台”语境（如 “Welcome to Kortix”, “Kortix API”, “Kortix, your AI Worker”）。
- **Kortix → Flashlabs（仅团队/公司语境）**
  - 明确表达“团队/公司/法人/版权归属”时使用（如 “Kortix team”, “Kortix AI Corp.”, “© 2024 Kortix. All rights reserved.”）。

### 变更边界（强制）
- **允许修改（仅文案）**：
  - **Prompt**：多行字符串中的身份/欢迎语/描述等可见文案。
  - **Prompt 中的域名（例外规则）**：如果 `kortix.com` 出现在 **Prompt 文本**（多行提示词/模板字符串）里，允许替换为 `info.flashlabs.ai`。
    - English note: This exception applies to prompt text only; do not change infrastructure URLs elsewhere.
  - **API 返回文案**：例如 `HTTPException(detail=...)` 里的提示文本（用户可见）。
  - **模板/邮件/通知文案**：标题、正文、落款、版权行等。
  - **OpenAPI 文档文案**：title/description（Swagger UI 可见）。
  - **SQL/DB 侧写死的文本常量**：欢迎语、交易描述、函数/列 COMMENT（用户/运维可见）。
  - **日志文案**：仅替换日志消息中的品牌词（不改 logger 名称/结构/字段）。

- **禁止修改（会影响逻辑/兼容性）**：
  - **DB 字段与 JSON key**：例如 `is_suna_default`、`is_kortix_team`、`centrally_managed` 等。
  - **RPC/函数名/索引名**：例如 `find_suna_default_agent_for_account`、`idx_*suna*`。
  - **路由路径**：例如 `/suna-agents/...`（路径属于接口契约）。
  - **域名 / webhook URL / CORS origin / 邮箱 / 资产链接**（除 Prompt 文本例外外，一律不改）：
    - 例如 `api.kortix.com`、`kortix.com/Logomark.svg`、`hello@kortix.com`、`github.com/kortix-ai/suna`。
    - 这些属于基础设施/兼容性要素：**不改**（除非产品方另行提供新值并明确要求迁移）。
  - **Docker 镜像 / network 名称**：例如 `.../suna/...`、`suna-network`。
  - **类名/函数名/模块名**：例如 `SunaDefaultAgentService`、`load_static_suna_config()`（内部引用关系）。

### “团队/公司语境”判定指南（用于 Kortix→Flashlabs）
- **优先判定为团队/公司语境**（改为 Flashlabs）：
  - “Kortix team”
  - “Kortix AI Corp.”
  - 版权行：`© 20xx Kortix ...`
  - 组织署名/公司名称/法律实体表述
- **优先判定为产品语境**（改为 SuperAgent）：
  - “Welcome to Kortix”
  - “Sign in to Kortix”
  - “Kortix API”
  - “Kortix, your AI Worker”

### SQL 迁移策略（强制）
- **不要改历史 migration 文件**（避免已应用环境不可重放）。
- 如需替换 DB 侧函数/触发器/COMMENT 中的文本常量：
  - 新增 migration
  - 使用 `CREATE OR REPLACE` 更新函数，或使用 `COMMENT ON ...` 更新注释文本
  - 仅改“可见文本”，不动函数名/列名/触发器名

### 模型命名规则（backend/core/ai_models/registry.py）
- **仅当修改 `Model.name`（用户可见）时适用**：
  - 如果把 `Model.name` 从 `Suna`/`Kortix`（产品语境）替换为 `SuperAgent`，则 **必须在 `aliases` 同步添加对应的新别名**（用于兼容不同输入方式）。
  - **保留旧别名**（例如 `Kortix Basic`）以兼容历史/外部调用；不要删除或重命名内部 `id`（例如 `kortix/basic`）。
- **示例**（允许）：
  - `name="SuperAgent Basic"` 时，`aliases` 里同时包含：
    - 旧别名：`"Kortix Basic"`（兼容）
    - 新别名：`"SuperAgent Basic"`, `"superagent-basic"`（新增）

### Review 清单（必须逐项过一遍）
- **用户可见行为是否改变？**
  - API 响应 `detail` / message 文案变化（前端可能展示或埋点）。
  - 默认 Agent 展示字段 `name/description` 变化（影响 UI 展示、搜索、导出）。
  - DB 触发器/函数写入的描述字段变化（仅影响新写入记录，历史不会自动回填）。
- **是否误改了内部标识符？（高风险，禁止）**
  - `is_suna_default`、`is_kortix_team` 等 key 是否保持不变。
  - RPC/函数名/索引名 是否保持不变。
  - 路由路径、域名、邮箱、资产链接 是否保持不变。
  - `Model.id`（例如 `kortix/basic`）是否保持不变；仅允许改 `name/description` 等展示字段与别名补充。

### 替换示例
- **允许（产品文案 → SuperAgent）**：
  - `"Welcome to Suna!"` → `"Welcome to SuperAgent!"`
  - `"Sign in to Kortix"` → `"Sign in to SuperAgent"`
  - `"Kortix API"` → `"SuperAgent API"`
- **允许（Prompt 文本中的域名例外）**：
  - `"created by the Flashlabs team (kortix.com)."` → `"created by the Flashlabs team (info.flashlabs.ai)."`
- **允许（团队/公司文案 → Flashlabs）**：
  - `"created by the Kortix team"` → `"created by the Flashlabs team"`
  - `"© 2025 Kortix AI Corp. All rights reserved."` → `"© 2025 Flashlabs. All rights reserved."`
- **禁止（内部标识符/契约）**：
  - `metadata->>'is_suna_default'` → ❌ 不改
  - `COMMENT ON COLUMN agent_templates.is_kortix_team ...` → 只允许改注释里的“Kortix team”为“Flashlabs team”，但 `is_kortix_team` 不改
  - `@router.post("/suna-agents/...")` → ❌ 不改
- **禁止（非 Prompt 的基础设施链接/域名）**：
  - `api.kortix.com` → ❌ 不改（除非产品明确要求迁移）