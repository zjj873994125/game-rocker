# Docker 部署说明

本项目可以用 Docker Compose 启动前端和后端，数据库使用现有服务器 MySQL，不在 Compose 里创建或初始化。

当前推荐发布方式是：GitHub Actions 在 GitHub 上构建 Docker 镜像并推送到 GitHub Container Registry，服务器只拉取镜像运行，不在服务器上下载 npm/go 依赖和执行 Docker build。

## 服务组成

- `web`：Nginx 容器，托管 Vite 构建后的前端静态文件，并把 `/api` 反向代理到后端。
- `api`：Go Gin 后端容器，监听 `:8088`，连接 MySQL，提供登录注册和地图接口。

前端默认请求同域 `/api`，所以线上不需要单独写死 API 域名。

## 镜像发布

仓库提供 `.github/workflows/docker-publish.yml`。推送到 `feature_examples` 或 `master` 后，GitHub Actions 会构建并推送两个镜像：

```text
ghcr.io/zjj873994125/game-rocker-web:latest
ghcr.io/zjj873994125/game-rocker-api:latest
```

同时也会推送以提交 SHA 命名的镜像标签，方便后续需要固定版本回滚。

如果 GHCR 包默认是私有的，需要在 GitHub 仓库的 Packages 页面把这两个镜像改成公开，或者在服务器上先执行 `docker login ghcr.io`。

## 首次启动

先复制环境变量示例：

```bash
cp .env.docker.example .env
```

修改 `.env` 里的数据库连接和 `AUTH_TOKEN_SECRET`。生产环境不能使用示例值。

```env
WEB_IMAGE=ghcr.io/zjj873994125/game-rocker-web:latest
API_IMAGE=ghcr.io/zjj873994125/game-rocker-api:latest
DB_HOST=你的数据库地址
DB_PORT=3306
DB_NAME=zombie_game_db
DB_USER=你的数据库用户
DB_PASSWORD=你的数据库密码
AUTH_TOKEN_SECRET=换成很长的随机字符串
```

如果数据库就在宿主机本机，容器里的 `127.0.0.1` 指的是容器自己，不是宿主机。Linux 服务器可以优先填写服务器内网 IP；如果要访问宿主机网关，需要根据服务器 Docker 网络配置确认地址。

启动：

```bash
docker compose pull
docker compose up -d
```

如果本机项目路径包含中文或特殊字符，Docker Compose 可能无法自动生成项目名，可以显式指定：

```bash
docker compose -p zjj-zombie-game pull
docker compose -p zjj-zombie-game up -d
```

本机默认访问：

```text
http://127.0.0.1:8080
```

健康检查：

```bash
curl http://127.0.0.1:8080/api/health
```

返回 `{"status":"ok"}` 表示 Nginx 到后端的反代正常。

## 数据库说明

当前 Compose 不启动 MySQL，也不会执行 `server/migrations` 下的 SQL。后端启动时只根据 `.env` 里的 `DB_HOST`、`DB_NAME`、`DB_USER`、`DB_PASSWORD` 连接现有数据库。

如果后续新增表或字段，需要手动在服务器数据库上执行新的迁移 SQL。

## 常用命令

查看服务：

```bash
docker compose ps
```

如果启动时使用了 `-p zjj-zombie-game`，后续命令也保持同一个项目名，例如：

```bash
docker compose -p zjj-zombie-game ps
```

查看后端日志：

```bash
docker compose logs -f api
```

查看前端 Nginx 日志：

```bash
docker compose logs -f web
```

停止：

```bash
docker compose down
```

重新构建并启动：

```bash
docker compose pull
docker compose up -d
```

如果启动时使用了 `-p zjj-zombie-game`：

```bash
docker compose -p zjj-zombie-game pull
docker compose -p zjj-zombie-game up -d
```

## 服务器部署建议

服务器上可以直接让 `web` 容器暴露 `80`：

```env
WEB_PORT=80
```

如果服务器外层还有 Nginx 或宝塔面板，建议让 Docker 仍然暴露 `8080`，外层 Nginx 再反代到：

```text
http://127.0.0.1:8080
```

外层 Nginx 不需要再单独处理 `/api`，因为容器内的 `web` Nginx 已经把 `/api` 转给了 `api` 容器。

## 安全注意

- 不要提交 `.env`，只提交 `.env.docker.example`。
- 不要把 `server/configs/database.local.env` 打进镜像；根目录 `.dockerignore` 已经排除了它。
- `AUTH_TOKEN_SECRET` 必须使用生产随机值。
- 生产数据库密码不要继续使用示例值。
