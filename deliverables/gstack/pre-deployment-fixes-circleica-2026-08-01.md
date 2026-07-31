# Circleica 部署前修复收口报告

**日期**：2026-08-01
**场景**：调试复盘 / 全流程修复（承接 `pre-deployment-review-circleica-2026-07-31.md` 的 34 项发现）
**参与成员**：主理人（沽思航）实现收口；发现来源为前序 Pre-Deployment Review 团队（产品官 + 安全卫士 + 质量门神 + 设计师 + 排障手）
**边界**：严格遵循 HANDOVER.md §3——不改架构 / API 契约 / DB Schema，不重构已验收模块，不混淆主副站；**部署是最后一步**（迁移执行、backfill、env 注入归用户）。

---

## 📌 TL;DR
- 审查报告 34 项发现已**全部落地修复或结案**；修复过程中新发现的「middleware→proxy 迁移缺口」「页面内 redirect 降级」两项也一并闭环。
- 代码层判定从 🔴 No-Go 提升为 🟢 **代码层 Production Ready**。
- 全部修复经**生产构建（BUILD_EXIT=0）+ standalone 真机路由矩阵**验证通过：旧路由 308、鉴权守卫 307、公开页 200、CSP nonce 零回归。
- 剩余阻塞项**全部在部署侧**（M4 迁移 apply + backfill + 全尺寸 UI 回归），归用户执行，非代码问题。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| Go / No-Go（代码层） | 🟢 Production Ready |
| Go / No-Go（整体上线） | 🟡 条件 Go —— 待用户完成部署侧迁移/回填/回归 |
| 审查发现处置 | 34 / 34（修复或结案），另 +2 新发现闭环 |
| 构建 / 类型 / Lint | BUILD_EXIT=0 · tsc 0 error · eslint 0 error（源码） |
| 真机验证 | standalone 路由矩阵全绿 + CSP nonce 无回归 |
| 剩余阻塞项 | 3 条，均在部署侧（见行动清单） |

---

## 1. 本轮（收口段）关键修复

### 🔧 路由与跳转体系（本段核心）
- **middleware → proxy 迁移（Next 16 约定）**：`src/middleware.ts` 删除，逻辑迁入 `src/proxy.ts`（导出 `proxy`）。真机确认 standalone 回写 `middleware.js`、`functions-config-manifest.json` 含 `/_middleware`、`ƒ Proxy (Middleware)` 正常注册。
- **#11 CSP nonce 白屏根治（真机复验）**：nonce 写入**请求头**使 Next 自注入脚本补 nonce。`/credits/studio` 实测：响应头 1 个 nonce 值、HTML 去重后仍 1 个、**0 个无 nonce 内联脚本**——生产 `strict-dynamic` 下白屏消除。
- **旧路由静态别名 → config redirects**：`/credits /creators /collections /tags` 由 `next.config.ts redirects()` 产出真 **308**；本轮补 `/register → /login?tab=register` 真 **307**。
- **鉴权守卫上提到 proxy 层**：`/profile /profile/edit /notifications` 由 proxy 拦成真 **307**（带正确 `callbackUrl`），不再先闪 1 秒空壳；页面内 `redirect` 保留作纵深防御；3xx 出口统一补齐安全头（HSTS 等）。

### 🎨 Archive 四页同源
- 根级 `src/app/loading.tsx`（首页专属骨架）收敛到 `src/app/(home)/` 路由组：新建 `(home)/page.tsx` + `(home)/loading.tsx`，根级不再有 loading/page。消除「非首页加载闪首页骨架」的同源违规。
- 补齐 `credits/studio` 与 `credits/creator` 缺失的 `loading.tsx`；抽出共享 `ArchiveHeroSkeleton`，四页骨架由**共享组件**保证同源（尺寸对齐真实 `ArchiveHero`：`h-12 w-fit` + 图标 `h-6 w-6 sm:h-7 sm:w-7`），修掉原手抄骨架的 CLS 隐患。

### 🔧 其它收口
- **#9 随机创作者 404**：旧实现取 VNDB 数字 id 跳无落地页；改为 `getRandomCreatorSlug()` 查本站库 → `/credits/creator/[slug]`，无数据降级跳随机游戏。
- **#17 健康检查窗口**：`start_period` 30s → 420s，覆盖迁移最坏耗时，避免首次部署被误判 unhealthy 回滚。
- **死代码清理**：`creator/[slug]` 未用的 `years/yearSpan`、`collection-showcase-card` 未用 `useState`、`hero-cover` 冗余注释；`.next_bak*` 加入 eslint ignore 并清理 3.1G 构建残留。

### 🔧 P2 健壮性三项闭环（#14 / #19 / #20）
- **#14 VNDB 角色侧 fallback（业务·🟡）**：`random-discover-btns.tsx` 的 `RandomCharacterBtn` 原仅在「VNDB 返回 null」时降级跳随机游戏，**VNDB 不可达抛错时只弹错误 toast、入口失效**。重构成 try/catch 后，「无结果 / 超时 / 抛错」三种路径统一走与「随机创作者」同构的降级（跳 `/api/games/random`）；并把 `vndb-client.ts` 的 `AbortSignal.timeout` 由 15000ms 缩到 8000ms，最坏等待从 ~30s 降到 ~18s。
- **#19 缓存防雪崩（性能/缓存·🟡）**：`redis.ts` 已具备进程内 single-flight（`inFlight` Map + `cached()` 复用 Promise）、TTL ±10% 抖动（`jitterTtl`）、`get` 失败限流 `logger.warn`（`warnCacheFailureThrottled`），reviewer 三项建议全部落地；空结果保持「`!== null` 判命中」——`null` 视为未命中会回源（避免瞬时失败被缓存成永久空），`[]`/`0` 等合法空值正常缓存，与防穿透目标一致。
- **#20 discover 连坐降级（性能/容错·🟡）**：`discover/page.tsx` 的 `getDiscoveryData` 已由 `Promise.all` 改为 `Promise.allSettled` + `settle()` 逐块兜底，年份 `$queryRaw` 聚合失败只让该板块缺席、不再整页清空；四块全空才返回 null 走空态（绝不注入假数据）。

### 🔍 澄清与结案（非 bug）
- **页面内 `redirect()` 降级根因证伪**：实测移除根级 loading 后 `/register` 仍为 200 + RSC 软跳转（`NEXT_REDIRECT;replace;/login?tab=register;307;`）——降级源于**流式 RSC 渲染本身**，与根级 loading / Suspense 边界**无关**。相关注释（`next.config.ts` / `proxy.ts` / `(home)/loading.tsx`）已全部更正。
- **#33 Dockerfile `COPY node_modules`**：`migrate-entrypoint.sh` 依赖 `./node_modules/.bin/prisma migrate deploy`（standalone 不含 CLI），是**功能性必需**，不可随手删；真要瘦身需拆独立 migrate 镜像（部署形态决策，归用户）。
- **#32 `.env.example`**：已含 `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` 及 sourcemap 变量，较完整。
- **#28**：`getCharacterDetail` 自动补 `c` 前缀，剥前缀数字 id 可正常查，结案为非问题。

---

## 2. 真机验证结果（standalone，DB 离线降级、绝不注入假数据）

| 类别 | 路由 | 期望 | 实测 |
|------|------|------|------|
| 静态旧别名 | /credits /creators /collections /tags | 308 | ✅ 308 |
| 便捷别名 | /register | 307 | ✅ 307 → /login?tab=register |
| 鉴权守卫 | /profile /profile/edit /notifications | 307 | ✅ 307（带 callbackUrl） |
| 管理后台 | /admin | 307 | ✅ 307 |
| 公开页 | / /credits/{studio,creator,collection,tag} /login | 200 | ✅ 200 |
| CSP nonce | /credits/studio | 1 值 / 0 裸脚本 | ✅ 1 / 0 |

> 动态旧详情（`/creators/[id]` 等需查库拿 slug）与 serialId 归一（`/games/[id]` `/user/[id]`）保留页面内 `redirect`（软跳转对「同资源归一 / 遗留详情」可接受，无法静态化进 config）。

---

## ✅ 行动清单

| # | 行动 | 负责方 | 紧急度 | 状态 |
|---|------|--------|--------|------|
| 1 | 应用 M4 迁移 `20260731041500_add_archive_slugs` + `20260731080000_add_tag_slug`（`migrate deploy`） | 用户（部署侧） | P0 | 待执行 |
| 2 | 执行 `db:backfill-slugs` 回填存量 Tag/Collection 的 slug | 用户（部署侧） | P0 | 待执行 |
| 3 | 部署后全尺寸 UI 回归（需真实种子数据 + 浏览器，本地不具备） | 用户 | P1 | 待执行 |
| 4 | 注入生产 env（`NEXTAUTH_SECRET` / `DATABASE_URL` / 可选 Sentry·R2·Redis） | 用户（部署侧） | P0 | 待执行 |
| 5 | （可选）若需镜像瘦身，将 Prisma migrate 拆为独立镜像，去掉 runner 的 `COPY node_modules` | 用户 | P2 | 决策项 |

---

## ⚠️ 待完善 / 已知局限
- **本地无法像素级 UI 回归**：无浏览器、无种子数据、迁移未 apply（本地 build 曾报 `CuratedCollection.slug does not exist`）。四页骨架同源已由**共享组件 + 结构核对**保证，但真实数据下的视觉回归须部署侧完成（用户 #23 明确要求）。
- **本地无法验证 3xx 的历史局限已解除**：本轮用 standalone 真机确认了 config/proxy 跳转是真 HTTP 3xx（此前 curl 测不出仅因页面内 redirect 的软跳转特性）。
- **动态旧详情/serialId 归一为软跳转**：属 Next 流式 RSC 的固有行为，对遗留详情/同资源归一影响可忽略；如需硬 3xx 需在 proxy 做 DB 查询，代价与收益不匹配，暂不做。

---

## 📚 产出索引
- 前序审查报告：`deliverables/gstack/pre-deployment-review-circleica-2026-07-31.md`（34 项发现原文）
- 本轮改动文件：`src/proxy.ts`（新）、`src/middleware.ts`（删）、`src/app/(home)/{page,loading}.tsx`、`src/app/credits/{studio,creator}/loading.tsx`、`src/components/archive/archive-hero-skeleton.tsx`（新）、`next.config.ts`、`docker-compose.yml`、`src/lib/creators.ts`、`src/app/api/creators/random/route.ts`、`src/components/random-discover-btns.tsx`、`src/lib/vndb-client.ts`、`eslint.config.mjs` 等
- 交接文档：`HANDOVER.md`

---

> 本报告由软件工坊 AI 协作生成，关键决策（尤其部署侧迁移/回填/env）请由工程负责人复核后执行。
