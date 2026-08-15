# Circleica 部署验收 · 真实执行证据链（2026-08-16）

> 依据 `DEPLOY_ACCEPTANCE_CHECKLIST.md` 执行最终闭环。
> 本文记录**本环境真实可执行**的部分与**必须在部署环境执行**的部分，严格区分"代码就绪核验"与"运行期真实证据"。任何无真实执行证据的项一律不标 PASS（铁律）。

---

## 0. 执行环境真实情况（必须先说清）

| 项 | 本机（d:\Circleica，Windows 开发工作区） | 真实部署环境 |
|---|---|---|
| 角色 | 代码工作区，**非部署环境** | 远程 Linux 服务器 + Docker |
| Docker | **不存在**（`docker` 命令未找到） | 有（compose / Coolify） |
| R2 凭证 | **缺失**（.env 无 R2_*） | 服务器 .env 注入 |
| Sentry 凭证 | **缺失**（.env 无 SENTRY_*） | 服务器 .env 注入 |
| OTEL 端点 | **缺失**（.env 无 OTEL_*） | 服务器 .env 注入 |
| Redis 凭证 | **缺失**（.env 无 UPSTASH_*） | 服务器 .env 注入 |
| 访问入口 | 无生产域名 | Cloudflare 代理 → 服务器:3000 |

当前工作区 `.env` 仅含：`DATABASE_URL` / `NEXTAUTH_SECRET` / `CNGL_API_TOKEN`。
真实部署在远程 Docker 服务器执行 `deploy.sh`，凭证填在服务器 `.env`，TLS 由 Cloudflare 层终止。

**结论性约束**：C-1~C-5、C-7 的运行期真实验收，在本沙箱**物理不可执行**（无 Docker、无凭证、无生产域名）。以下对这几项只做"代码接线正确性核验"，并附**部署环境精确 runbook**；不标 PASS。

---

## C-6 · CI 门禁 —— 本机真实执行 ✅（核心门禁全过）

| 门禁 | 命令 | 真实结果 | 证据 |
|---|---|---|---|
| Prisma 生成 | `npx prisma generate` | 成功（v6.19.3） | EXIT 0 |
| 类型检查 | `npx tsc --noEmit` | **EXIT 0** | 修复 2 个真实错误后通过 |
| ESLint | `npm run lint` | 0 错误 / 97 警告（any 类，不破门禁） | EXIT 0 |
| 单元测试 | `npm run test`（jest） | **30 套件 / 325 测试全过** | EXIT 0 |
| 生产构建 | `npm run build` | 被本机 safe-delete shim 拦截 | 见下 |
| E2E | `npm run test:e2e`（Playwright） | 本机无 Docker，无法起 Postgres service | 归属 CI runner |

### C-6 真实发现与修复（重要）

`tsc --noEmit` 初始**真实失败**（EXIT 2，2 个错误）于 `src/__tests__/observability-preverify.test.ts`：
- 第 29 行 `realPrisma.$queryRaw.mockResolvedValue(...)` 类型不匹配（`$queryRaw` 是函数类型，无 `mockResolvedValue`）
- 第 38 行 `realPrisma.$queryRaw.mockRejectedValue(...)` 同上

`tsconfig.json` 的 `include` 含 `**/*.ts`，故测试文件纳入 CI 类型检查——**这 2 个错误会让 CI `quality` 门禁真实挂掉**。已修复（断言为 `jest.Mock`），重跑 `tsc --noEmit` → EXIT 0。此修复已落入工作区（未提交，按约定由你决定何时 commit）。

### build / e2e 说明（非代码缺陷）

- `npm run build` 在本沙箱被 **safe-delete 安全删除 shim** 拦截（`.next` 缓存清理触发 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`）。这是代理沙箱机制，**非代码缺陷**；CI 的 Linux runner 无此 shim，历史 pass4 已成功产出 `Compiled successfully`。build 门禁归属 CI runner 终验。
- E2E 走 `ci.yml` 的 `e2e` job（自带 Postgres service + Playwright），本机无 Docker 无法跑，归属 CI runner。

**C-6 判定**：代码质量门禁在本机真实全过（tsc/lint/jest/prisma）；build/e2e 由 CI runner 终验（历史绿）。**C-6 核心 PASS**；完整 CI runner 端到端触发需在部署/CI 环境完成。

---

## C-1 · 真实 R2 —— 本机不可执行 · 代码就绪 + 1 个真实代码缺口

**代码接线核验（读 `src/lib/storage.ts`）**：`R2StorageAdapter` 用 `S3Client` + `PutObjectCommand`（上传）+ `HeadBucketCommand`（连通探测），`R2_ENDPOINT`/`R2_BUCKET_NAME`/`R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` 全部从 `env.ts` 注入。接线正确。

**真实代码缺口（必须修复才能满足 C-1）**：全 `src` 搜不到任何 `getSignedUrl` / `presign` / `GetObjectCommand` / `createPresignedUrl`。当前只实现**公开上传**（`publicUrl`）。因此：
- "**私有资源签名 URL**" 子项：当前代码无对应实现。
- "**实测下载（私有对象）**" 子项：当前无私有对象下载/`GetObject` 路径（公开对象靠直链 HTTP 下载）。

**部署环境 runbook**（需先补 signed-url 代码）：
1. 服务器 `.env` 注入 `R2_*` 全套凭证。
2. 部署后执行实测脚本：`PUT` 一个测试对象 → `GET` 公开 URL 可下载 → `aws s3api get-bucket-acl` 确认 bucket `ACL=private`（非公开）→ 对私有对象 `getSignedUrl` 生成签名 URL 并 `curl` 下载成功（限时对、篡改即 403）。
3. 全部命中有真实入站/出站点才算 PASS。

---

## C-2 · Sentry —— 本机不可执行 · 代码就绪

**代码接线核验**：`src/instrumentation.ts` + `next.config.ts`(`withSentry` + `sourcemaps`) + `src/sentry.server.config.ts` / `sentry.edge.config.ts` + `src/app/api/sentry/tunnel/route.ts`。启用条件严格：`SENTRY_DSN && process.env.NODE_ENV === 'production'`；构建期 `SENTRY_AUTH_TOKEN` 上传 sourcemap；`tunnelRoute` 防广告拦截。

**部署环境 runbook**：
1. 服务器注入 `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` + `SENTRY_ORG` + `SENTRY_PROJECT`。
2. 生产构建部署 → 主动制造一次测试异常（如临时路由抛错）。
3. Sentry 后台确认事件入站、release 标记、sourcemap 定位到源码行。
4. 有真实入站事件才算 PASS。

---

## C-3 · OpenTelemetry —— 本机不可执行 · 代码就绪

**代码接线核验**：`src/instrumentation-otel.ts` + `src/lib/otel-node.ts` + `src/lib/telemetry.ts`。仅当 `OTEL_EXPORTER_OTLP_ENDPOINT` 配置时启用；缺省自动降级为"无监控"无操作，**不影响业务**。`src/lib/telemetry.ts` 暴露 `recordMetric` / `recordError` / `recordBusinessEvent` 供业务埋点。

**部署环境 runbook**：
1. 配置 `OTEL_EXPORTER_OTLP_ENDPOINT`（OTel Collector，或 `docker-compose.observability.yml` 的 Tempo/Jaeger 端点）+ `OTEL_EXPORTER_OTLP_HEADERS`。
2. 部署后触发核心业务（请求 / DB / 资源访问）。
3. Grafana / Tempo / 后端确认 trace 与 metric 真实入站（非仅代码配置）。
4. 后端确有数据才算 PASS。

---

## C-4 · HTTPS / TLS —— 本机不可执行 · 代码就绪 + 1 个真实偏差

**代码接线核验（读 `src/proxy.ts` + `next.config.ts`）**：`proxy.ts` 含严格 CSP、HSTS（**基于 `x-forwarded-proto === 'https'` 门控**，避免本地误发）、安全响应头、`__Secure-*` Cookie、`SameSite=strict`、CSRF 同源校验。`next.config.ts` 置 `trustProxy`。HTTP→HTTPS 重定向与 TLS 证书在 **Cloudflare / 反向代理层**终止（本 `docker-compose.yml` 仅暴露 `app:3000`，无内置 nginx）。

**真实偏差（需你定夺）**：`proxy.ts` 因 **Next 16 nonce 对齐 bug 曾导致白屏**，生产 CSP 当前实际用 **`'unsafe-inline'` 而非 nonce**（代码注释已证伪）。C-4 子项"**CSP nonce**"字面未满足。

**部署环境 runbook**：
1. 浏览器实际访问生产域名：确认 HTTP 自动 301→HTTPS、证书有效（锁标）、HSTS 生效。
2. 查看响应头 `content-security-policy` 与 `strict-transport-security`。
3. 若坚持要 nonce：需先解决 Next 16 nonce 对齐（当前为 unsafe-inline 兜底）。
4. 真实浏览器请求验证通过才算 PASS。

---

## C-5 · Redis —— 本机不可执行 · 代码就绪

**代码接线核验（读 `src/lib/redis.ts`）**：惰性代理 + 内存降级；连接失败/异常 → 降级为内存 Map，业务不崩；节流告警（每 60s 一次）；`getRedisClient()` 仅在 `UPSTASH_REDIS_REST_URL` 存在时建连。失败即降级，符合"错误处理/降级"要求。

**部署环境 runbook**：
1. 服务器注入 `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`（Upstash REST Redis）。
2. 部署后：`/api/health` 确认 `redis: ready`；写读一个 key 验证缓存路径命中；临时断网验证自动降级为内存且无 500。
3. 真实实例读写 + 降级均观测到才算 PASS。

---

## C-7 · 真实回滚演练 —— 本机不可执行 · 配置就绪

**配置核验（读 `docker-compose.yml`）**：`backup` 服务每日 `pg_dump`（保留 7 天）；`app.healthcheck` `start_period: 420s` 防迁移未完被误判 unhealthy 触发回滚；`migrate` 用 `prisma migrate deploy`；应用版本由构建期 `VERSION` 参数化。

**部署环境 runbook（严格 9 步）**：
1. 部署当前新版本（带 `VERSION` 标签）。
2. 验证应用正常（`/api/health`）。
3. 验证数据库正常（`migrate deploy` 成功 + 业务查询）。
4. 验证 R2 / Redis / 资源访问正常。
5. 记录当前版本 / 镜像标签 / 迁移状态。
6. 执行回滚：`docker compose down` + 部署**上一 `VERSION` 标签**（DB 如需回退用 `backup` 服务或向下迁移）。
7. 回滚后重验：应用启动 / DB 访问 / 登录核心业务 / 游戏资源 / R2 / Redis / health。
8. 确认回滚后系统仍正常。
9. 记录回滚结果。
10. 全程有真实操作日志与重验证据才算 PASS。

---

## audit_screenshots 引用核查（独立子任务，不影响 C 验收）

- 全 `.md` 文档（最终报告 / 验收清单 / 其他正式文档）搜索 `audit_screenshots`：**0 引用**。
- `tsconfig.json` 的 `exclude` 含 `audit_screenshots`（属配置引用，非证据引用）。
- 结论：892+ 张旧截图**无任何正式文档依赖**。

删除前提："最终报告已有新正式证据替代"——当前**未满足**（C-1~C-5/C-7 未在部署环境产生新真实证据，最终报告未重生成）；且你要求"不得影响 C 验收"。
**建议**：保留至部署环境 C 验收闭环、最终报告重生成后，再单独清理。当前不删除。

---

## 最终判定（2026-08-16）

**结论：CONDITIONAL GO**（铁律：C-1~C-7 全部有真实执行证据前不得改 GO）。

- **本机已真实闭环**：C-6 代码质量门禁（tsc/lint/jest/prisma 全过），并修复 1 个会让 CI typecheck 真实挂掉的类型错误。
- **待部署环境真实闭环（本沙箱物理不可执行）**：C-1（含代码缺口：无签名 URL/私有下载）、C-2、C-3、C-4（含偏差：生产 CSP 用 unsafe-inline 非 nonce）、C-5、C-7。
- 上述各项代码均已核验接线正确，附精确 runbook；在部署服务器或 CI runner 执行后即全部可 PASS。
- **两个真实代码缺口需先修**：① C-1 私有签名 URL / 私有下载未实现；② C-4 生产 CSP 非 nonce（unsafe-inline 兜底）。这两项是代码缺陷，不是环境缺失，须修复后才能满足对应子项。

不伪造 PASS。待部署环境按 runbook 执行并回传真实证据后，可重新生成最终报告并将结论改为 GO。
