# 20260112 - fix-storage-invalidkey-filename

## 背景/目的
- **背景**：`POST /v1/files/stage` 上传到 Supabase Storage 时，若文件名包含中文/emoji，Storage 返回 `InvalidKey`（400），服务端包装成 500。
- **目的**：采用方案1（ASCII 化）修复 object key 生成逻辑，并在 ASCII 化后为空时使用 `file_<hash>.<ext>` 兜底，确保中文/emoji 文件名稳定上传。

## 涉及文件
- `backend/core/files/staged_files_api.py`
- `backend/core/utils/fast_parse/utils.py`
- `backend/tests/core/test_file_name.py`

## 关键行为变化（Before/After）
- **Before**：
  - `storage_path` 可能包含中文/emoji（例如 `.../新文件29.txt`、`.../😀.txt`）
  - Supabase Storage 可能报 `InvalidKey`（400），最终 API 返回 500
- **After**：
  - `storage_path` 的文件名部分变为 ASCII 安全串（保留扩展名）
  - 当文件名 ASCII 化后为空时，使用兜底：`file_<hash>.<ext>`（例如 `file_a1b2c3d4.txt`）
  - 新上传的中文/emoji 文件名不再触发 `InvalidKey`

## 配置变更（如有）
- 无

## 验证步骤
- **单元测试（pytest）**覆盖至少：
  - `"hello world.pdf"` → `hello_world.pdf`
  - `"新文件29.txt"` → 输出为 ASCII 安全文件名且保留扩展名（例如 `29.txt`）
  - `"a/b\\c?.txt"` → 输出不含 `/`、`\\`、`?` 等危险字符（例如 `a_b_c.txt`）
  - `"😀.txt"` → fallback 生效且保留扩展名，输出形如 `file_<hash>.txt`
- **接口验证（STAGING 优先）**：
  - 上传 `新文件29.txt`、`😀.txt`，确认 `/v1/files/stage` 成功返回
  - 检查 Supabase bucket 对象存在，且 key 不包含中文/emoji
  - staged file 后续下载/删除/agent 引用不受影响（依赖数据库保存的 `storage_path`）

## 回滚方式
- 回滚 `backend/core/utils/fast_parse/utils.py` 中 `sanitize_filename_for_path()` 到上一版本并重新部署。
- 注意：回滚后，中文/emoji 文件名会再次触发 `InvalidKey`，问题会复现。

## 备注
- 本次为最小修复：不调整 `/v1/files/stage` 的错误映射策略（底层可能是 Storage 400，但对外仍可能返回 500）。
- 影响范围有限：运行时仅 `/v1/files/stage` 依赖 `sanitize_filename_for_path()` 构造 `storage_path`；历史数据不做迁移，新老 key 由数据库记录隔离管理。