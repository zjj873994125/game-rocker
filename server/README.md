# zjj 关卡编辑器后端

这是当前项目的开发用 Go 后端，使用 Gin 提供接口，MySQL + GORM 保存地图和账号数据。

当前已经按后续标准后端架构预留了 `config`、`app`、`http`、`database`、`repository`、`service` 等目录。完整分层说明见 `../docs/后端架构说明.md`。

数据库配置示例见 `configs/database.example.env`，说明文档见 `../docs/数据库配置说明.md`。

启动时会自动读取 `configs/database.local.env`。这个文件用于本机真实数据库配置，已被 `.gitignore` 忽略；如果同名环境变量已经在 shell 中手动设置，shell 中的值优先。

## 运行

```bash
cd server
go run ./cmd/server
```

开发时需要热更新，可以安装并使用 Air：

```bash
go install github.com/air-verse/air@latest
cd server
air
```

项目已经提供 `.air.toml`，Air 会监听 `cmd`、`internal`、`configs`、`migrations` 下的后端代码变化，并自动重启服务。`data`、`tmp`、`.cache` 不会触发重启，避免保存地图或构建缓存导致反复重启。

默认监听：

```text
http://127.0.0.1:8088
```

可选环境变量：

```bash
ADDR=:8088
MAP_DATA_DIR=data
DB_ENABLED=false
AUTH_TOKEN_SECRET=change-me-in-production
AUTH_TOKEN_TTL=168h
```

## 接口

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/maps`
- `POST /api/maps`
- `GET /api/maps/{mapKey}`
- `PUT /api/maps/{mapKey}`
- `DELETE /api/maps/{mapKey}`
- `GET /api/maps/{mapKey}/versions`

## 前端访问

前端默认通过同域 `/api` 访问这些接口。开发环境由 Vite 代理到本地 `http://127.0.0.1:8088`；部署到服务器后，建议用 Nginx 或网关把同域 `/api` 反向代理到 Go 服务。

保存地图请求体：

```json
{
  "status": "draft",
  "remark": "first save",
  "config": {
    "id": "custom-graveyard-room",
    "name": "自定义墓地房间",
    "spawnPoint": [0, 0, 0],
    "requiredKills": 10,
    "colliders": [],
    "props": [],
    "doors": []
  }
}
```

## 存储

- `DB_ENABLED=true` 时使用 MySQL，地图写入 `maps`，历史版本写入 `map_versions`，用户写入 `users`。
- 登录注册和地图编辑权限依赖 MySQL，当前启动后端需要 `DB_ENABLED=true`。

版本会在每次保存时自动追加，方便后续做回滚。
