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

### Triggers 弹框（新增）
- **目标**：在 `ModeIndicator` 的下拉菜单中，在两条模型选项（Basic/Advanced）下面增加一个 **Triggers** 按钮。
- **UI 约束（强制）**：
  - 两条模型选项（Basic/Advanced）与 Triggers 按钮之间 **必须有一条分割线**（视觉分隔）。
  - Triggers 按钮在 **可用态**（有 `agentId`）必须展示 `cursor-pointer`；在 **禁用态** 必须展示禁用样式（如 `cursor-not-allowed`）。
- **实现方式（强制）**：
  - 在 `apps/frontend/src/components/thread/mode-indicator.tsx` 中引入组件：`@/components/agents/triggers/agent-triggers-dialog`（`AgentTriggersDialog`）。
  - 在组件内部新增 state 管理弹框开关，例如：`const [triggersOpen, setTriggersOpen] = useState(false)`。
  - **agentId 来源（强制）**：使用“当前会话/输入框选择的 agentId”。建议直接从现有 agent 选择状态来源获取（例如 `agent-selection-store` 的 `selectedAgentId`），保证与 UI 当前选择一致。
    - 若当前没有可用的 `agentId`，按钮应置灰/禁用（避免打开空弹框）。
- **交互（强制）**：
  - Triggers 按钮点击后：先关闭模型下拉（`setIsOpen(false)`），再打开 `AgentTriggersDialog`（`setTriggersOpen(true)`）。
  - 弹框渲染：`<AgentTriggersDialog open={triggersOpen} onOpenChange={setTriggersOpen} agentId={selectedAgentId} />`

### Review 清单
- 组件渲染出的选项是否严格只有 2 个？
- 是否存在从 `accountState/models`、feature flag、env 等路径引入“额外模型”的可能？
- 两个选项是否都使用了同一个图标路径：`/kortix-symbol.svg`？
- Triggers 按钮是否在下拉菜单内、且位于两条模型选项下方？
- 模型列表与 Triggers 按钮之间是否有分割线？
- Triggers 按钮可用态是否为 `cursor-pointer`，禁用态是否为禁用样式？
- 点击 Triggers 是否能打开 `AgentTriggersDialog`？是否传入当前选中的 `agentId`？

