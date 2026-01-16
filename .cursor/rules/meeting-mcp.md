# Meeting Agent 快速集成方案 (Quick Integration) PRD

## 1. 方案概述
本方案旨在通过在聊天输入框新增一个快捷开关，允许用户手动开启/关闭 Meeting Agent 连接。
该方案避开了复杂的全局自动绑定逻辑，通过前端 UI 触发后台的 Custom MCP 注册流程。

## 2. 背景：Suna MCP 架构与集成逻辑

Suna 项目实现了一套基于 **Model Context Protocol (MCP)** 的工具集成系统。该系统允许 AI Agent 动态发现并执行外部工具。

### 2.1 核心架构
Suna 支持两种主要的 MCP 集成方式：
- **Composio 集成 (Profiles)**：通过 Composio 平台托管，适用于 Gmail、Slack 等第三方 App。这些集成通常是全局可见的，存储在 `user_mcp_credential_profiles` 表中。
- **自定义 MCP (Custom MCP)**：通过 HTTP/SSE 直接连接到外部服务器。这种方式更加灵活，适用于内部工具或特定 Agent 的扩展。**本次 Meeting Agent 的集成即采用此方式**。

### 2.2 关键组件逻辑
- **MCP Service**：运行时引擎，负责建立瞬时连接（连接 -> 执行 -> 断开），确保连接的可靠性。
- **Dynamic Tool Builder**：将 MCP 服务器提供的原始工具定义转换为 AI 可理解的 JSON Schema，并注入到 Agent 的系统提示词中。

### 2.3 运行逻辑
1. **工具注入**：Agent 启动时，系统自动读取配置的 MCP 工具并将其 Schema 写入 System Prompt。
2. **AI 决策**：AI 根据用户需求匹配最合适的工具。
3. **拦截与执行**：`AgentRunner` 拦截 AI 的工具调用，通过 `MCPService` 发送请求到远程服务器。
4. **结果回显**：工具执行结果返回给 AI，AI 整合结果后给出最终回复。

## 3. Meeting Agent 集成详情 (Custom MCP)

本次集成的 Meeting Agent 属于 **Custom MCP** 类型。它通过 HTTP 协议与后端服务器通信，实现在聊天界面中快速开启会议搜索功能。

### 3.1 调用案例说明

当用户开启 Meeting Agent 并提问时，AI 会识别意图并调用 `search_meeting` 工具。

**1. 输入参数 (Input Params)**
调用工具时，必须包含以下三个核心参数：
- `query`: 用户查询意图（如 "all meetings in the past 60 days"）。
- `company_id`: 用户的公司 ID（如 `1000001`）。
- `client_session_id`: 客户端会话 ID（如 `"4380_1000001"`）。

**2. 案例：搜索过去 60 天的会议**
- **用户输入**：“帮我查一下过去 60 天的所有会议。”
- **工具调用 (Input)**：
  ```json
  {
    "query": "all meetings in the past 60 days",
    "company_id": 1000001,
    "client_session_id": "4380_1000001"
  }
  ```
- **工具输出 (Output)**：
  ```json
  {
    "result": [
      {
        "text": "Here are the meetings held in the past 60 days by your company, including each meeting's title, Meeting Id, and a direct meeting link...\n\n1. Meeting Title: Untitled Meeting Wed Jan 14 2026 20:44:33\n   Meeting Id: 5213\n   Link: https://.../detail/5213\n...",
        "type": "text"
      }
    ]
  }
  ```
- **AI 回复**：AI 会根据 `result` 中的 `text` 内容进行总结，并以友好自然语言回复用户，同时在界面上展示工具卡片。

**3. 工具结果展示 (Side Panel)**
- 当用户点击聊天记录中的工具卡片时，右侧会弹出 **Side Panel**。
- Side Panel 会完整展示上述 `Input` 和 `Output` 的 JSON 结构，方便用户查看原始数据和调试。

## 4. UI 设计
### 4.1 按钮位置
- 位于聊天输入框左侧的 `Attach File` (纸夹图标) 按钮右侧。
- 默认状态：**关闭态**。

### 4.2 按钮状态机
| 状态 | UI 表现 | 交互逻辑 | 触发动作 |
| :--- | :--- | :--- | :--- |
| **关闭态 (Disconnected)** | 基础图标，右上角无标识 | 点击后进入“加载态” | 触发后台 Custom MCP 注册 |
| **加载态 (Connecting)** | 图标右上角显示 Loading 动画 | 不可点击 | 等待 MCP Server 响应 |
| **连接态 (Connected)** | 图标右上角显示绿色 ✅ 标识 | 点击后进入“关闭态” | 触发断开连接逻辑 |

## 5. 技术实现细节

### 5.1 配置来源 (前端环境变量)
- Meeting MCP 仅由前端环境变量提供，**禁止硬编码**。
- 必填：
  - `NEXT_PUBLIC_MEETING_MCP_URL`
- 可选：
  - `NEXT_PUBLIC_MEETING_MCP_TYPE`（默认 `http`）
  - `NEXT_PUBLIC_MEETING_MCP_NAME`（默认 `FlashRev Meeting Agent`）
  - `NEXT_PUBLIC_MEETING_TOOL_NAME`（默认 `search_meeting`）
- 未配置时：按钮禁用并提示 `meetingAgent.missingConfig`。

### 5.2 连接与断开流程
- **连接流程**：
  1. 点击按钮 -> 调用 `POST /mcp/discover-custom-tools` 校验连通性与工具列表。
  2. 工具中包含 `search_meeting` 后 -> 调用 `POST /agents/{agent_id}/custom-mcp-tools` 写入配置。
  3. 成功后状态转为“连接态”；失败回退并提示。
- **断开流程**：
  - 调用 `DELETE /agents/{agent_id}/custom-mcp?url=...&type=...` 移除配置并回到“关闭态”。

### 5.3 异常处理 (多语言支持)
- **失败提示**：当连接失败时，弹出全局 Toast。
- **文案示例**：
    - 中文 (zh): `当前无法访问FlashRev系统中的会议记录，请稍后重试`
    - 英文 (en): `Unable to access meeting records in FlashRev , please try again later`

### 5.4 首页进入校验与自动清理
为了确保连接状态的准确性并解决配置冗余问题，系统在用户进入首页时会执行以下逻辑：
- **自动校验**：`MeetingAgentToggle` 组件挂载时，会检查 Agent 配置中是否已存在 Meeting Agent。
- **连接有效性检查**：如果存在配置，组件会主动调用 `/mcp/discover-custom-tools` 接口验证连接是否依然有效。
- **状态同步**：
    - 如果连接失效（如服务器不可达），系统会自动从 `custom_mcps` 中移除该配置，并将按钮状态恢复为“关闭态”。
    - 如果连接有效，按钮显示为“连接态”。

### 5.5 刷新与重复点击行为
- 连接/断开过程中刷新：本地“连接中”状态不会持久化，刷新后以服务端配置为准。
- 前端已限制重复点击（连接/断开过程不可再次触发）。

## 6. 关键组件与文件
- **前端输入框**：`apps/frontend/src/components/thread/chat-input/chat-input.tsx`
- **快速集成组件**：`apps/frontend/src/components/thread/chat-input/meeting-agent-toggle.tsx`


## 7. 验收标准
1. 按钮显示在正确位置。
2. 点击按钮后，右上角出现 Loading 标识。
3. 连接成功后，Loading 变为绿色勾选标识。
4. 连接失败时，标识消失并弹出正确的多语言 Toast。
5. 再次点击连接态按钮，连接断开，标识消失。
6. 调用 `search_meeting` 工具时，结果渲染正确且支持右侧面板展示。