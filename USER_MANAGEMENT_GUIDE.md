# FimAI Chat 三级用户管理系统

## 🎯 系统概述

FimAI Chat 实现了完整的三级用户管理系统，支持管理员、普通用户和访客三种角色，具备邀请码和访问码机制、Token统计、权限控制等功能。

## 👥 用户角色

### 1. 管理员 (ADMIN)
- **权限最大**
- **注册方式**: 使用硬编码邀请码 `fimai_ADMIN_MASTER_KEY`（仅一次使用）
- **功能权限**:
  - 进入管理员控制面板
  - 正常聊天，内容上传数据库
  - 分发邀请码给用户注册
  - 管理所有用户（封禁、权限设置等）
  - 查看系统统计和Token使用情况
  - 配置模型分发策略

### 2. 普通用户 (USER)
- **权限第二**
- **注册方式**: 通过管理员分发的邀请码注册
- **功能权限**:
  - 使用分发的模型正常聊天
  - 聊天内容上传数据库
  - Token使用量被统计和限制
  - 分发访问码给访客使用
  - 查看自己和访客的Token使用情况
  - 管理自己创建的访问码

### 3. 访客 (GUEST)
- **权限最低**
- **注册方式**: 通过用户分发的访问码登录
- **功能权限**:
  - 使用用户划定的模型聊天
  - 聊天内容**不**上传数据库（仅本地存储）
  - Token使用量计入宿主用户
  - 无法创建邀请码或访问码

## 🔑 邀请码和访问码系统

### 邀请码格式
- 格式: `fimai_XXXXXXXXXXXXXXXX`
- 管理员邀请码: `fimai_ADMIN_MASTER_KEY`（硬编码，仅一次使用）
- 普通邀请码: 随机生成，如 `fimai_A1B2C3D4E5F6G7H8`

### 访问码格式
- 格式: `fimai_XXXXXXXXXXXXXXXX`
- 随机生成，如 `fimai_X9Y8Z7W6V5U4T3S2`
- 可设置过期时间和使用次数限制
- 可指定允许使用的模型列表

## 📊 Token统计系统

### 统计方式
1. **API提供Token数据**: 直接使用 `usage.total_tokens`
2. **API无Token数据**: 计算输入输出总字/词数作为Token估算
3. **访客Token**: 计入宿主用户的使用量

### 统计内容
- 输入Token数 (`prompt_tokens`)
- 输出Token数 (`completion_tokens`)
- 总Token数 (`total_tokens`)
- 成本计算（基于模型定价）
- 使用时间和频率

## 🛠️ API端点

### 认证相关
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/permissions` - 权限检查

### 邀请码和访问码
- `GET /api/codes/invite` - 验证/获取邀请码
- `POST /api/codes/invite` - 创建邀请码
- `GET /api/codes/access` - 验证/获取访问码
- `POST /api/codes/access` - 创建访问码
- `PATCH /api/codes/access` - 启用/禁用访问码

### 用户管理
- `GET /api/user/dashboard` - 用户仪表板
- `POST /api/user/codes` - 创建邀请码/访问码
- `DELETE /api/user/codes` - 删除邀请码/访问码

### 管理员功能
- `GET /api/admin/dashboard` - 管理员仪表板
- `GET /api/admin/users` - 用户列表管理
- `PATCH /api/admin/users` - 用户状态管理
- `GET /api/admin/stats` - 系统统计

### Token统计
- `GET /api/token-usage` - 获取Token使用统计
- `POST /api/token-usage` - 记录Token使用
- `GET /api/admin/stats` - 管理员统计视图

### 聊天权限
- `GET /api/chat/permissions` - 聊天权限检查
- `POST /api/messages` - 创建消息（支持权限控制）

## 🚀 快速开始

### 1. 注册管理员
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "inviteCode": "fimai_ADMIN_MASTER_KEY"
  }'
```

### 2. 管理员创建邀请码
```bash
curl -X POST http://localhost:3000/api/codes/invite \
  -H "Content-Type: application/json" \
  -d '{
    "createdBy": "管理员用户ID",
    "maxUses": 1,
    "expiresAt": "2024-12-31T23:59:59Z"
  }'
```

### 3. 用户注册
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "user1",
    "email": "user1@example.com",
    "inviteCode": "生成的邀请码"
  }'
```

### 4. 用户创建访问码
```bash
curl -X POST http://localhost:3000/api/user/codes \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "用户ID",
    "type": "access",
    "allowedModelIds": "model1,model2",
    "maxUses": 10
  }'
```

### 5. 访客注册
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "guest1",
    "accessCode": "生成的访问码"
  }'
```

## 🔒 权限控制

### 聊天权限检查
- 用户是否激活
- 模型使用权限
- Token使用限制
- 访客宿主状态

### 存储控制
- **管理员/用户**: 聊天内容存储到数据库
- **访客**: 聊天内容仅本地存储，Token计入宿主用户

### 功能权限
- **创建邀请码**: 管理员 + 用户
- **创建访问码**: 管理员 + 有权限的用户
- **管理面板**: 仅管理员
- **用户管理**: 仅管理员

## 📈 监控和统计

### 用户统计
- 总用户数、活跃用户数
- 各角色用户分布
- 注册趋势

### Token统计
- 总使用量、今日使用量
- 用户使用排行榜
- 模型使用统计
- 成本分析

### 邀请码/访问码统计
- 创建数量、使用情况
- 过期和活跃状态
- 使用频率分析

## 🛡️ 安全特性

1. **邀请码机制**: 防止恶意注册
2. **访问码限制**: 控制访客使用范围
3. **Token限制**: 防止滥用
4. **权限分级**: 最小权限原则
5. **审计日志**: 完整的使用记录
6. **用户封禁**: 管理员可封禁违规用户

## 🔧 配置说明

### 环境变量
```env
DATABASE_URL="file:./dev.db"
```

### 数据库命令
```bash
# 生成客户端
npm run db:generate

# 创建迁移
npm run db:migrate

# 运行种子
npm run db:seed

# 查看数据库
npm run db:studio

# 重置数据库
npm run db:reset
```

## 📝 注意事项

1. **管理员邀请码**: `fimai_ADMIN_MASTER_KEY` 仅能使用一次
2. **访客存储**: 访客聊天记录不存储到数据库，需要前端本地存储
3. **Token计费**: 访客的Token使用量会计入宿主用户
4. **权限继承**: 访客的权限受宿主用户限制
5. **数据安全**: 敏感信息需要加密存储

这个系统为您的AI聊天应用提供了完整的用户管理、权限控制和使用统计功能！
