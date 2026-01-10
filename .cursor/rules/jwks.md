---
description: "Supabase JWT 验签统一使用 JWKS（Signing Keys）规则：RS256 走 JWKS，HS256 走 SUPABASE_JWT_SECRET；禁止泄露 token；固定 JWKS 路径推导"
alwaysApply: false
globs:
  - "backend/core/utils/auth_utils.py"
  - "backend/core/utils/**/auth*.py"
  - "backend/core/**/auth*.py"
---

## JWKS（Supabase JWT Signing Keys）规则：jwks

### 目标
- **统一 JWT 验签策略**：当 token 为 **RS256** 时，必须使用 Supabase 的 **JWKS Signing Keys** 验签；当 token 为 **HS256** 时，使用 `SUPABASE_JWT_SECRET`。
- **避免安全风险**：禁止 `alg=none`；禁止“按 token 自述 alg 自动接受”的不安全行为；禁止在日志/异常中输出 token 本体。

### 验签要求（强制）
- **RS256 / ES256 必须走 JWKS**：
  - JWKS 地址固定从 `SUPABASE_URL` 推导：`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
  - 通过 token header 的 `kid` 从 JWKS 里选择 signing key
  - 缓存 JWKS client（建议 `@lru_cache`，容量保持小；默认 `maxsize=1` 足够）
- **HS256 走 shared secret**：
  - 必须使用 `SUPABASE_JWT_SECRET` 进行 `HS256` 验签
- **算法限制**：
- 仅允许 `HS256` / `RS256` / `ES256`
  - 绝对禁止 `none`

### 日志与可观测性（强制）
- 解码/验签失败时：
  - 允许打印 `token_alg` / `token_kid` / `allowed_algs`
  - **禁止**打印完整 JWT（header.payload.signature）或任何可复原 token 的内容

### 配置原则（偏好）
- 不引入 `SUPABASE_JWKS_URL` 之类的额外可配置项，除非有明确多环境/多 issuer 的需求。
- 优先保持代码路径可预测：RS256 → JWKS；HS256 → SECRET。


