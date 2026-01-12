# 20260112 - Supabase RPC（PostgREST）部署/排错规则

## 背景/目的
- 在本仓库中新增/修改 Supabase RPC（PostgREST RPC）时，统一 **迁移文件规范**、**上线方式**、**验证步骤** 与 **PGRST202 排错流程**。
- 避免出现：数据库里函数已存在（SQL Editor `select` 可用），但 API 侧 `client.rpc(...)` 仍报 `PGRST202`（schema cache 未刷新/连错项目）。

## 涉及文件
- `.cursor/rules/supabase-rpc-deploy.md`
- `backend/supabase/migrations/*.sql`
- `backend/core/services/supabase.py`（`DBConnection` 统一客户端）

## 关键行为变化（Before/After）
- **Before**：
  - 团队成员可能直接在 Dashboard 执行 SQL 或临时改动，缺少统一的“可执行 runbook”。
  - 容易把 “DB 直连可用” 误判为 “RPC 一定可用”，忽略 PostgREST schema cache。
- **After**：
  - 任何 RPC 变更都通过 **新增 migration**（不改旧 SQL）固化，并按统一规则：`public` + `SECURITY DEFINER` + `search_path` + 显式 `GRANT` + 英文 `COMMENT`。
  - 上线后用两条路径分别验证：
    - DB-level：`select public.fn(...)`
    - RPC-level：`client.rpc('fn', params).execute()`
  - 若遇 `PGRST202`，按固定流程定位是 **cache** 还是 **连错项目**。

## 配置变更（如有）
- 通常无需新增配置。
- 仅需确保后端运行环境里 `SUPABASE_URL` / key 指向正确的 Supabase 项目（避免 SQL Editor 操作的是 A 项目，后端却连 B 项目）。

## 验证步骤
- **1) 新增 RPC 的迁移规范检查**
  - 必须新增 `backend/supabase/migrations/YYYYMMDDHHMMSS_<topic>.sql`
  - 不允许修改历史 migration
  - 建议结构：
    - `CREATE OR REPLACE FUNCTION public.<fn>(...) ... SECURITY DEFINER`
    - `SET search_path = public`
    - `GRANT EXECUTE ON FUNCTION public.<fn>(...) TO service_role, authenticated;`（按需求选择）
    - `COMMENT ON FUNCTION ... IS 'English description...'`

- **2) 部署到线上**
  - **Option A（推荐）: Supabase CLI**

```bash
cd backend
supabase login
supabase link --project-ref <prod_project_ref>
supabase db push
```

  - **Option B（快速/手动）: Dashboard SQL Editor**
    - 粘贴并执行整段 migration SQL（建议仍提交到 git，保持环境一致）

- **3) 验证（必须同时做 DB 与 RPC）**
  - DB-level（Postgres 直连）：
    - `select public.get_user_id_by_email('someone@example.com');`
  - RPC-level（PostgREST / Supabase client）：
    - Python（本仓库推荐写法，使用 `DBConnection`）：

```python
client = await DBConnection().client
result = await client.rpc("get_user_id_by_email", {"email_param": email}).execute()
```

- **4) 遇到 PGRST202 的排错顺序**
  - 先确认后端 `SUPABASE_URL` 是否为你刚执行 SQL 的同一个 Supabase 项目
  - 如果项目一致：
    - 等待 30–120 秒让 PostgREST 自动刷新 schema cache（托管 Supabase 常见）
    - 自建 Supabase：重启 `postgrest` 服务刷新 schema cache

## 回滚方式
- **回滚迁移**：用新 migration 写 `DROP FUNCTION`（或恢复旧版本 function body），不要修改历史 migration。
- **线上紧急回滚**（Dashboard 手动执行）后，仍需补一个 migration 固化回滚动作，避免环境漂移。

## 备注
- DB-level `select` 成功 ≠ RPC-level `client.rpc(...)` 一定成功，RPC 依赖 PostgREST schema cache。
- Python 调用建议统一使用 `core.services.supabase.DBConnection` 获取 client，避免在业务代码里自行创建多个 Supabase client。

