# 20250116 - 线程命名模式兼容性实现

## 背景/目的
- 实现兼容的线程命名功能，支持两种命名模式：简单命名（使用prompt前20字符）和LLM命名（原有方式）
- 提供通过API参数控制命名策略的能力，默认使用简单快速的命名方式
- 保持向后兼容性，不影响现有功能

## 涉及文件
- `backend/core/agents/api.py` - 主要修改文件，添加命名逻辑和API参数

## 关键行为变化（Before/After）
- **Before**：所有新线程都使用"New Chat"作为初始名称，然后通过LLM后台任务更新为智能生成的名称
- **After**：
  - 默认模式（`use_simple_naming=true`）：直接使用prompt前20字符作为线程名称，超过20字符添加"..."
  - LLM模式（`use_simple_naming=false`）：保持原有行为，使用"New Chat"初始名称，LLM后台更新
  - 空prompt时返回"New Chat"

## 配置变更（如有）
- 新增API参数：`use_simple_naming`（可选，字符串类型，默认值"true"）
- 新增函数参数：`start_agent_run`函数增加`use_simple_naming: bool = True`参数

## 验证步骤
- 测试简单命名模式：
  ```bash
  POST /agent/start
  {
    "prompt": "Create a todo app",
    "use_simple_naming": "true"
  }
  ```
  预期结果：线程名称为"Create a todo app"

- 测试LLM命名模式：
  ```bash
  POST /agent/start
  {
    "prompt": "Create a todo app",
    "use_simple_naming": "false"
  }
  ```
  预期结果：线程名称初始为"New Chat"，后续由LLM更新

- 测试长prompt截取：
  ```bash
  POST /agent/start
  {
    "prompt": "This is a very long prompt that should be truncated because it exceeds 20 characters"
  }
  ```
  预期结果：线程名称为"This is a very long ..."

## 回滚方式
- 移除`create_thread_name_from_prompt`函数
- 恢复原有的线程创建逻辑，固定使用"New Chat"作为初始名称
- 移除`use_simple_naming`相关参数和逻辑
- 恢复无条件调用LLM线程命名任务

## 备注
- 简单命名模式避免了LLM API调用，提高了响应速度
- 保持了完全的向后兼容性，现有客户端无需修改
- 默认启用简单命名模式，提供更好的用户体验
- LLM命名模式仍然可用，适合需要更智能命名的场景
