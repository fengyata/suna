# Sales Agent Token API 文档

## 1. 减少Token额度

### API地址
```
POST /api/v2/sales/agent/reduce/token
```

### 请求方式
POST

### 请求头
```
Content-Type: application/json
```

### 入参说明

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| companyId | Long | 是 | 公司Id |
| messageId | String | 是 | 消息Id |
| userId | Long | 是 | 用户ID |
| featId | String | 是 | 功能ID |
| value | Long | 是 | 扣减的Token数量，必须大于0 |

### 请求示例
```json
{
  "companyId": 1000001,
  "userId": 1001,
  "featId": "feat001",
  "value": 100
}
```

### 出参说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | Integer | 响应状态码 |
| message | String | 响应消息 |
| data | Boolean | 扣减结果，成功返回true |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": true
}
```

### 可能返回的状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 3000001 | companyId为空 |
| 3000002 | userId为空 |
| 3000003 | featId为空 |
| 3000004 | value为空或value <= 0 |
| 3000005 | companyId不存在 |
| 3000006 | companyVipInfo为空 |
| 3000007 | 公司不是token credit |
| 800001 | 额度不足，请及时充值 (Insufficient credit, Please top up in time!) |
| 404 | 成本模型未找到 (Cost model not found) |

---

## 2. 获取Token信息

### API地址
```
GET /api/v2/sales/agent/get/token/{companyId}
```

### 请求方式
GET

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| companyId | Long | 是 | 公司ID |

### 请求示例
```
GET /api/v2/sales/agent/get/token/1000001
```

### 出参说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | Integer | 响应状态码 |
| message | String | 响应消息 |
| data | Object | Token信息对象 |

#### data对象字段说明

| 字段名 | 类型 | 说明 |
|--------|------|------|
| tokenTotal | Long | Token总数 |
| tokenUsed | Long | 已使用的Token数量 |

### 响应示例
```json
{
  "code": 200,
  "message": "success",
  "data": {
    "tokenTotal": 10000,
    "tokenUsed": 500
  }
}
```

### 可能返回的状态码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 3000005 | companyId不存在 |

---

## 注意事项

1. **reduceToken接口**：
   - value必须大于0

2. **getToken接口**：
   - 如果公司不存在，会抛出异常

