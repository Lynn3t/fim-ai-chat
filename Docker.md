# Docker 配置与自动 Seed 指南

本文档说明如何在 Docker 环境中配置和使用数据库自动 seed 功能。

## 自动 Seed 功能

项目支持在 Docker 容器启动时自动执行数据库 seed 操作。这个功能通过环境变量 `AUTO_SEED` 控制。

### 启用自动 Seed

要启用自动 seed，在 `docker-compose.yml` 中设置环境变量：

```yaml
environment:
  - AUTO_SEED=true
```

当 `AUTO_SEED` 设置为 `true` 时，容器启动时会自动执行以下操作：
1. 数据库迁移部署 (`npx prisma migrate deploy`)
2. 执行 seed 脚本 (`npm run db:seed`)

### 禁用自动 Seed

如果不想在每次启动时都执行 seed，可以：
1. 移除 `AUTO_SEED` 环境变量
2. 将其设置为其他值（如 `false`）

在这种情况下，只会执行数据库迁移部署，不会执行 seed 操作。

## 手动执行 Seed

你也可以在容器运行时手动执行 seed：

```bash
# 进入运行中的容器
docker exec -it fim-ai-chat-web-1 sh

# 执行 seed 命令
npm run db:seed
```

## Seed 脚本详情

Seed 脚本位于 [`prisma/seed.ts`](file:///d:/Users/Fimall/Documents/Codes/fim-ai-chat/prisma/seed.ts)，它会创建：
- 默认的 AI 提供商（OpenAI、Anthropic）
- 常用的 AI 模型
- 示例用户和相关配置

## 注意事项

1. Seed 操作是幂等的，重复执行不会创建重复数据
2. 生产环境中建议谨慎使用自动 seed，避免意外修改数据
3. 可以根据需要自定义 seed 脚本来满足特定需求
