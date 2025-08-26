# 在 Linux 环境中使用 Docker 部署 fim-ai-chat

本文档介绍如何在 Linux 主机上使用 Docker 和 Docker Compose 运行 fim-ai-chat 服务器。

## 前置条件

- 已安装 [Docker](https://docs.docker.com/get-docker/)（推荐 20+ 版本）
- 已安装 [Docker Compose](https://docs.docker.com/compose/install/)（v2 及以上）
- 服务器开放 3000 端口供外部访问

## 准备工作

1. **设置环境变量**：在项目根目录创建 `.env` 文件，提供 PostgreSQL 连接字符串，例如：

    ```bash
    DATABASE_URL="postgresql://postgres:postgres@db:5432/fimai?schema=public"
    ```

2. **创建生产用的 `Dockerfile`**（示例）：

    ```Dockerfile
    # 使用精简的 Node.js 运行时镜像
    FROM node:20-alpine

    # 设置工作目录
    WORKDIR /app

    # 仅复制依赖声明以利用 Docker 缓存
    COPY package*.json ./

    # 安装生产依赖
    RUN npm ci --omit=dev

    # 复制项目源码
    COPY . .

    # 构建 Next.js 应用
    RUN npm run build

    # 暴露应用端口
    EXPOSE 3000

    # 启动服务
    CMD ["npm", "start"]
    ```

3. **（可选）创建 `docker-compose.yml`** 以同时运行 PostgreSQL 数据库：

    ```yaml
    version: "3.9"
    services:
      web:
        build: .
        ports:
          - "3000:3000"
        env_file: .env
        depends_on:
          - db
      db:
        image: postgres:15-alpine
        restart: unless-stopped
        environment:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: fimai
        volumes:
          - postgres_data:/var/lib/postgresql/data
    volumes:
      postgres_data:
    ```

## 运行步骤

1. **构建镜像**：

    ```bash
    docker compose build
    ```

2. **启动服务**：

    ```bash
    docker compose up -d
    ```

3. **数据库迁移**（首次运行时执行）：

    ```bash
    docker compose exec web npm run db:migrate
    docker compose exec web npm run db:seed # 如需种子数据
    ```

4. 浏览器访问 `http://<服务器 IP>:3000` 即可访问 fim-ai-chat。

## 常用维护命令

```bash
# 查看日志
docker compose logs -f web

# 停止并删除容器
docker compose down

# 仅重启应用服务
docker compose restart web
```

如需自定义配置（如端口、环境变量等），请在 `docker-compose.yml` 中调整相应内容。
