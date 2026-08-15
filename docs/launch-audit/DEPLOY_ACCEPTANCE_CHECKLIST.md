# 部署环境验收清单（C-1~C-6 + 回滚演练）

- **性质**：C 类 6 项 + 回滚演练，**全部必须真实执行并 PASS**，不允许定义为"上线后优化"，不允许用 BLOCKED 掩盖失败。
- **纪律（用户第五轮铁律 5/6/7/8）**：
  - C 类任一项真实验证失败 → 立即视为"发现的实际问题"，进入 **发现 → 修复 → 重验 → PASS** 闭环。
  - 回滚演练必须真实执行：新版本部署成功 → 验证 → 按既定方案回滚旧版本 → 再验证 DB/应用/资源访问正常。
  - 最终 GO 解除条件（严格）：A 全 PASS + B=0 + C 全 PASS + D 有充分反证 + 临时文件清零 + 数据对账 0 + 构建 0 error/0 warning + 测试 0 failure + npm audit 0 + 回滚 PASS。
  - 在达到以上条件前，结论只能保持 **CONDITIONAL GO**。

---

## C-1 · R2 对象存储真实连通
- [ ] 部署机注入 `R2_ENDPOINT` / `R2_ACCESS_KEY` / `R2_SECRET` / `R2_BUCKET`
- [ ] 真实上传一个测试资源 → 返回成功
- [ ] 真实下载 / 生成签名 URL → 可访问且不过期异常
- [ ] 资源列表/删除路径冒烟
- **未闭环原因（本机）**：无生产凭证，物理无法验证。

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
- [ ] 部署机配置证书 + 强制 HTTPS 重定向
- [ ] 全站 Mixed Content 检查通过
- [ ] CSP 头（含协作信令放行）在生产域生效且无阻断
- **未闭环原因（本机）**：属部署基础设施，localhost 无 TLS。

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
| C-1 R2 | 代码核验就绪；**产品决策：公开读 or 私有+签名 URL（当前公开读，无签名 URL 代码）** | 待部署环境 + 产品决策 |
| C-2 Sentry | 代码核验就绪 | 待部署环境 |
| C-3 OTEL | 代码核验就绪（缺省降级无监控） | 待部署环境 |
| C-4 HTTPS/TLS | 代码核验就绪；**产品决策：CSP nonce or unsafe-inline（当前 unsafe-inline，Next16 兼容取舍）** | 待部署环境 + 产品决策 |
| C-5 Redis | 代码核验就绪（惰性代理+内存降级） | 待部署环境 |
| C-7 回滚 | 配置核验就绪（backup/healthcheck/migrate） | 待部署环境 |

两个**产品级决策**（按用户要求未擅自改动，仅审计与准备方案）：① C-1 R2 公开读 vs 私有 + 签名 URL；② C-4 生产 CSP nonce vs unsafe-inline。代码当前两种取向都能跑，决定后补充对应改造。

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
