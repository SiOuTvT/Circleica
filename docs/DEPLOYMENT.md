# 部署指南

## 目标拓扑

- 部署在带 Docker 的 Linux 服务器上，用 Docker Compose 编排。
- TLS 由 Cloudflare 反向代理终止，应用只跑 HTTP（容器内 3000）。代理层设置 `X-Forwarded-Proto`，应用据此发 HSTS。
- 真实资源（R2）、错误监控（Sentry）、遥测（OTel）、缓存（Redis）均在配置凭证后启用。

## 前置：环境变量

在服务器 `.env` 中至少准备好：

- `DATABASE_URL`（PostgreSQL）
- `NEXTAUTH_SECRET`、`NEXTAUTH_URL`
- `REDIS_URL` 或 Upstash 的 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME`（如需资源）
- `SENTRY_DSN` / `SENTRY_AUTH_TOKEN`（如需错误监控）
- `OTEL_EXPORTER_OTLP_ENDPOINT`（如需遥测）

> `docker-compose.yml` 中有若干占位默认值（如 `POSTGRES_PASSWORD: circleica`）。**部署时必须用真实值覆盖**，不要用占位弱口令。

## 防滥用（C-1）：应用层 + Cloudflare / WAF 层

游戏资源保持**公开读**（不强制登录、不验证码、不人机验证）。应用层已做匿名频控，但仍建议 Cloudflare / WAF 作为第一道规模化防线。

### 应用层（已实现）
- `src/proxy.ts` 对**未登录**请求做 IP 频控：页面 HTML 500/min/IP、公开 API GET 120/min/IP；登录用户 / Bearer 调用方豁免；搜索等已有 30/min 细粒度限制保留。
- 下载计数接口单 IP 60/min 硬限（纵深防御既有 60s 同分流去重）。
- **必须**：在 Cloudflare / 边缘代理开启 `TRUST_CF_CONNECTING_IP=1`（或正确 reset `x-forwarded-for`），否则 `getClientIP` 解析不出真实客户端 IP，频控退化为 fail-open（不拦截、也不误杀）。

### Cloudflare / WAF 层（部署配置，非代码）
- **速率限制规则（Rate Limiting Rules）**：对站点匿名流量设阈值（如 100 req / 10s / IP）；对 R2 公网资源域名（`*.r2.dev` 或自定义域名）设更严阈值，防批量刷下载；命中返回 429 / Challenge。
- **Bot Management / Super Bot Fight Mode**：放行 Googlebot / Bingbot 等已验证好 Bot；对疑似脚本化爬取启用托管质询（Managed Challenge），正常用户无感。
- **WAF 自定义规则**：异常 UA、缺失浏览器头、异常 Range / HEAD 高频、单 IP 短时大量不同资源请求 → 质询 / 拦截。
- **R2 公网域名保护**：R2 管理 API / 签名生成只走 Cloudflare / 服务端凭据，**绝不暴露** Access Key / Secret Key / Bucket 管理权限；公开资源仅经公网 URL 访问。
- **缓存注意**：公开列表 / 详情页可合理边缘缓存，但 CSP nonce 为每请求生成、应用已令全站 dynamic，响应不进 CDN 全页缓存，避免固定 nonce 被复用。

## 部署步骤

1. 把代码与 `.env` 放到服务器。
2. 执行 `./deploy.sh`（内部即 `docker compose build` + `up -d`，并做健康检查）。
3. 应用首次启动前执行数据库迁移：

   ```bash
   docker compose run --rm migrate
   ```

   `migrate` 服务跑的是 `prisma migrate deploy`。
4. 等待 `healthcheck` 通过（应用 `start_period` 约 7 分钟，防止误判）。

## 健康检查

`/api/health` 同时检查数据库与缓存；任一不通会返回非 200，编排器据此不把流量切到该实例。

## 备份

`backup` 服务每天对 PostgreSQL 做 `pg_dump`，保留 7 天。

## 回滚

回滚 = 用上一版本的镜像标签重新部署：

- 部署时记录当前 `VERSION` 镜像标签与迁移状态。
- 出问题执行真实回滚到上一版本，并重新验证：应用启动、数据库访问、登录 / 核心业务、游戏资源、R2、Redis、健康检查。
- 数据库结构回滚需配合对应迁移；若新迁移不可逆，先评估数据影响再操作。

## 最终验收

部署后需逐项实测（不能只靠代码配置判定）：

- C-1 R2：真实 PUT/GET、私有资源签名 URL、下载、bucket 非公开。
- C-2 Sentry：真实异常入站、release / sourcemap 定位。
- C-3 OTel：Collector 可达、trace / metric 实际收到。
- C-4 HTTPS/TLS：HTTP→HTTPS、证书、CSP、真实浏览器请求。
- C-5 Redis：真实连接、读写、缓存路径、降级。
- C-6 CI：在 runner 跑完整门禁（PostgreSQL、migrate deploy、tsc、eslint、Jest、build、Playwright）。
- C-7 回滚：真实回滚演练并复验。

逐项细节见 `docs/launch-audit/DEPLOY_ACCEPTANCE_CHECKLIST.md`。

## 已知产品决策（待定）

- **R2 公开 vs 私有 + 签名 URL**（C-1）。
- **CSP nonce vs unsafe-inline**（C-4）。
这两项目前按现状运行，确定后补充对应代码改造。
