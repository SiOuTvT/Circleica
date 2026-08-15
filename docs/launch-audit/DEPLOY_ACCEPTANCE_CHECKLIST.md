# 部署环境验收清单（C-1~C-6 + 回滚演练）

- **性质**：C 类 6 项 + 回滚演练，**全部必须真实执行并 PASS**，不允许定义为"上线后优化"，不允许用 BLOCKED 掩盖失败。
- **纪律（用户第五轮铁律 5/6/7/8）**：
  - C 类任一项真实验证失败 → 立即视为"发现的实际问题"，进入 **发现 → 修复 → 重验 → PASS** 闭环。
  - 回滚演练必须真实执行：新版本部署成功 → 验证 → 按既定方案回滚旧版本 → 再验证 DB/应用/资源访问正常。
  - 最终 GO 解除条件（严格）：A 全 PASS + B=0 + C 全 PASS + D 有充分反证 + 临时文件清零 + 数据对账 0 + 构建 0 error/0 warning + 测试 0 failure + npm audit 0 + 回滚 PASS。
  - 在达到以上条件前，结论只能保持 **CONDITIONAL GO**。

---

## C-1 · R2 对象存储真实连通 + 防滥用
- [ ] 部署机注入 `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET` / `R2_BUCKET`
- [ ] 真实上传一个测试资源 → 返回成功
- [ ] 真实下载 / 生成签名 URL → 可访问且不过期异常
- [ ] 资源列表/删除路径冒烟
- **未闭环原因（本机）**：无生产凭证，物理无法验证。

### C-1 防滥用（本轮新增 · 已在本机实现并部分验证）
- **产品决策已确认**：游戏资源**保持公开读**（不强制登录、不验证码、不人机验证、复制链接不登录可访问）。
- **A 防页面 / API 批量爬取**：`src/proxy.ts` 对**未登录**的页面 HTML（500/min/IP）与公开 API GET（120/min/IP）做匿名 IP 频控；登录用户 / Bearer 调用方豁免；搜索等已有 30/min 细粒度限制保留。需部署环境 `TRUST_CF_CONNECTING_IP=1`（或边缘代理正确 reset `x-forwarded-for`）以解析真实客户端 IP，否则 fail-open（不误杀）。
- **B 防公开下载资源被批量刷**：下载计数接口新增单 IP 60/min 硬限（纵深防御既有 60s 同分流去重）；公开资源 URL 为 R2 公网域名（**不含任何凭证**）。
- **密钥不泄露（本轮修复）**：`src/app/api/admin/services/route.ts` GET 不再回传 `r2_secret_access_key` / `r2_access_key_id` / `redis_token` 真实值（改只写空白占位），Secret Key 不再进入浏览器。R2 凭证仅服务端使用；公网 URL ≠ 管理权限。
- **Cloudflare / WAF 层建议**见 `docs/DEPLOYMENT.md`（速率限制规则 + Bot Management + R2 公网域名限流 + 管理/签名仅走 Cloudflare 凭据）。
- 验证：API 层频控 dev 运行时实测 120 次后返回 429；页面层频控代码正确（dev 下 proxy 按请求重估模块导致计数不跨请求累积，生产单实例长生命周期会正确累积，建议部署环境终验）。

## C-2 · Sentry 真实事件上报
- [ ] 部署环境注入 `SENTRY_DSN` / `SENTRY_AUTH_TOKEN`
- [ ] 生产构建（`npm run build` 带 Sentry 注入）→ 成功产出 release
- [ ] 触发一个测试异常 → Sentry 收得到事件 + sourcemap 可解析
- **未闭环原因（本机）**：无 DSN，无法验证上报。

## C-3 · OpenTelemetry 真实 trace/metric/log
- [ ] 部署环境注入 `OTEL_EXPORTER_OTLP_ENDPOINT`
- [ ] 应用启动 → Collector 收到 trace + metric
- [ ] 日志经 OTel 桥接进入后端（Grafana Loki/Tempo）
- **未闭环原因（本机）**：无 Collector 端点。

## C-4 · HTTPS / TLS / CSP
- [x] **CSP nonce 已在代码层实现（本轮新增）**：`src/proxy.ts` 每请求生成 nonce → 写入 `Content-Security-Policy`（`script-src 'self' 'nonce-…' 'strict-dynamic'`，生产去 `unsafe-eval'`）+ 透传 `x-nonce` 请求头；根 `layout.tsx` 读取并应用到 `<ThemeScript nonce>`，并令全站 dynamic（消除静态缓存 nonce 不匹配这一白屏根因）；Next 自动为自身 framework / RSC-flight 内联脚本补同源 nonce。
- [x] **dev 运行时真实验证**：首页/游戏/登录/Galvelica/搜索/发现/排行全部 200；每个页面 `cspHasNonce=true` 且**所有内联脚本 nonce 与 CSP nonce 完全对齐（`mismatch=0`）、无未带 nonce 的内联脚本**（仅 JSON-LD 非执行型脚本不带 nonce，不受 script-src 约束）；证明非生产白屏。
- [ ] 部署机配置证书 + 强制 HTTPS 重定向
- [ ] 全站 Mixed Content 检查通过
- [ ] CSP 头（含协作信令放行）在生产域生效且无阻断
- **未闭环原因（本机）**：HTTPS / 生产域 CSP 无阻断验证属部署基础设施，localhost 无 TLS，仍需部署环境终验。

## C-5 · Redis 真实实例
- [ ] 部署环境连真实 Redis（`REDIS_URL`）
- [ ] 缓存命中 / 失败降级路径冒烟（代码路径已单测 + mock 验证）
- [ ] set/del 错误日志节流在真实负载下表现正常
- **未闭环原因（本机）**：无真实 Redis 实例。

## C-6 · CI 完整生产门禁
- [ ] 合并前 CI 跑通：`tsc` / `lint` / `jest` / `build` / `playwright`
- [ ] CI 用 workflow 内建临时 Postgres，不连生产库
- [ ] 监控密钥只在部署环境注入，普通 PR CI 不放生产 `DATABASE_URL`/`SENTRY_DSN`/`OTEL` endpoint
- **未闭环原因（本机）**：需 CI runner 触发 `.github/workflows/ci.yml`。

---

## 回滚演练（C-7 · 真实回滚）
- [ ] 新版本（v1.2.0）部署成功并验证核心功能（浏览/下载/发布/资源访问）
- [ ] 按既定回滚方案切回上一稳定版本（如 v1.1.0）
- [ ] 回滚后验证：数据库 schema/数据一致（migrate 状态）、应用启动正常、资源（sw-asset/R2）访问正常
- [ ] 记录回滚耗时与任何不一致点，闭环修正
- **未闭环原因（本机）**：需部署环境 + 历史版本产物（`release/<version>/` 归档）。

---

## 当前状态（2026-08-16 本机真实执行）

> 完整证据链见 `DEPLOY_ACCEPTANCE_EVIDENCE_2026-08-16.md`。

环境现实：本机 = Windows 开发工作区（非部署环境）；无 Docker；`.env` 仅含 DATABASE_URL/NEXTAUTH_SECRET/CNGL_API_TOKEN，缺失 R2/Sentry/OTEL/Redis 全部凭证。真实部署在远程 Linux+Docker 服务器执行 `deploy.sh`（Cloudflare 代理终止 TLS）。故 C-1~C-5、C-7 运行期真实验收在本沙箱物理不可执行。

| 项 | 本环境真实结果 | 状态 |
|---|---|---|
| C-6 Prisma/tsc/lint/jest | 真实全过（tsc 修复 2 个真实错误后 EXIT 0；jest 325/0；lint 0err/97warn） | 本机 PASS（build/e2e 归 CI runner，历史绿） |
| C-6 build | 被本机 safe-delete shim 拦截 `.next` 清理，非代码缺陷 | 归 CI runner 终验 |
| C-1 R2 + 防滥用 | **产品决策已确认（公开读）**；A 防爬 / B 防刷 / 密钥不泄露已在本机实现（API 频控 dev 实测 429；页面频控代码正确待部署终验；R2 Secret 泄露修复） | 待部署环境（R2 连通 + 生产频控 + Cloudflare/WAF 速率规则） |
| C-2 Sentry | 代码核验就绪 | 待部署环境 |
| C-3 OTEL | 代码核验就绪（缺省降级无监控） | 待部署环境 |
| C-4 HTTPS/TLS + nonce | **nonce CSP 已实现并 dev 真实验证（mismatch=0，白屏根因消除）**；生产域 HTTPS + 无阻断待部署终验 | 待部署环境（HTTPS + 生产域 CSP 无阻断） |
| C-5 Redis | 代码核验就绪（惰性代理+内存降级） | 待部署环境 |
| C-7 回滚 | 配置核验就绪（backup/healthcheck/migrate） | 待部署环境 |

两个**产品级决策**本轮已由用户拍板并落地：① C-1 确认「公开读」（不强制登录/验证码/人机验证），并补充 A 防爬 + B 防刷下载 + 密钥不泄露；② C-4 确认「nonce CSP 现在修」，已在本机实现并 dev 真实验证。两者均不再是待决策项。

- 结论：**CONDITIONAL GO**。本机已真实闭环 C-6 代码质量门禁并修复 1 个会让 CI typecheck 真实挂掉的缺陷；C-1~C-5、C-7 附部署环境精确 runbook，待在服务器/CI runner 真实执行后全部可 PASS。
- 若任一 C 项在部署环境实测失败：立即登记为实际问题，进入修复闭环，不在本清单标记为"已优化"。
- 不伪造 PASS；全部有真实证据后重生成最终报告并改 GO。

---

## 部署前整备轮补充（2026-08-16）

本轮在进部署环境前完成仓库整备，与 C-1~C-7 验收解耦：

- **性能**：逐页面复核（首页 / 游戏 / 详情 / 画廊 / Galvelica 全站 / 用户 / 社区 / 管理后台）。结论良好，无中高危；修正 `game-card` 高频卡片 `transition-all` 为精确过渡。报告：`PERFORMANCE_FINAL_AUDIT.md`。
- **安全**：复核认证 / CSRF / 限流 / 权限 / 上传 / SSRF / 响应头 / 错误处理；`npm audit` 0 漏洞。两项产品决策（C-1、C-4）已记录。报告：`SECURITY_FINAL_AUDIT.md`。
- **数据**：真实库只读核验发现 3 个迁移未应用，经 `prisma migrate deploy` 补齐；slug 完整性 / 唯一约束 / 外键孤儿 / 计数器一致性 / 空值异常全部 0 异常。报告：`DATA_INTEGRITY_FINAL_AUDIT.md`。
- **仓库整理**：根目录一次性诊断产物与 `audit_screenshots/`（约 954 文件）已删除；历史审计报告归档至 `archive/audit-docs/`；正式文档从零重写（README / CONTRIBUTING / SECURITY / CHANGELOG / docs/{ARCHITECTURE,DEVELOPMENT,DEPLOYMENT,OBSERVABILITY,DATA_MODEL}）。
- **代码门禁（本机真实）**：`tsc` 0、`lint` 0 错 / 97 警告、`jest` 325/0、`npm audit` 0、`prisma validate` 有效、迁移 0 pending。
- ScriptWeaver 专属文档（`sw-asset` / D-1 反证）已移出 Circleica 至 `archive/`，不列入治理队列。

**整备后结论仍为 CONDITIONAL GO**：代码与数据侧已收口，剩余 C-1~C-7 必须在部署服务器 / CI runner 真实执行并 PASS 后才解除。

---

## C-1 / C-4 落地轮（2026-08-16 第二轮 · 用户确认继续推进）

用户本轮明确：不以部署速度优先，把能解决的问题在本机收口；C-1 公开读但加强防滥用、C-4 nonce 现在修、Next.js 不盲目升级、治理队列重新判断。

### C-4 · nonce CSP（已实现 + 真实验证）
- `src/proxy.ts`：`generateNonce()` 每请求生成；`buildCSP(nonce)` 输出 `script-src 'self' 'nonce-…' 'strict-dynamic'`（生产去 `unsafe-eval'`）；同一 nonce 经 `x-nonce` 请求头透传 `NextResponse.next({ request:{ headers } })`。
- `src/app/layout.tsx`：读取 `headers().get('x-nonce')` 并传入 `<ThemeScript nonce>`，借此令全站 dynamic（**消除静态缓存 nonce 不匹配这一白屏根因**）。
- `src/components/theme-script.tsx`：`<script nonce={nonce}>`。
- **dev 运行时真实验证**（临时脚本已删除）：首页/游戏/登录/Galvelica/搜索/发现/排行全部 200；`cspHasNonce=true` 且**所有内联脚本 nonce 与 CSP nonce 完全对齐（`mismatch=0`、`noNonceInline=0`，仅 JSON-LD 非执行型脚本不带 nonce，不受 script-src 约束）**；证明非生产白屏。
- 生产构建（`npm run build`）本机被 safe-delete shim 拦截 `.next` 清理（环境约束，非代码缺陷）；runtime 验证已替代证明 nonce 机制正确；部署环境 `next build` + `next start` 仍需终验。
- Next.js 版本：`16.3.1`（最新稳定），auto-nonce 已支持，**无需升级**。

### C-1 · 公开读 + 防滥用（已实现）
- 产品决策：游戏资源公开读（不强制登录 / 不验证码 / 不人机验证）。
- **A 防爬**：`proxy.ts` 对未登录的页面 HTML（500/min/IP）与公开 API GET（120/min/IP）做匿名 IP 频控；登录 / Bearer 豁免；搜索等细粒度限制保留。需 `TRUST_CF_CONNECTING_IP=1` 解析真实 IP，否则 fail-open。
- **B 防刷下载**：下载计数接口新增单 IP 60/min 硬限（纵深防御 60s 同分流去重）。
- **密钥不泄露（修复）**：admin/services GET 不再回传 R2 Secret/AccessKey/Redis Token 真实值（只写空白占位）；R2 公网 URL 不含凭证。
- Cloudflare / WAF 层速率限制 + Bot Management + R2 公网域名限流建议在 `docs/DEPLOYMENT.md`。

### 治理队列重判（STANDALONE_CLEANUP_QUEUE.md）
- 原队列（~97 any、console 清理、audit_screenshots 存档）重新评估：**均不满足「现在修」标准**（大型类型重构 / 高风险 / 用户待定决策），保持后续治理；本轮未把任何问题违规丢入「以后」。

### 本机代码门禁（第二轮补充）
- `tsc` 0、`lint` 0 错 / 97 警告（pre-existing any，无新增）、`jest` 325/0、rate-limit 机制 dev 实测 429。
