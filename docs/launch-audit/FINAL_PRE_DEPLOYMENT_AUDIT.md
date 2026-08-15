# 部署前最终整备报告（FINAL_PRE_DEPLOYMENT_AUDIT）

生成日期：2026-08-16
范围：Circleica 进入真实部署前的最终仓库整备。逐项覆盖性能 / 安全 / 数据 / 文件结构 / GitHub 文档，并给出剩余必须由部署环境验证的事项与最终结论。

配套证据：
- `PERFORMANCE_FINAL_AUDIT.md`（性能逐页复核）
- `SECURITY_FINAL_AUDIT.md`（安全复核）
- `DATA_INTEGRITY_FINAL_AUDIT.md`（数据只读核验 + 迁移补齐）
- `DEPLOY_ACCEPTANCE_CHECKLIST.md`（C-1~C-7 部署验收清单）
- `DEPLOY_ACCEPTANCE_EVIDENCE_2026-08-16.md`（本机真实执行证据）
- `STANDALONE_CLEANUP_QUEUE.md`（独立治理队列）

---

## 1. 当前项目状态

代码、数据、仓库均已收口，达到「可进入部署验收」的状态：

- 公共页面以 Server Component 为主，数据获取纪律良好（字段裁剪、分页、缓存、请求生命周期控制）。
- 安全基础设施完整（认证、CSRF、限流、权限、上传校验、SSRF 防护、安全头、统一错误处理），`npm audit` 0 漏洞。
- 数据库结构与代码一致，真实数据经只读核验 0 异常。
- 仓库目录干净，历史审计材料已归档，正式文档从零重写。
- 本机代码门禁全绿：`tsc` 0、`lint` 0 错 / 97 警告、`jest` 325/0、`npm audit` 0、迁移 0 pending。

唯一未闭环的是**部署环境运行期验收**（C-1~C-7），需在与真实凭证、Docker、CI runner 交互的部署服务器上执行。

## 2. 性能

逐页面复核了首页、游戏列表 / 搜索 / 发现 / 排行、游戏详情、画廊、Galvelica 全站（作品 / Tag / Studio / Creator / Year）、用户主页、登录注册、通知、论坛、收藏集、名片、管理后台主要页面。

- 真实修复 1 项：`game-card` 高频卡片的 `transition-all` 改为精确过渡（`transition-[transform,box-shadow]` / `transition-shadow`），视觉一致，避免动画所有属性。
- 其余页面结论良好：无 Client Component 滥用、无 N+1、无 select *、列表均分页、图片懒加载 + 尺寸明确、客户端请求均有 `AbortController` 生命周期控制、无 `useEffect` 内无脑 fetch 反模式。
- 治理队列（非本轮 Scope，不擅自改）：`transition-all` 全量精确化（119 处）、主站封面图优化策略、超大收藏集渲染上限、极端数据量下的列表虚拟化。

详见 `PERFORMANCE_FINAL_AUDIT.md`。

## 3. 安全

复核全部要求项，代码侧无中高危缺陷：

- 认证 / 会话：JWT、httpOnly + sameSite、角色与邮箱验证状态每次会话从 DB 读取。
- CSRF：状态变更接口强制同源校验（Origin / Referer 回退，缺失则拒绝）。
- 限流：按路由维度，Redis 原子计数 + 内存降级。
- 权限：后台路由段精确匹配，超级管理员接口二次把关。
- 上传：类型 + 大小 + 魔数 + 图片完整性 + 限流，随机存储键防路径穿越。
- SSRF：图片代理域名白名单 + 禁重定向 + DNS 重绑定防护。
- 响应头：X-Content-Type-Options / Referrer-Policy / X-Frame-Options DENY / frame-ancestors none / COOP / CORP 等同源隔离头齐全；错误不泄露内部信息。
- `npm audit`：**0 漏洞**。

两项**产品级决策**（按你的要求未擅自改动）：
- **C-1 R2**：当前资源桶公开读，无私有签名 URL 代码。是否改为私有 + 签名下发需你定。
- **C-4 CSP**：生产 `script-src` 含 `unsafe-inline`（Next 16 nonce 对齐会导致白屏的取舍）。是否切回 nonce 需你定。

详见 `SECURITY_FINAL_AUDIT.md`。

## 4. 数据

对真实数据库（开发 / 镜像库，含真实摄入数据）做只读核验：

- 发现 3 个迁移未应用：`slug_not_null`、`worksource_unique`、`schema_consistency`。
- 修复：`prisma migrate deploy` 补齐（幂等、非破坏性）。
- 修复后全量只读核验，全部 0 异常：
  - slug 空值 / 重复：0
  - WorkSource `(source, externalId)` / `(workId, source)` 重复：0
  - 6 类关联表孤儿：0
  - `Game.favoriteCount` / `Comment.likeCount` / `Game.downloadCount` 与关联表实际条数不一致：0
  - `Creator(name, source)` 重复、空标题 / 空名：0
- 未为审计数字修改任何数据；异常本就为 0，迁移补齐属标准 deploy 步骤（也是 C-6 的 migrate 门禁）。

详见 `DATA_INTEGRITY_FINAL_AUDIT.md`。

## 5. 文件结构

- 根目录：删除了全部一次性诊断产物（`audit_*.json/.txt/.log/.err`、`build_verify*`、`tsc_audit`、`eslint_report`、`start-prod.log`、`_audit_dev.log`、`_dev3.log`、`tmp_*.mjs/.sql`、`circleica_data.sql`、`circleica.tar.gz`、`nul`）。保留的是真实工程文件（`README`、各类配置文件、`deploy.sh`、`docker-*`、`*.ps1` 开发脚本等）。
- `audit_screenshots/`（约 954 文件、约 100MB，0 引用）：已删除。
- `docs/`：历史审计报告（`AUDIT_REPORT`、全站综合审查报告、`CARD_V2_*`、`SERVER_BENCHMARK`、`THEME_STATIC_PLAN`、`deploy-topology`、`DEPLOYMENT_*`、`DOC_STANDARDS`、`GETTING_STARTED`、`API_REFERENCE`、旧 `observability` / `ARCHITECTURE` 等）归档至 `archive/audit-docs/`；`docs/` 根现只含正式文档与 `launch-audit/`（最终审计证据）。
- `scripts/`：保留全部正式数据工具（回填 / 对账 / 摄入 / 校验 / 种子），删除的是我本轮产生的临时脚本。
- `archive/`：承接历史过程材料，不在 GitHub 门面位置。

## 6. GitHub 文档

从零重写，依据当前真实代码与数据库状态，不照搬旧文档：

| 文档 | 位置 | 状态 |
|---|---|---|
| README.md | 根 | 重写（项目定位、双站、技术栈、快速开始、文档索引） |
| LICENSE | 根 | AGPL-3.0，保留 |
| CONTRIBUTING.md | 根 | 重写（从 docs/ 移入根并重写） |
| SECURITY.md | 根 | 新建（防护清单 + 两项产品决策 + 漏洞报送） |
| CHANGELOG.md | 根 | 新建（按时间线记录整备轮真实工作） |
| docs/ARCHITECTURE.md | docs/ | 重写 |
| docs/DEVELOPMENT.md | docs/ | 重写 |
| docs/DEPLOYMENT.md | docs/ | 重写 |
| docs/OBSERVABILITY.md | docs/ | 重写 |
| docs/DATA_MODEL.md | docs/ | 重写 |

写作遵循：自然语言、技术准确、不堆术语、不营销、限制如实写明、产品决策如实标注。

## 7. 当前剩余问题

- 🔴 高：0
- 🟠 中：0
- 🟡 低（均非代码缺陷）：
  - C-1 R2 公开 / 私有 + 签名 URL：产品决策，待定。
  - C-4 CSP nonce / unsafe-inline：产品决策，待定。
  - `lint` 97 个 `any` 警告：独立治理队列，不阻断。
  - `docker-compose.yml` 占位弱口令（如 `circleica`）：部署必须覆盖。

## 8. 必须由部署环境验证（不能在本机判定）

以下进入 C-1~C-7 验收，需在带凭证、Docker、CI runner 的部署服务器真实执行：

- C-1 R2：真实 PUT/GET、私有签名 URL、下载、bucket 非公开。
- C-2 Sentry：真实异常入站、release / sourcemap 定位。
- C-3 OTel：Collector 可达、trace / metric 实收。
- C-4 HTTPS/TLS：HTTP→HTTPS、证书、CSP、真实浏览器请求。
- C-5 Redis：真实连接、读写、缓存路径、降级。
- C-6 CI：PostgreSQL、migrate deploy、tsc、lint、Jest、build、Playwright 全过。
- C-7 回滚：真实部署新版本 → 验证 → 回滚上一版本 → 复验。

## 9. 部署前最终结论

**CONDITIONAL GO。**

代码、安全、数据、仓库结构、文档均已收口且经真实验证（性能修 1 项、安全 0 漏洞、数据 0 异常、门禁全绿、仓库清理完成）。在 C-1~C-7 全部于部署环境真实 PASS 之前，结论保持 CONDITIONAL GO，不伪造 PASS。

两项产品决策（C-1、C-4）需要你定夺；确定后会补充对应代码改造，但不影响「可进入部署验收」的判断。

## 10. 下一步部署步骤

1. 你定夺 C-1（R2 公开 / 私有）与 C-4（CSP nonce / unsafe-inline）。
2. 在部署服务器注入真实凭证（`.env`）。
3. 按 `docs/DEPLOYMENT.md` + `DEPLOY_ACCEPTANCE_CHECKLIST.md` 执行 C-1~C-7 真实验收与回滚演练。
4. 全部 PASS 后，重生成最终发布评估（`FINAL_RELEASE_ASSESSMENT.md`）并将结论改为 GO。

---

## 第二轮更新（2026-08-16 · C-1 / C-4 落地）

用户确认继续推进，不以部署速度优先，把能解决的问题在本机收口。

- **C-1（R2 公开读 + 防滥用）已落地**：产品决策确认为公开读（不强制登录 / 不验证码 / 不人机验证）。A 防爬（`proxy.ts` 匿名 IP 频控：页面 500/min、API 120/min，登录 / Bearer 豁免）、B 防刷下载（下载计数接口单 IP 60/min 硬限）、密钥不泄露（admin/services GET 不再回传 R2 Secret / AccessKey / Redis Token）均已实现。Cloudflare / WAF 层速率规则 + Bot Management + R2 公网域名限流建议在 `docs/DEPLOYMENT.md`。
- **C-4（nonce CSP）已实现并真实验证**：`proxy.ts` 每请求生成 nonce 并经 `x-nonce` 透传；`layout.tsx` 读取并应用（令全站 dynamic，消除静态缓存 nonce 不匹配这一白屏根因）；`theme-script.tsx` 带 nonce。dev 运行时验证所有主要页面 200、内联脚本 nonce 与 CSP nonce 完全对齐（`mismatch=0`）、无未带 nonce 的内联脚本（仅 JSON-LD 非执行型不带 nonce）。Next.js `16.3.1`（最新稳定），auto-nonce 已支持，无需升级。
- **本机代码门禁（第二轮）**：`tsc` 0、`lint` 0 错 / 97 警告（pre-existing any，无新增）、`jest` 325/0；rate-limit 机制 dev 实测 120 次后 429。
- **生产构建**：`npm run build` 本机被 safe-delete shim 拦截 `.next` 清理（环境约束，非代码缺陷）；runtime 验证已替代证明 nonce 机制正确，部署环境 `next build` + `next start` 仍需终验。
- 治理队列（STANDALONE_CLEANUP_QUEUE.md）已重新判断：队列项均不满足「现在修」标准，保持后续治理，非为赶部署而推迟。

结论仍为 **CONDITIONAL GO**：C-1 / C-4 代码层已收口并验证，剩余 C-1~C-7（R2 真实连通 / Sentry / OTEL / 生产 HTTPS + CSP 无阻断 / Redis / CI / 回滚）仍需部署环境真实验收。
