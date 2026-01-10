---
description: "Brand 文案替换规则：仅将对外可见文案从 Suna/Kortix 统一为 SuperAgent；禁止改动内部标识符/DB/RPC/路由/infra 字符串；包含 Review 清单与示例"
alwaysApply: false
globs:
  - "backend/**/*.py"
  - "backend/**/*.sql"
  - "backend/**/*.md"
---

## Brand 替换规则：SuperAgent（仅文案）

### 目标
- **统一对外品牌文案**：把用户/管理员可见的品牌文案从 **Suna**（以及默认 Agent 展示的 **Kortix**）统一替换为 **SuperAgent**。
- **保持系统兼容**：避免引入数据迁移与接口破坏，所有内部标识符保持不变。

### 变更边界（强制）
- **允许修改（仅文案）**：
  - **默认 Agent 展示字段**：例如 `name` / `description` 等（用户可见）。
  - **API 返回文案**：例如 `HTTPException(detail=...)` 等提示文本（用户可见）。
  - **模板/邮件/通知文案**：用户可见文本、标题、描述等。
  - **日志文案**：仅替换日志中的品牌词（可观测性可见），不改 logger 名称/结构/字段。
  - **SQL/DB 侧写死的文本常量**：例如欢迎语、交易描述、函数 COMMENT 文本（用户可见或运维可见）。

- **禁止修改（会影响逻辑/兼容性）**：
  - **DB 字段与 JSON key**：例如 `is_suna_default`、`centrally_managed` 等。
  - **RPC/函数名/索引名**：例如 `find_suna_default_agent_for_account`、`idx_*suna*`。
  - **路由路径**：例如 `/suna-agents/...`（路径属于接口契约）。
  - **域名 / webhook URL / CORS origin**：例如 `staging.suna.so`、`staging-api.suna.so`。
  - **Docker 镜像 / sandbox image / network 名称**：例如 `ghcr.io/.../suna/...`、`kortix/suna:...`、`suna-network`。
  - **类名/函数名/模块名**：例如 `SunaDefaultAgentService`、`load_static_suna_config()`（属于内部 API/引用关系）。

### Review 清单（必须逐项过一遍）
- **用户可见行为是否改变？**
  - API 响应的 `detail` / message 文案变化（前端可能做展示或埋点）。
  - 默认 Agent 的 `name/description` 变化（会影响 UI 展示、搜索、导出）。
  - 由 DB 触发器/函数写入的描述字段变化（仅影响新写入记录，历史不会自动回填）。

- **是否误改了内部标识符？（高风险，禁止）**
  - 是否出现把 `is_suna_default` 改名的情况。
  - 是否改了 RPC 名称、路由路径、域名、镜像名、network 名。

- **SQL 迁移策略是否正确？**
  - **不要改历史 migration 文件**（避免已应用环境不可重放）。
  - 新增 migration 使用 `CREATE OR REPLACE` 更新函数/触发器中的文本常量。

### 替换示例
- **允许**：
  - `"Welcome to Suna! ..."` → `"Welcome to SuperAgent! ..."`
  - `"Suna's tools cannot be modified"` → `"SuperAgent's tools cannot be modified"`
  - 默认 Agent `name: "Kortix"` → `name: "SuperAgent"`

- **禁止**：
  - `metadata->>'is_suna_default'` → `metadata->>'is_superagent_default'`
  - `CREATE OR REPLACE FUNCTION find_suna_default_agent_for_account(...)` → 重命名函数
  - `@router.post("/suna-agents/...")` → 改成 `/superagent-agents/...`

