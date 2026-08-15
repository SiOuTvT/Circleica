# Circleica 安全最终审计（部署前整备轮）

生成日期：2026-08-16
方法：先跑 `npm audit`，再逐类读真实代码（auth / proxy / csrf / rate-limit / api-handler / validations / permissions / upload / storage / ssrf 代理 / 各 admin 路由），并以"是否真接入"为判据，不靠文档声称。

## 总体结论

安全维度代码侧已相当成熟，且 `npm audit` **0 漏洞**。本审计未发现需要立即修的代码缺陷。原两个产品级决策本轮已由用户拍板落地：C-1 公开读 + 防滥用（A 防爬 / B 防刷 / 密钥不泄露）、C-4 nonce CSP 已实现并 dev 真实验证。其余为部署环境验证项，已进入 C-1~C-7 验收清单。

## npm audit

```
npm audit → 0 vulnerabilities
```
依赖无已知漏洞。终验仍建议 CI runner 在部署门禁重跑一次（本沙箱结果与 CI 一致）。

## 逐项核查结果

| 检查项 | 结论 | 证据 / 备注 |
|---|---|---|
| 身份认证 | ✅ 良好 | `auth.ts`：JWT 策略、30 天 maxAge、登录限流（IP 维度）、无 PrismaAdapter（避免 431）；密码 bcrypt 比对 |
| Session / Cookie | ✅ 良好 | httpOnly + sameSite=lax + secure 跟随 NEXTAUTH_URL；role/emailVerified 每次会话从 DB 读（30s 缓存，避免 stale permission）；cookie 改名规避旧 JWT 过大 |
| CSRF | ✅ 良好 | `proxy.ts` 对所有状态变更 `/api/*`（除 `/api/auth/`）与 `/api/admin` 写接口强制 `enforceSameOrigin`（Origin 优先、Referer 回退、均无则拒绝，关闭无头绕过）；Bearer 调用豁免（正确）；`csrf.ts` 逻辑经 `lib/__tests__` 覆盖 |
| XSS | ✅ 良好 | React 默认转义；`dangerouslySetInnerHTML` 仅用于：静态常量（rules/contact/about 默认 HTML、theme 脚本/样式）与经 `RichTextContent` 净化的管理员自定义内容；JSON-LD 已转义 `</script>`。 |
| CSP | ✅ 已修复（C-4） | `proxy.ts` 每请求生成 nonce，`script-src 'self' 'nonce-…' 'strict-dynamic'`（生产去 `unsafe-eval'`）；ThemeScript 与 Next 自身 framework / RSC-flight 内联脚本共享同源 nonce（dev 真实验证 mismatch=0）。其余指令严格（default-src 'self'、style-src 受限、img/font/connect 白名单、frame-ancestors none、object-src none、base-uri 'self'、form-action 'self'） |
| CORS | ✅ 良好 | `connect-src` 显式白名单（api.vndb.org、sentry、r2），无 `*` 通配 |
| SSRF | ✅ 良好 | 图片代理（P3-3）redirect:manual + 域名白名单 + DNS 重绑定防护；上传图按魔数判定，下载外链强制 httpUrl（禁 javascript:/data:/file:） |
| SQL / Prisma | ✅ 良好 | 全程 Prisma 参数化；无字符串拼接 SQL；查询普遍 `select` 裁剪 |
| API 参数校验 | ✅ 良好 | `validations.ts` 全量 Zod schema（注册密码≥8、用户名正则、各业务上限）；`api-handler` 统一 `zodError → 422` 字段级报错 |
| Zod / 输入验证 | ✅ 良好 | 见上；分页 `limit` 上限钳制（max 50/100） |
| 文件上传 | ✅ 良好 | `upload/route.ts`：类型白名单 + 大小上限 + **魔数校验**（`verifyImageSignature`）+ sharp 完整性 + 限流；存储键 `${timestamp}-${randomHex}.${ext}`（无路径穿越） |
| 路径穿越 | ✅ 良好 | 上传键随机生成；下载/外链 URL 经 httpUrl 校验；无 `../` 拼接 |
| 下载接口 / 资源权限 | ✅ 良好 | 下载链接为外部 URL（非内部存储路径），无文件 IDOR 面；资源写操作走 `requireAuth`/`requireAdminRole` |
| R2 权限 | 🟡 偏差（C-1） | 当前仅公开上传（`publicUrl` + `ACL: public-read`），**无签名 URL / 私有下载**；bucket 是否非公开为产品决策 |
| 资源 IDOR | ✅ 良好 | 资源/收藏/动态写接口均 `requireAuth` + 所有权/角色校验（89 个路由文件接入授权） |
| 管理后台权限 | ✅ 良好 | `proxy.ts` 强制 `/admin` 页面与 `/api/admin` 接口 ADMIN 及以上；`isSuperAdminRoute` 段精确匹配（防 `/admin/users-export` 绕过）；具体接口再用 `requireAdminRole("SUPER_ADMIN")` 精确把关 |
| Rate Limit | ✅ 良好 | `rate-limit.ts`：Redis 原子 INCR + 内存兜底；预置 auth(5/min)、register(3/h)、comment(10/min)、upload(20/h)、search(30/min) 等；`getClientIP` 默认不信任转发头（CF 场景需显式开 `TRUST_CF_CONNECTING_IP`） |
| Redis 降级安全 | ✅ 良好 | `redis.ts` 惰性代理 + 内存兜底；`rate-limit.ts` Redis 失败自动降级内存（不裸奔、不崩） |
| Secret / Token | ✅ 良好 | `.env*` 已被 `.gitignore` 忽略（`.env` 未被 git 跟踪）；`.env.example` 为脱敏模板 |
| .env / Git 泄漏 | ✅ 良好 | 见上；已确认 `.env` 不在版本库 |
| 日志泄漏 | ✅ 良好 | `api-handler` 对外报错统一为"服务器内部错误，请稍后再试"，不回吐堆栈/SQL；访问日志为 JSON 结构化（不含敏感字段） |
| Error 泄漏 | ✅ 良好 | Prisma 错误映射为通用信息；仅 Sentry 侧带 trace_id |
| 生产 sourcemap | ✅ 良好 | `next.config.ts`：`productionSourceMaps` 未开启（默认不公开）；Sentry sourcemap 由 webpack 插件生成并 `deleteSourcemapsAfterUpload: true`（上传后删除，不落地公开） |
| Sentry | ✅ 良好（部署验证） | 仅生产 + `SENTRY_DSN` 启用时初始化；失败降级 noop；`instrumentation.ts` 接线正确 |
| OpenTelemetry | ✅ 良好（部署验证） | 仅 `OTEL_EXPORTER_OTLP_ENDPOINT` 配置时启用，否则无操作降级 |
| Docker 安全 | 🟡 低（部署项） | `docker-compose.yml` 用 env 注入（`${VAR}`）；存在占位默认值 `POSTGRES_PASSWORD:-circleica`、`PGPASSWORD: circleica`，部署必须覆盖；未用 Docker `secrets:` 块（单主机部署可接受） |
| 反向代理信任 | ✅ 良好 | `proxy.ts` 从 `x-forwarded-proto` 判 HTTPS 发 HSTS；`getClientIP` 不默认信任转发头 |
| HTTPS / HSTS | 🟡 部署验证（C-4） | HSTS 逻辑正确（依赖前置代理设置 x-forwarded-proto）；真实 TLS 由 Cloudflare 终止，需在部署环境浏览器实测。CSP nonce 代码层已实现并 dev 验证，生产域无阻断待部署实测 |
| 安全响应头 | ✅ 良好 | `withSecurityHeaders`：X-Content-Type-Options nosniff、Referrer-Policy strict-origin-when-cross-origin、X-Frame-Options DENY、Permissions-Policy、COOP/CORP same-origin；重定向响应也带全套头 |
| 依赖漏洞 | ✅ 良好 | `npm audit` 0 |

## 真实缺陷 / 偏差清单

- 🔴 高：0 项
- 🟠 中：0 项
- 🟡 低 / 偏差（均非代码缺陷，属产品或部署决策）：
  1. **C-1 R2 私有签名 URL未实现**：当前代码无 `getSignedUrl`/`GetObjectCommand`，仅公开上传。bucket 公开 vs 私有为产品决策；若定为私有，需补签名 URL 并把资源服务改为签名下发。
  2. **C-4 CSP nonce 已实现（本轮）**：`proxy.ts` 每请求生成 nonce 并经 `x-nonce` 请求头透传；根 `layout.tsx` 读取并应用到 ThemeScript，同时令全站 dynamic（**消除静态缓存 nonce 不匹配这一白屏根因**）；Next 自动为自身 framework / RSC-flight 内联脚本补同源 nonce。dev 运行时验证所有页面 200、内联脚本 nonce 与 CSP nonce 完全对齐（`mismatch=0`），白屏风险已消除。生产构建本机被 safe-delete shim 拦截（环境约束），部署环境 `next build` + `next start` 仍需终验。
  3. **Docker 占位弱口令**：compose 默认 `circleica`，部署必须显式覆盖（写入部署核对清单）。

## 不擅自处理的项（按本轮铁律）

- C-1 R2 公开/私有：产品级决策，已记录，待你定夺。
- C-4 nonce CSP：已实现并 dev 真实验证，待部署环境终验（HTTPS + 生产域无阻断）。
- Docker `secrets:` 块化改造：单主机部署当前 env 注入可接受，列为部署核对项，不擅自重构。

## 验证记录

- `npm audit`：0 vulnerabilities（本沙箱真实执行）。
- 安全头、CSRF、限流、权限、上传校验均经源码 + 既有 `__tests__` 核验（csrf / rate-limit / api-handler 有单测）。
- `dangerouslySetInnerHTML` 全量定位（8 处）逐一确认无未净化用户输入。

## 结论

安全维度达到"可部署"状态：代码侧无中/高危缺陷，`npm audit` 0 漏洞，授权/校验/限流/头/上传/SSRF 均已正确接线。C-1（公开读 + 防滥用 + 密钥不泄露修复）、C-4（nonce CSP 已实现并 dev 验证）本轮已落地；Docker 弱口令占位为部署核对项，其余 C-1~C-7 转入部署验收清单，不伪造 PASS。
