---
description: "ModeIndicator 规则：仅保留 Basic/Advanced 两个模型选项，统一使用 /kortix-symbol.svg 图标；禁止展示或请求其他模型"
alwaysApply: false
globs:
  - "apps/frontend/src/components/thread/mode-indicator.tsx"
---

## ModeIndicator 规则（强制）

### 适用范围
- 文件：`apps/frontend/src/components/thread/mode-indicator.tsx`

### 目标
- `ModeIndicator` 组件的模型列表 **只保留 2 个**，不允许出现第三个或从接口/配置动态扩展到更多模型。

### 模型列表（唯一真相）
- **Model 1**
  - **id**: `kortix/basic`
  - **label**: `Basic`
  - **description**: `Fast and efficient for quick tasks`
  - **icon/image**: `/kortix-symbol.svg`

- **Model 2**
  - **id**: `kortix/power`
  - **label**: `Advanced`
  - **description**: `Fast and efficient for quick tasks`
  - **icon/image**: `/kortix-symbol.svg`

### UI/行为约束
- **禁止**：展示除上述 2 个之外的任何模型（包括但不限于 `google/*`、`openai/*`、`anthropic/*` 等）。
- **禁止**：为不同模型使用不同图片/不同图标；两个模型必须都使用同一张图片：`/kortix-symbol.svg`。
- **允许**：UI 的布局、hover、选中态、下拉交互细节优化，但不得改变上述“模型清单”和“图片路径”约束。

### Review 清单
- 组件渲染出的选项是否严格只有 2 个？
- 是否存在从 `accountState/models`、feature flag、env 等路径引入“额外模型”的可能？
- 两个选项是否都使用了同一个图标路径：`/kortix-symbol.svg`？

