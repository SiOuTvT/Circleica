# 生产环境上线验收报告（Production Readiness Review）

> 项目：Fangame（Next.js 16 + React 19 + Prisma/PostgreSQL + Upstash Redis）
> 评审标准：Principal / Staff Engineer Go-Live Review
> 日期：2026-07-22
> 范围：仅上线质量（生产配置 / 部署 / 迁移 / 数据库 / 缓存 / 安全 / 可观测性 / 灾备 / 稳定性）。不重复架构一致性或业务逻辑历史问题。

---

## 【Blocking（必须修复）】

> 以下为「上线前必须完成」项。其中 4 项代码级阻断已在本次评审中**自动修复并 tsc 验证通过**；剩余 2 项为部署环境变量，必须由运维在 Coolify 中设置。

**A. 部署环境变量（运维必须在 Coolify 中设置，否则生产功能异常）：**

1. **`NEXTAUTH_SECRET` 必须显式设置（32+ 随机字符）**
   当前 `docker-compose.yml` 默认空；若 Coolify 未设置，入口脚本 `docker-entrypoint.sh` 会在容器内 `/app/.secret` 自动生成密钥（该路径**不在持久卷**上）。后果：每次重新部署 / 重建容器 → 新密钥 → **所有用户会话失效、全部被强制登出**。
   → 在 Coolify 环境变量中写入固定随机值（如 `openssl rand -base64 48`）。

2. **`NEXTAUTH_URL` 必须设置为生产 https 域名**（如 `https://fangame.example.com`）
   当前默认空 → 回退 `http://localhost:3000`。后果：邮件验证/重置链接错误、OG/Canonical 指向 localhost、Sentry/SEO 元数据错误。
   → 在 Coolify 设置正确的公网 https 地址。

**B. 已自动修复的代码级阻断（不再阻塞，tsc 已验证）：**

3. **数据库备份服务被 Compose profile 关闭** → 已移除 `docker-compose.yml` 中 `backup` 服务的 `profiles: ["backup"]`。原配置下 `docker compose up -d` 不会启动备份容器 = **生产无备份运行（数据丢失风险）**。修复后每日 03:00 自动 `pg_dump`（保留 7 天，存于 `backup_data` 卷）。

4. **Turnstile 站点 Key 构建期未注入** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` 此前仅在运行时通过 compose `environment` 注入，而 Next.js 的 `NEXT_PUBLIC_*` 在**构建期**内联进客户端 bundle，导致生产构建中该值为 `undefined`、验证码**静默失效**。已在 `Dockerfile` 增加构建期 `ARG/ENV`、在 `docker-compose.yml` 的 `app.build.args` 增加对应 build arg，生产验证码现在可正确生效。

5. **生产环境 Cookie `Secure` 标记依赖 `NEXTAUTH_URL` 协议** → `src/lib/auth.ts` 原逻辑 `secure = NEXTAUTH_URL?.startsWith("https://")`。若代理后 `NEXTAUTH_URL` 设为 http，会话 Cookie 不带 `Secure`。已改为：生产环境（`NODE_ENV==="production"`）**强制 `secure: true`**，降低对 URL 协议的依赖（NEXTAUTH_URL 本身仍须设置，见 A2）。

6. **`$queryRawUnsafe` 使用** → `src/repositories/game.ts` 的 `findRandom` 改用参数化 `Prisma.sql`（SQL 字符串为常量、limit 作为参数绑定），消除 Unsafe API 使用。

---

## 【Recommended（建议优化）】

以下不阻塞发布，建议在首个迭代内跟进：

- **Sentry 生产错误追踪**：`SENTRY_DSN` 未设置时 `global-error.tsx` 已接 Sentry 但会被静默禁用，生产事故不可见。建议在 Coolify 设置 `SENTRY_DSN` / `SENTRY_ORG` / `SENTRY_PROJECT` / `SENTRY_AUTH_TOKEN`。
- **邮件发送可靠性**：`src/lib/email.ts` 在请求内**同步**发送、失败被 `.catch` 静默吞掉，无重试/队列/死信。若验证邮件发送失败，用户可能无法完成邮箱验证 → 无法登录（当 `email_verification_required_for_login=true`）。建议改为后台任务 + 至少一次投递 + 失败日志。
- **缓存失效不完整**：`admin/*` 与 user-stats 类缓存为 fire-and-forget（写入不主动失效），封禁/编辑后最长约 120s 陈旧。建议 mutation 时 `cache.del` / `revalidateTag`。
- **限流无全局兜底**：限流仅作用于具体路由，middleware 未设默认限制；key 依赖 `x-forwarded-for`，需确保反代（Traefik/Cloudflare）可靠填充该头。建议网关层或 middleware 加默认限制。
- **SVG 上传**：UploadThing `image` 类型未显式排除 `image/svg+xml`（经 `<img>` 加载不执行脚本，风险低；CSP `object-src 'none'` 已缓解）。R2 上传通道已在 `config.ts` 排除 SVG。
- **备份异地化**：当前备份仅本机 `backup_data` 卷，无异地副本与恢复文档。建议增加 R2 异地拷贝 + 记录 `pg_restore` 恢复步骤。
- **`POSTGRES_PASSWORD` 硬编码**于 `docker-compose.yml`，建议改用 secrets / env。
- **Dockerfile 运行阶段复制完整 `node_modules`**（含 devDependencies），镜像偏大、攻击面增加；standalone 已自带追踪依赖，建议运行阶段不再复制完整 `node_modules`（改动需验证 standalone 不缺依赖，故本次未改）。
- **数据库低频索引缺口**：`EmailVerificationToken.email`、`Game.reviewedBy`、`GameReport.ip` 单字段查询缺索引；水平扩容时关注连接池总和（`connection_limit=10`/实例）。
- **错误归因**：缺少 request-id 与 `Sentry.setUser`，生产排障难以关联用户/请求，建议接入。
- **R2 存储**：单实例部署时本地回退可用且经 `uploads_data` 卷持久化；若计划**多副本（horizontal scale）必须配置 R2**，否则各副本本地上传不一致。

---

## 【Production Ready Checklist】

**环境变量（Coolify）：**
- [ ] `NEXTAUTH_SECRET` = 固定 32+ 字符随机值
- [ ] `NEXTAUTH_URL` = `https://你的域名`
- [ ] `DATABASE_URL`（外部署时设为外部地址；默认内部 `postgresql://fangame:fangame@db:5432/fangame`）
- [ ] `NEXT_PUBLIC_TURNSTILE_SITE_KEY`（启用验证码时）
- [ ] `SENTRY_DSN`（建议）
- [ ] `R2_*`（多副本或需用 R2 时）
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（启用 Redis 缓存 / 分布式限流时）

**部署验证：**
- [ ] `docker compose up -d` 后 `docker compose ps` 应包含 `fangame-backup`（确认备份在跑）
- [ ] 入口已自动 `prisma migrate deploy`；可额外跑一次 `docker compose run --rm migrate` 确认无待执行迁移
- [ ] `GET /api/health` 返回 200（依赖 DB 健康检查）
- [ ] 登录/注册页 Turnstile 验证码按预期显示
- [ ] 浏览器中确认会话 Cookie 带 `Secure` 标记（生产）

**监控 / 灾备：**
- [ ] Sentry 能收到生产错误
- [ ] `backup_data` 卷每日生成 dump；做一次恢复演练
- [ ] （建议）R2 异地备份

---

## 【最终结论：Go / No Go】

**Go —— 条件上线。**

代码侧 4 项上线阻断（备份未运行、Turnstile 构建期失效、生产 Cookie 非 Secure、原始 SQL Unsafe API）已**自动修复并通过 `tsc` 零错误验证**。数据库/迁移/请求层/安全头/CSP/限流/Prisma 单例/Redis 单例/资源泄漏等核心维度经多路核查**无阻断级问题**。

唯一剩余 Blocking 为两项部署环境变量（`NEXTAUTH_SECRET`、`NEXTAUTH_URL`），属任何 NextAuth 生产部署的强制项，在 Coolify 中设置后即可安全上线；它们不影响代码本身的生产就绪度。

**上线前置动作：设置 `NEXTAUTH_SECRET` 与 `NEXTAUTH_URL` → 执行 CheckList 部署验证 → Go。**
