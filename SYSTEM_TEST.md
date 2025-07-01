# FimAI Chat 系统测试指南

## 🎯 测试目标

验证三级用户管理系统的完整功能，包括：
- 用户注册和登录
- 权限控制
- 聊天功能和数据库集成
- Token统计
- 邀请码和访问码系统

## 🚀 测试步骤

### 1. 系统状态检查

访问测试API检查系统状态：
```
GET http://localhost:3000/api/test-system?action=system-status
```

预期结果：
```json
{
  "database": "connected",
  "adminInviteCode": "fimai_ADMIN_MASTER_KEY",
  "timestamp": "2025-06-30T...",
  "features": {
    "userManagement": true,
    "inviteCodes": true,
    "accessCodes": true,
    "tokenTracking": true,
    "chatPermissions": true,
    "adminPanel": true
  }
}
```

### 2. 管理员注册测试

使用管理员邀请码注册第一个管理员：

**方法1: 通过网页**
1. 访问 http://localhost:3000/register
2. 填写表单：
   - 用户名: admin
   - 邮箱: admin@example.com (可选)
   - 邀请码: fimai_ADMIN_MASTER_KEY
3. 点击注册

**方法2: 通过API**
```bash
curl -X POST http://localhost:3000/api/test-system \
  -H "Content-Type: application/json" \
  -d '{
    "action": "register-admin",
    "username": "admin",
    "email": "admin@example.com"
  }'
```

### 3. 管理员登录测试

**方法1: 通过网页**
1. 访问 http://localhost:3000/login
2. 选择"用户登录"
3. 输入用户名: admin
4. 点击登录

**方法2: 通过API**
```bash
curl -X POST http://localhost:3000/api/test-system \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "username": "admin"
  }'
```

### 4. 管理员功能测试

登录后访问 http://localhost:3000/config，应该看到管理员控制面板：

- **仪表板**: 显示系统统计
- **用户管理**: 用户列表和状态管理
- **邀请码**: 创建和管理邀请码
- **系统设置**: 系统配置

### 5. 创建普通用户

1. 在管理员面板创建邀请码
2. 使用邀请码注册普通用户：
   - 访问 http://localhost:3000/register
   - 使用生成的邀请码注册

### 6. 普通用户功能测试

普通用户登录后：
- 访问 http://localhost:3000/config 看到用户配置面板
- 可以创建访问码和邀请码
- 查看Token使用统计

### 7. 访客用户测试

1. 普通用户创建访问码
2. 使用访问码登录：
   - 访问 http://localhost:3000/login
   - 选择"访客登录"
   - 输入用户名和访问码

### 8. 聊天功能测试

对于每种用户类型测试聊天功能：

1. **管理员/普通用户**:
   - 聊天记录保存到数据库
   - Token统计正确显示
   - 可以查看历史对话

2. **访客用户**:
   - 聊天记录仅本地存储
   - Token计入宿主用户
   - 权限受限于访问码设置

### 9. 权限控制测试

验证不同用户的权限：

- **管理员**: 可以访问所有功能
- **普通用户**: 可以聊天、创建访问码
- **访客**: 只能聊天，权限受限

### 10. Token统计测试

验证Token统计功能：
- 聊天后检查Token统计是否更新
- 访客的Token是否计入宿主用户
- 统计数据是否准确

## 🔍 预期结果

### 首页 (/)
- 未登录用户看到登录、聊天、管理三个图标
- 已登录用户自动重定向到聊天页面

### 登录页面 (/login)
- 支持用户登录和访问码登录
- 登录成功后重定向到聊天页面

### 注册页面 (/register)
- 支持邀请码注册
- 实时验证邀请码有效性

### 聊天页面 (/chat)
- 显示用户名和角色
- Token统计显示在右下角
- 根据用户类型决定是否保存聊天记录

### 配置页面 (/config)
- 管理员看到完整的管理面板
- 普通用户看到用户配置面板
- 访客用户被重定向

## 🐛 常见问题

### 1. 数据库连接问题
确保数据库文件存在且可访问：
```bash
npm run db:reset
npm run db:seed
```

### 2. API权限错误
检查用户是否正确登录和权限设置

### 3. Token统计不更新
检查API调用是否成功，查看开发者控制台

### 4. 聊天记录不保存
- 管理员/用户：检查数据库连接
- 访客：这是正常行为，仅本地存储

## 📊 成功标准

系统测试成功的标准：

1. ✅ 所有用户类型都能正确注册和登录
2. ✅ 权限控制按预期工作
3. ✅ 聊天功能正常，Token统计准确
4. ✅ 邀请码和访问码系统工作正常
5. ✅ 管理员面板功能完整
6. ✅ 用户配置面板功能正常
7. ✅ 数据库集成完整，localStorage功能已迁移

## 🎉 测试完成

如果所有测试都通过，说明FimAI Chat的三级用户管理系统已经成功实现！

您现在拥有一个功能完整的AI聊天应用，支持：
- 企业级用户管理
- 细粒度权限控制
- 完整的使用统计
- 灵活的访问控制
- 数据库持久化存储
