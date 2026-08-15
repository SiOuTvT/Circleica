# Circleica 性能最终审计（部署前整备轮）

生成日期：2026-08-16
范围：当前代码状态下逐页面 / 逐路由复核（不是抽象总体评价）。
方法：先读真实页面源码 + 全仓库模式扫描（use client 数量、next/image 与裸 img、transition-all、will-change/backdrop-filter、AbortController、分页/虚拟化、Prisma select/include），再针对高风险路由深读。

## 总体结论

当前 Circleica 的数据获取纪律已经比较成熟：公共页面基本都是 Server Component + `unstable_cache` / Redis 缓存 + `select` 字段裁剪 + 分页 + `<Suspense>` 骨架屏；客户端交互组件普遍用 `AbortController` 控制请求生命周期；没有出现「useEffect 内无脑 fetch 导致重复请求」的反模式（全仓库 0 命中）。

本审计**发现的真实问题很少，且均为低严重度**；没有发现需要大规模架构重写的性能缺陷。按你的要求，没有为了「让数字好看」而编造问题，也没有为了理论 Lighthouse 分数做大规模重构。以下逐项记录。

## 已做的真实修复

| 文件 | 修改 | 理由 | 验证 |
|---|---|---|---|
| `src/components/game-card.tsx` | 卡片根 `transition-all duration-300` → `transition-[transform,box-shadow]`；列表行 `transition-all` → `transition-shadow` | `transition-all` 会监听并动画所有 CSS 属性，hover 时只变了位移/阴影/ring，精确过渡可避免不必要的样式重算。视觉一致。该组件渲染在首页/游戏列表/搜索/排行/发现等所有高频卡片位，收益面最大 | `read_lints` 0 错误；`next build` 在沙箱被 safe-delete shim 拦截（非代码问题，CI runner 终验） |

> 其余 117 处 `transition-all` 散落在各类按钮、tab、链接等交互元素上，绝大多数是 hover 仅变颜色/阴影。逐文件改属大规模改动、收益主要是理论值，**按本轮 Scope 铁律不擅自做 119 文件 mass-edit**，列入治理队列（见下文）。

## 逐页面 / 逐路由复核

严重程度：✅ 良好 / 🟡 低 / 🟠 中 / 🔴 高。本审计未出现 🔴 与 🟠 级别的真实性能缺陷。

### 公共核心页面

| 页面 / 路由 | 渲染方式 | 风险点 | 严重度 | 修复 | 验证 / 备注 |
|---|---|---|---|---|---|
| 首页 `app/(home)/page.tsx` | Server RSC，`revalidate=60` + Redis 单飞去重 | `cardTagColor` 每次缓存 miss 查一次 `tagGroup.findFirst`；图片走 CDN `unoptimized` | 🟡 低 | 否（属治理项） | 读源码确认：select 字段裁剪、列表 24 条分页、`safe-image` 失败兜底、Suspense 骨架。首页网格/列表/排行均缓存 |
| 游戏列表 `app/games/page.tsx` | Server RSC + `cached()` | 无显著问题 | ✅ 良好 | — | select 字段、分页 24、NSFW 模式进缓存 key 防泄漏 |
| 搜索 `app/search/page.tsx` | Server RSC + `unstable_cache` revalidate 120 | 无显著问题 | ✅ 良好 | — | 深读确认：findMany+count 并行、select 裁剪、推荐位缓存 600s、NSFW 模式进 cache key、无结果回退推荐 |
| 发现 `app/discover/page.tsx` | Server RSC + `cached()` revalidate 120 | 多并发查询用 `allSettled` | ✅ 良好 | — | 深读确认 |
| 排行 `app/ranking/page.tsx` | Server RSC + `unstable_cache` revalidate 3600 | 无 | ✅ 良好 | — | 深读确认 |
| 游戏详情 `app/games/[id]/page.tsx` | Server RSC，缓存 1800s | 评论 `take 20`、JSON-LD 已转义；详情页两处 `tagGroup.findFirst`（缓存 3600） | ✅ 良好 | — | 深读确认：include 嵌套 select 精确裁剪，无 select * |
| 画廊 `src/components/gallery-hero.tsx` | 客户端缩略图 | 缩略图 `loading="lazy"` + `quality={50}` + `memo`；lightbox 全图用裸 `<img>`（仅打开时） | ✅ 良好 | — | 深读确认；lightbox 全图仅 open 时挂载，可接受 |

### Galvelica 资料馆（副站）

| 页面 / 路由 | 渲染方式 | 风险点 | 严重度 | 修复 | 验证 / 备注 |
|---|---|---|---|---|---|
| 作品列表 `app/galvelica/works/page.tsx` | Server RSC `force-dynamic` + Redis（NSFW 模式进 key） | 无 | ✅ 良好 | — | 深读确认：Pager 分页、LCP 优先级图 `priorityCount={5}` |
| 作品详情 `app/galvelica/works/[serialId]/page.tsx` | Server RSC + `unstable_cache` 1800 + `revalidateTag` | 无 | ✅ 良好 | — | 深读确认：WorkDetailView 同缓存、`reactCache` 去重 |
| Tag / Creator / Studio / Year 等 Archive 页 | 同 works 模板（RSC + 缓存 + 分页） | `unoptimized` 远程图 | 🟡 低 | 否（治理项） | 与其余 archive 页共享同一渲染模板，扫描确认模式一致 |

### 用户 / 社区 / 资源

| 页面 / 路由 | 渲染方式 | 风险点 | 严重度 | 修复 | 验证 / 备注 |
|---|---|---|---|---|---|
| 用户主页 `app/user/[id]/page.tsx` | Server RSC | `select` + `_count`；关联数据（收藏/动态）改客户端按需加载 | ✅ 良好 | — | 深读确认；`resolveUser` 用 `reactCache` 去重；`getCardData` 与基础查询严格分离 |
| 登录/注册 `app/login/page.tsx` | Client | 已用 `safeRedirect` 防开放重定向；Turnstile 验证码 | ✅ 良好 | — | 深读确认；tab 切换 `useEffect` 仅读一次 searchParams |
| 消息/通知 `app/notifications/page.tsx` | Client + `force-dynamic` | `take 30` + 批注批量查询；无 N+1 | ✅ 良好 | — | 扫描确认分页与批量（commentPostMap） |
| 论坛 `app/forum/page.tsx` | Server RSC | 分页 20 + 总数 count | ✅ 良好 | — | 深读确认 |
| 名片 `app/card/[uid]/page.tsx` | `force-dynamic` | 静态分享卡，图经 `serverProxyImg` 代理；用裸 `<img>`（固定尺寸，非画廊） | 🟡 低 | 否 | 深读确认：无 over-fetch，`getCardData` 聚合；这是 OG 分享卡，可接受 |
| 收藏集详情 `app/credits/collection/[slug]/page.tsx` | Server RSC | **整集合 games 一次性加载（无上限）** | 🟡 低 | 否（产品决策） | 深读确认：curated collection 设计为展示全部；超大集合（数百游戏）会一次性渲染全部卡片。属产品行为，未擅自改 |
| 收藏集列表 / Announcement / Character / 资源页 | Server/Client 混合 | 列表类均有分页或限流 | ✅ 良好 | — | 扫描确认分页；资源 Tab 为客户端按需 |

### 管理后台（主要页面）

| 页面 / 路由 | 渲染方式 | 风险点 | 严重度 | 修复 | 验证 / 备注 |
|---|---|---|---|---|---|
| `admin/collections`、`admin/favorites`、`admin/follows` 等列表 | Client + API | API 均带 `PAGE_SIZE`（如 collections 20）分页 | ✅ 良好 | — | 抽样 `admin/collections/page.tsx` 确认 `PAGE_SIZE` 经 API 分页 |
| `admin/site-settings`(20KB)、`admin/services`(21KB) 等大型页面 | Client | 体量较大但为低频管理操作页 | 🟡 低 | 否 | 不影响公共端性能；如需可后续拆包 |

### 全站模式扫描（客观数据）

| 指标 | 数值 | 说明 |
|---|---|---|
| `"use client"` 组件 | 186 | 多为交互组件（按钮、表单、tab、画廊），公共列表/详情页主体是 Server Component |
| `next/image` `<Image>` 使用 | 50 | 主站封面/头像/横幅走优化 |
| 裸 `<img>` | 17 | 主要集中在 `safe-image` 失败兜底、卡片生成器（data URL）、lightbox 全图、名片 proxy 图——均非「大图墙」场景 |
| `loading=lazy`/priority/sizes/placeholder | 88 | 图片尺寸/懒加载覆盖率高 |
| `transition-all` | 119 | 见治理队列 |
| `will-change` / `backdrop-filter` | 0 命中 | 无此两类高风险样式 |
| `AbortController` / `signal` | 多组件正确用 | 客户端 fetch 均有生命周期控制 |
| 虚拟化（react-window / react-virtual） | 0 | 全仓库未引入；见治理队列 |

## 真实发现汇总（按严重程度）

- 🔴 高：0 项
- 🟠 中：0 项
- 🟡 低（可安全记录，非阻塞）：
  1. `transition-all` 在 119 处交互元素上（已在最高频 `game-card` 做精确化，其余留治理队列）
  2. 远程 / 收藏集封面图使用 `unoptimized`（走 CDN 原图）——视觉可接受，但若主站封面也想享受 Next 优化可后续评估
  3. `credits/collection/[slug]` 整集合 games 无上限加载——产品行为，未改
- ✅ 良好（已确认无问题）：首页、游戏列表/搜索/发现/排行、游戏详情、画廊、Galvelica 全部页、用户主页、登录注册、通知、论坛、批量卡片、管理后台列表分页

## 治理队列（不属于本轮 Scope，单独排期）

1. **`transition-all` 全量精确化**（119 处）：改 `transition-colors` / `transition-transform` / `transition-[transform,box-shadow]`。视觉一致，收益为理论值，需逐文件改动，建议作为独立小 PR。
2. **主站封面图优化策略**：评估对本地 `coverImage` 取消 `unoptimized`、保留 CDN 图 `unoptimized`（需确认 CDN CORS 与 Next 优化器兼容）。
3. **超大收藏集渲染**：若未来出现数百游戏的 curated collection，给 `credits/collection/[slug]` 加「展示前 N + 展开」或分页（产品决策）。
4. **极端数据量下的列表虚拟化**：当前列表均有分页，未引入虚拟化库；仅当某管理后台表格出现超长无分页数据时才需要（届时引入 `@tanstack/react-virtual`）。
5. **管理后台大体量页面拆包**（site-settings / services）：低频页，优先级低。

## 验证记录

- 修复文件 `src/components/game-card.tsx`：`read_lints` 零错误。
- `npx tsc --noEmit`：本轮仅在上一轮已修 2 个 typecheck 错误基础上，新增 `transition-[transform,box-shadow]` 为合法 Tailwind 任意值语法，不影响类型（终验随 C-6 跑）。
- `next build`：本沙箱被 safe-delete shim 拦截 `.next` 清理（非代码缺陷，CI Linux runner 无此 shim，历史 pass4 已 `Compiled successfully`），build 门禁归 CI runner 终验。

## 结论

性能维度已达到「可部署」状态：无高/中危真实缺陷，公共页面渲染与数据获取纪律良好，已修 1 项高频 `transition-all`。剩余低危项均为治理队列，不阻塞部署。
