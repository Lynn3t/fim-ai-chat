# FimAI Chat

FimAI Chat 是一个基于 Next.js 的多模型 AI 聊天应用，支持多种 AI 服务商、用户权限管理以及数据库持久化。项目采用模块化设计，适合二次开发和部署。

## 功能特性
- 多提供商模型管理：支持多家 AI 服务商，模型可分组、排序并实时检查可用性
- 聊天体验：流式响应、Markdown 及 LaTeX 渲染、消息复制/删除/编辑、聊天历史记录
- 用户体系：管理员、注册用户与访客三种角色，支持访问码登录与令牌统计
- 配置中心：在前端页面管理 API 配置、模型参数及用户权限
- 数据持久化：使用 PostgreSQL 与 Prisma 保存会话、消息及系统设置
- UI/UX：支持深浅色主题，响应式布局，Tailwind CSS 与 Material UI 组件

## 快速开始
### 环境要求
- Node.js 18 或更高版本
- npm、yarn 或 pnpm

### 安装
1. 克隆仓库
```bash
git clone <repository-url>
cd fim-ai-chat
```

2. 安装依赖
```bash
npm install
# 或
yarn install
# 或
pnpm install
```

3. 初始化数据库
```bash
npm run db:generate
npm run db:migrate
```

4. 启动开发服务器
```bash
npm run dev
# 或
yarn dev
# 或
pnpm dev
```

访问 http://localhost:3000

## 项目结构
```
src/
├── app/            Next.js 页面与路由
│   ├── api/        API 路由
│   ├── chat/       聊天界面
│   ├── config/     配置页面
│   ├── login/      登录界面
│   └── …           其他页面
├── components/     通用组件
├── contexts/       React 上下文
├── lib/            工具函数与数据库操作
├── types/          TypeScript 类型
└── utils/          辅助方法

prisma/
├── schema.prisma   数据库模型
└── seed.ts         初始化脚本
```

## 常用脚本
- `npm run dev` 启动开发服务器
- `npm run build` 构建生产环境
- `npm run start` 启动生产服务器
- `npm run lint` 运行 ESLint
- `npm run db:generate` 生成 Prisma 客户端
- `npm run db:migrate` 执行数据库迁移
- `npm run db:seed` 初始化数据
- `npm run db:studio` 打开 Prisma Studio
- `npm run db:reset` 重置数据库

## 配置
### 环境变量
在项目根目录创建 `.env.local`：

```env
DATABASE_URL="postgresql://user:password@localhost:5432/fimai?schema=public"
```

### AI 服务商配置
1. 登录应用后访问 `/config`
2. 添加服务商及其 API Key
3. 配置可用模型
4. 设置用户权限和令牌限制

## 技术栈
- Next.js 15 + React 19
- Prisma ORM 与 PostgreSQL
- Tailwind CSS 与 Material UI
- @lobehub/ui、@dnd-kit 等前端库
- react-markdown 与 KaTeX

## 许可证
本项目基于 [MIT License](LICENSE) 开源。

## 贡献与支持
欢迎提交 Pull Request。如有问题请在 GitHub Issues 中反馈。

