# 架构说明（Fangame）

> 面向：新成员、架构评审、部署负责人。读完后你应能回答"一个请求从进来到出响应经过了哪几层"。

## 一句话架构

Next.js 16 App Router 全栈应用，采用 **Route → Service → Repository** 三层：

```
HTTP 请求
  → app/api/**/route.ts        (Route 层：仅解析请求 + 调用 Service + 返回)
      ↓ withHandler() 统一包装
  → services/**.ts              (Service 层：业务规则、输入校验、权限、抛 AppError)
      ↓ 读/写数据
  → repositories/**.ts          (Repository 层：纯 Prisma，无业务逻辑)
      ↓
  → PostgreSQL（Prisma 6 ORM）
```

**铁律**：Route 不直接写 Prisma；Service 不直接返回裸 `try/catch`；所有异常统一由 `withHandler` 转成标准响应。

## 关键模块（`src/lib/`）

| 模块 | 职责 | 约定 |
|---|---|---|
| `api-handler.ts` | 统一响应格式 + 异常处理 | `withHandler()` 包装每个路由；`json()/created()/paginated()/noContent()` 返回成功；`parseBody()`/`parseSearchParams()` 用 Zod 解析 |
| `errors.ts` | `AppError` 及其子类（`NotFoundError`/`ValidationError`/`ForbiddenError`/`RateLimitError` 等） | Service 抛子类，handler 自动映射 HTTP 状态 |
| `auth.ts` + `auth-context.ts` | NextAuth v5 配置 + 路由鉴权上下文 | `requireAuth()` / `requireAdminRole()` 在 **Service 层** 调用，并**从 DB 重新读取最新角色**（时效角色变更即时生效） |
| `env.ts` | 环境变量懒校验（Zod） | `getEnv()` 首次访问时校验；build 阶段容忍缺失；prod 缺失直接 `process.exit(1)` |
| `config.ts` | 全局业务常量（缓存 TTL、分页、限制） | 业务阈值集中此处，勿散落 |
| `prisma.ts` | Prisma 客户端单例 | 全项目统一引用，避免多实例 |
| `storage.ts` | 统一存储适配器（Local / Cloudflare R2） | 用 `getStorage()`，勿直接调 R2/本地；旧 `r2.ts` 已 `@deprecated` |
| `redis.ts` | 缓存（Upstash Redis，可选，无则降级内存） | `getFeatures().redis` 检测能力 |
| `rate-limit.ts` | 速率限制 | 写类接口应统一接入 |
| `vndb.ts` | VNDB（视觉小说数据库）客户端 | 元数据拉取与缓存 |
| `site-settings.ts` | 站点配置服务（三层缓存） | — |
| `logger.ts` | 结构化日志（dev 彩色 / prod JSON） | **禁止 `console.log`**，统一用 `logger` |

## 数据模型（Prisma）

核心实体（共约 38 个 model / enum）：`User`、`Account`、`Session`、`Game`、`Tag`/`TagGroup`/`GameTag`、`Comment`、`GameResource`/`GameResourceEntry`、`Favorite`、`Collection`、`PlayStatus`、`GameRating`、`Creator`/`GameCreator`、`Music`/`Playlist`、`ForumPost`/`ForumComment`/`*Like`、`Notification`、`Announcement`、`EmotionalMessage`、`CheckIn`、`AuditLog`、`Achievement`/`UserAchievement`、`AvatarFrame`、`SiteSetting`、`CuratedCollection`/`CuratedCollectionGame`、`*Report`、`PasswordResetToken`/`EmailVerificationToken`。

> 完整字段与关系以 `prisma/schema.prisma` 为准。修改数据模型必须走 Prisma Migration，并提交迁移文件。

## 认证模型

- 基于 NextAuth v5，Credentials + JWT。
- 角色分三级：`USER` / `ADMIN` / `SUPER_ADMIN`（见 `UserRole` enum）。
- **权限边界在 Service 层强制**：即便中间件放行，Service 内的 `requireAdminRole("SUPER_ADMIN")` 仍是真实防线。新增管理接口时务必显式调用守卫。

## 存储与媒体

- 通过 `src/lib/storage.ts` 统一抽象，底层 Local 或 R2。
- 富文本（TipTap）经 DOMPurify 净化，禁用 `style` / `data:` 脚本执行。
- `next.config.ts` 的 `images.remotePatterns` 已白名单 R2 / UploadThing / VNDB / localhost(dev)。新增外部图源需在此追加。

## 构建与部署

- `next.config.ts` 设 `output: "standalone"`，便于容器化。
- 生产编排见 `docker-compose.yml`：
  - `db`（PostgreSQL 16）+ 健康检查
  - `migrate`（独立运行，`docker compose run --rm migrate` 执行迁移，**不随 app 启动**）
  - `app`（standalone 镜像，`/api/health` 健康检查）
  - `backup`（每日 03:00 `pg_dump` 压缩，保留 7 天）
- 反向代理（nginx / Traefik / Coolify）后：容器收到的是 `http`，**HSTS 与"安全"判定必须依赖 `x-forwarded-proto` 请求头**，而非容器内协议。部署后请验证响应头含 `Strict-Transport-Security`。
- 首次访问 `/setup` 完成站点初始化（创建首位 SUPER_ADMIN）。

## 上线前必读（自查清单）

以下项已在代码层确认或需专项复核，生产部署前请逐一过关：

1. **环境变量**：`DATABASE_URL` 与 `NEXTAUTH_SECRET`(≥32 字符) 必填；R2 / Redis / Sentry / 邮件为可选。生产务必通过密钥/env 注入，**勿把密钥写死**。
2. **错误处理**：`withHandler` 仅映射 `AppError` 与 `ZodError`；Prisma 预期内异常（唯一键冲突 `P2002`、外键 `P2003`、记录不存在 `P2025`）当前会落入 500——接入映射可让前端友好提示并暴露真实故障。
3. **速率限制**：确认写类接口（发帖、评论、收藏、签到等）是否需统一限流。
4. **代理安全头**：核对 `next.config.ts` 的 `headers()` 与 `trustProxy`，避免 HSTS 缺失 / SSL 剥离面。
5. **Docker 口令**：`docker-compose.yml` 中 `POSTGRES_PASSWORD` 等当前为弱口令占位，**仅限本地**；任何非纯本地部署须改为密钥/env 注入。
6. **CSP**：`middleware.ts` 的 `connect-src` 需覆盖实际上传域名（如 UploadThing `utfs.io`）。

> 本文件为**解释性文档（explanation）**，只讲"为什么这样设计"。具体"怎么跑起来"见 [入门指南](GETTING_STARTED.md)，"每个接口怎么调"见 [API 参考](API_REFERENCE.md)。
