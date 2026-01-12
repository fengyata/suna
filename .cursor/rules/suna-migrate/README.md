# suna-migrate 索引（Cursor 规则/迁移/修复）

这个目录用于存放 **Suna 迁移与问题修复的“可执行 runbook”**。建议按主题拆分文件，并保持以下索引更新。

## 文件索引
- **`rules.md`**：迁移主规则（上线步骤 / 验收 / 回滚 / 配置项）
- **`fix_bug.md`**：已验证的故障修复 runbook（包含根因、定位、最小修复）

## 变更记录（changes）
- `changes/20260112-fix-gemini-cache.md`：修复 Gemini/Vertex CachedContent 与 tools/system 冲突（禁用 Gemini 的 PROMPT_CACHING）
- `changes/20260112-fix-vision-image-context.md`：修复“上传图片/带图对话不可用”（image_context 使用 data URL）
- `changes/20260112-fix-storage-invalidkey.md`：修复 `/v1/files/stage` 中文/emoji 文件名导致 Supabase Storage `InvalidKey`

## 推荐新增方式（以后你频繁改动时）
当一次改动涉及多文件/有上线风险时，新增一份“变更记录”，放到：
- `changes/YYYYMMDD-<topic>.md`

并按固定结构写（方便 Cursor 自动复用）：
- **背景/目的**
- **涉及文件（路径列表）**
- **关键行为变化（Before/After）**
- **验证步骤**
- **回滚方式**

## 模板
- **变更记录模板**：`changes/_template.md`


