# 最终部署前整备计划（PRE-DEPLOYMENT PREPARATION PLAN）

> 本文件是**计划**，供你确认后执行。当前阶段**未修改任何代码 / 文档 / 仓库文件**。
> 目标：在真正部署到 Linux+Docker 服务器之前，把 Circleica 整理到「可交付、可维护、目录清晰、文档准确」的最终状态。
> 不与部署验收 C-1~C-7 的运行期验收混淆：本计划产出的是「部署前整备」，C-1~C-7 的真实运行期证据仍在部署服务器按上一轮 runbook 闭环。

---

## 1. 当前项目现状

| 维度 | 真实状态 |
|---|---|
| 页面路由 | **96 个 `page.tsx`**（admin 约 30 个；含首页/游戏/Galvelica/用户/社区/动态详情/高图密度页） |
| 源码 | `src/` 692 文件，结构完整 |
| 根目录临时产物 | 约 40+ 个：`audit_*.{json,txt,log,err}`、`build_verify*.log`、`tmp_*.mjs/.sql`、`_audit_dev.log`、`_dev3.log`、`start-prod.log`、`tsc_audit.txt`、`eslint_report.txt`、`nul`、`circleica_data.sql`、`circleica.tar.gz` |
| docs/ | `audit-final/`(11) + `launch-audit/`(17) + 16 个散落历史报告（AUDIT_REPORT、全站综合审查报告、CARD_V2_*、SERVER_BENCHMARK、THEME_STATIC_PLAN、deploy-topology、DEPLOYMENT_*、DOC_STANDARDS 等） |
| audit_screenshots/ | **954 文件**（887 png / 43 py / 12 json / 7 txt / 3 log） |
| scripts/ | 33 个，多为正式 reconcile/backfill/ingest/verify 工具 |
| archive/ | 32 个历史 md（已是历史容器） |
| 上一轮结论 | CONDITIONAL GO；C-6 本机真实全过，C-1~C-5/C-7 待部署环境 |
| 已知代码缺口 | ① C-1 私有签名 URL / 私有下载未实现；② C-4 生产 CSP 用 `unsafe-inline` 非 nonce |
| git | 当前工作树干净（上一轮 tsc 修复需确认是否已落盘/提交） |

---

## 2. 性能检查范围（输出 `PERFORMANCE_FINAL_AUDIT.md`）

逐页面、逐路由复核，至少覆盖下面分组（共 96 路由，重点在★）：

- ★ 首页 `app/(home)/page.tsx`
- ★ 游戏列表/搜索/筛选：`/games` `/search` `/discover` `/ranking`
- ★ 游戏详情：`/games/[id]`（含 gallery，高图密度）
- Galvelica Archive：`/galvelica` `/galvelica/works` `/galvelica/tags` `/galvelica/studios` `/galvelica/years` `/galvelica/random`
- Archive 详情：`/creators/[id]` `/tags/[id]` `/galvelica/works/[serialId]` `/galvelica/studios/[studio]` `/credits/*` `/creators/vndb/[id]`
- 用户：`/profile` `/profile/[id]` `/user/[id]` ★ `/messages` `/notifications`
- 登录注册：`/login` `/register` `/forgot-password` `/reset-password` `/verify-email`
- 管理后台：★ `/admin/overview` `/admin/services` `/admin/site-settings` `/admin/collections` 等约 30 个
- 下载/资源：`/card/[uid]`（卡牌/资源）、游戏下载入口
- 社区：`/forum` `/forum/[id]`
- 动态详情：`/announcements/[id]` `/characters/[id]` `/collections/[id]`

**逐页检查 30 项**（首屏/LCP/CLS/INP、bundle 体积、Client/Server 边界、动态渲染、重复请求、重复 fetch、缓存缺失、多余 DB 查询、N+1、select *、Prisma 缩减、一次性大请求、图片 lazy/size/原图、列表分页/虚拟化、重复渲染、昂贵 hook、整页重渲染、transition:all/will-change/backdrop-filter、第三方脚本阻塞、字体/图标/CSS 冗余、死 CSS、超大组件、AbortController 缺失、移动端/低配/滚动性能）。

**产出格式**（按页面/路由）：

| 页面 | 风险 | 严重程度 | 是否修复 | 验证结果 | 备注 |
|---|---|---|---|---|---|

- 真问题 → 修 → 验 → 记录。
- 架构级大改 / 影响业务 / 需长期治理 → 不擅自扩大，单列治理队列。

---

## 3. 安全检查范围（输出安全审计结论，并入最终报告）

重点复用已读代码（`proxy.ts` / `env.ts` / `redis.ts` / `storage.ts` / `instrumentation*.ts` / `sentry.*.config.ts`），覆盖：

身份认证 / Session·Cookie / CSRF / XSS / CSP / CORS / SSRF / SQL 注入 / Prisma 查询安全 / API 参数校验 / Zod / 文件上传·类型·大小·路径穿越 / 下载接口 / 资源权限 /  admin 权限 / IDOR / Rate Limit / Redis 降级安全 / R2 权限 / 私有资源访问 / 签名 URL / Secret·Token 泄漏 / `.env` 是否进 Git / 日志·Error 是否泄漏内部 / sourcemap / Sentry·OTel 配置 / Docker 安全 / 反向代理信任 / HTTPS·HSTS / 安全响应头 / **当前实际 CSP 策略** / 依赖漏洞 `npm audit`。

**重查两项已知缺口**：
- **C-1 R2 私有签名 URL**：当前代码无 `getSignedUrl`/私有下载 → 代码缺陷，**需你先定夺 bucket 公开/私有**（见第 11 节决策项）。
- **C-4 CSP nonce/unsafe-inline**：生产 CSP 实际 `unsafe-inline`（Next 16 对齐 bug 历史决策）→ 代码现状如此，是否改 nonce 属产品决策（见第 11 节）。

原则：代码缺陷→修；部署项→标部署验收；产品决策→列你确认，不擅自决定。

---

## 4. 数据最终完整性检查

- **Prisma Schema 核对**（模型）：`Game` / `Creator` / `Tag` / `Studio` / `CuratedCollection` / `WorkSource` 及计数器 `downloadCount`·`favoriteCount`·`likeCount` 等。重点：NOT NULL / unique / 复合 unique / FK / cascade·restrict / enum / slug。
- **计数器与 reconcile**：`scripts/reconcile-*`（`reconcile-counters` `reconcile-orphans` `reconcile-slug` `reconcile-creator` `reconcile-data` `reconcile-link` `reconcile-worksource`）、`recompute-quality`、`dedup-cross-source`、`verify-*`。
- **真实 DB 只读核验**：用 `.env` 的 `DATABASE_URL` 跑**严格只读** `SELECT/COUNT`（唯一索引是否生效、孤儿数据、null/empty 异常、重复数据、废弃字段、schema 与代码模型一致性）。**绝不改写**。
- **migrate deploy / 空库初始化**：本机无独立 DB 实例，写操作（含新库初始化）归入部署/CI 环境核验；本机只做 `prisma validate` + migration 历史一致性检查。
- 数据修复铁律：**先统计 → 再修复 → 再统计 → 验证为 0**；不为审计数字好看改数据。

---

## 5. 文件结构整理范围

- **根目录临时产物**（删除前做依赖检索）：`_audit_dev.log` `_dev3.log` `audit_*.{json,txt,log,err}`（约 30 个）`build_verify*.log` `eslint_report.txt` `start-prod.log` `tmp_idx.mjs` `tmp_recon*.mjs` `tmp_recon_query.sql` `tsc_audit.txt` `nul`，以及 `circleica_data.sql` / `circleica.tar.gz`（先核实是否仍需，否则归档/删）。
- **scripts/**：基本保留（正式 reconcile/backfill/ingest/verify 工具）；仅个别（`dev-clean.js` 等）复核是否临时脚本。
- **docs/**：`audit-final/` + `launch-audit/` 归为审计过程材料，移入 `docs/audit/`（或 `archive/`）；散落历史报告（`AUDIT_REPORT.md` `全站综合审查报告.md` `CARD_V2_*` `CARD_FEATURE_LOG.md` `SERVER_BENCHMARK_*` `THEME_STATIC_PLAN.md` `DOC_STANDARDS.md` `deploy-topology.md` `DEPLOYMENT_CHECKLIST.md` `DEPLOYMENT_BEST_PRACTICE.md` `_orig_home_page.txt`）按「有历史价值→归档，纯过程→删」处置。
- **archive/** 已存在，作为历史容器；避免重复归档。
- **移动前必做引用检索；删除前必做依赖检索**；整理后跑 tsc/lint/test 确认无副作用。
- 核查 `.gitignore`：确认 `next-env.d.ts` / `tsconfig.tsbuildinfo` / `.env*` / `node_modules` / `.next` 已被忽略。

---

## 6. audit_screenshots 处理方案

- 已确认：全 `.md` 文档 0 引用；`tsconfig.json` 仅 `exclude` 配置引用（非证据依赖）。
- 执行时再查 `package.json` / `tsconfig` / CI / 代码引用（预期仍 0）。
- 若全无依赖：**先统计精确数量与总大小** → 因文件数 >50 触发 safe-delete 批量保护 → **先报告数量/大小，等你确认后再删**，不擅自清。
- 删除绝不影响 C-1~C-7 验收。

---

## 7. GitHub 文档最终清单（先定清单，再重写）

| 文档 | 处置 | 理由 | GitHub 可见 | 位置 |
|---|---|---|---|---|
| `README.md`（根） | 重写 | 项目门面，旧版失效 | 是 | 根 |
| `LICENSE` | 保留 | 法律必需 | 是 | 根 |
| `CONTRIBUTING.md` | 重写 | 贡献指南 | 是 | 根 |
| `SECURITY.md` | 新建 | 安全披露政策（配合安全审计） | 是 | 根 |
| `CHANGELOG.md` | 新建/重写 | 版本与变更台账 | 是 | 根 |
| `docs/ARCHITECTURE.md` | 重写 | 当前架构，旧版过时 | 是 | docs/ |
| `docs/DEVELOPMENT.md` | 重写（并合 GETTING_STARTED） | 开发上手 | 是 | docs/ |
| `docs/DEPLOYMENT.md` | 重写（并合 deploy-topology+DEPLOYMENT_*） | 部署唯一入口 | 是 | docs/ |
| `docs/observability.md` | 重写/保留 | 可观测性 | 是 | docs/ |
| `docs/DATA_MODEL.md` | 新建 | 数据模型与计数口径 | 是 | docs/ |
| `docs/audit/` | 归档 | 审计过程材料，不当门面 | 否（子目录） | docs/audit/ |
| 散落历史报告 | 归档 `archive/` 或删 | 过程残留 | 否 | archive/ |

原则：GitHub 首页只见**当前有效文档**；审计过程材料与正式文档分离；旧文档视为废弃版本，从零重写而非追加。

---

## 8. 可删文件（初步清单，执行前逐项依赖检索 + 等你确认）

**根目录（临时/过程产物）**：
`_audit_dev.log` `_dev3.log` `audit_audit_prod.json` `audit_db_counts.json` `audit_db_relations.json` `audit_eslint.log` `audit_extra_ids_out.json` `audit_fav_out.json` `audit_final_ids_out.json` `audit_findunique_out.txt` `audit_findunique2_out.txt` `audit_jest.log` `audit_login_probe.txt` `audit_login_probe2.txt` `audit_login_probe3.txt` `audit_probe_tag.txt` `audit_probe_tag2.txt` `audit_real_urls.txt` `audit_routes_fs.txt` `audit_slug_out.json` `audit_source_out.txt` `audit_source2_out.txt` `audit_sweep_admin.err` `audit_sweep_admin.log` `audit_sweep_public.err` `audit_sweep_public.log` `audit_sweep_user.err` `audit_sweep_user.log` `audit_tsc.log` `audit_ult_login.txt` `audit_urls_out.json` `audit_users_out.json` `audit_users.json` `build_verify_err.log` `build_verify.log` `eslint_report.txt` `start-prod.log` `tmp_idx.mjs` `tmp_recon_query.sql` `tmp_recon.mjs` `tmp_recon2.mjs` `tsc_audit.txt` `nul` `circleica_data.sql`*(核实)* `circleica.tar.gz`*(核实)*

**docs/ 历史过程报告（归档或删）**：
`docs/_orig_home_page.txt` `docs/全站综合审查报告.md` `docs/AUDIT_REPORT.md` `docs/CARD_FEATURE_LOG.md` `docs/CARD_V2_DATA_MAP.md` `docs/CARD_V2_SPEC.md` `docs/SERVER_BENCHMARK_2026-08-11.md` `docs/THEME_STATIC_PLAN.md` `docs/DOC_STANDARDS.md` `docs/deploy-topology.md` `docs/DEPLOYMENT_CHECKLIST.md` `docs/DEPLOYMENT_BEST_PRACTICE.md`（后三者内容并入 `docs/DEPLOYMENT.md` 后删）

**audit_screenshots/**：954 文件（核实无依赖后删，受批量保护，先报告再删）

---

## 9. 必须保留

- `src/` 全部源码；`public/` `e2e/` `observability/` `prisma/`（schema+migrations+sql）
- 配置：`next.config.ts` `tsconfig.json` `package.json` `jest.config.ts` `playwright.config.ts` `eslint.config.mjs` `postcss.config.mjs` `components.json` `Dockerfile` `docker-compose*.yml` `*-entrypoint.sh` `deploy.sh` `ecosystem.config.js`
- `sentry.client.config.ts` `sentry.edge.config.ts` `sentry.server.config.ts`（被引用）
- `scripts/` 正式工具（reconcile/backfill/ingest/verify/seed）
- 重写后的正式文档（README/LICENSE/CONTRIBUTING/SECURITY/CHANGELOG/docs/*）
- `archive/`（历史容器本身保留）

---

## 10. 属于本轮的问题

- 性能：逐页真问题修复（限安全、局部、可验证）
- 安全：代码缺陷修复（含确认后的 C-1 签名 URL、C-4 nonce 决策落地）
- 数据：只读核验 + 计数器/孤儿/重复修复（先统计→修复→再统计→验证 0）
- 文件结构：根临时文件清理、docs 整理、archive 归并
- 仓库：audit_screenshots 清理（核实后）
- 文档：GitHub 正式文档从零重写
- 产出：`PERFORMANCE_FINAL_AUDIT.md`、安全审计、最终报告

## 11. 不属于本轮 / 需你决策（产品级，不擅自决定）

- **C-1 R2 bucket 公开 vs 私有 + 是否实现签名 URL**：影响资源服务架构，需你拍板。
- **C-4 CSP nonce vs unsafe-inline**：Next 16 对齐 bug 历史决策，是否改 nonce 需你拍板。
- any 大规模重构 → 单列治理队列
- console 大规模治理 → 单列治理队列
- 功能范围扩大 / 数据库业务含义修改 / 未经验证的大规模架构重写
- C-1~C-7 运行期真实验收 → 归部署服务器

---

## 12. 最终验证清单（执行完成后必跑）

1. `git status` 2. 文件结构 3. 临时文件清零 4. 正式文档 5. `tsc` 6. `eslint` 7. `jest` 8. `npm audit` 9. `prisma validate` + migration 一致性 10. 数据只读核验 11. 生产 build（沙箱受 safe-delete shim 限制，归 CI；注明）12. E2E/CI（归 CI）13. 性能最终审计 14. 安全最终审计
15. 重新生成 `FINAL_PRE_DEPLOYMENT_AUDIT.md`
16. 更新/合并（不堆叠）：`STANDALONE_CLEANUP_QUEUE.md` `D1_NO_IMG_ELEMENT_RATIONALE.md` `DEPLOY_ACCEPTANCE_CHECKLIST.md` `DEPLOY_ACCEPTANCE_EVIDENCE_2026-08-16.md`

---

## 13. 完成后的部署入口

本机整备完成 → 推/部署到 Linux+Docker 服务器 → 按上一轮 runbook 跑 **C-1~C-7 真实验收** → **真实回滚演练** → 全部 PASS → `FINAL_RELEASE_ASSESSMENT` 改 **GO**。

---

### 待你确认的两点决策（影响 C-1 / C-4 是否在本轮修代码）
1. R2 bucket 是否改为**私有 + 实现签名 URL**？（当前代码为公开 + publicUrl）
2. 生产 CSP 是否改回 **nonce**？（当前为 unsafe-inline 兜底，因 Next 16 白屏历史）

确认计划后我再开始执行（先性能/安全/数据核验与文件清理，文档重写放后段）。
