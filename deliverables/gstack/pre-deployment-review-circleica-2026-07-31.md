# Circleica Pre-Deployment Review 综合报告

**日期**：2026-07-31
**场景**：部署前全面审查（Pre-Deployment Review，20 维 / 15 项 / §6.5 模板）
**参与成员**：产品官（product-reviewer）· 安全卫士（security-officer）· 质量门神（qa-lead）· 设计顾问（designer）· 排障手（investigator）
**调度方式**：gstack 软件工坊团队（gstack-predeploy-review），五位成员并行只读审查，主理人汇编
**约束**：审查阶段只评不改（符合 HANDOVER §3 禁止边界）；所有修复建议待用户授权后由后续阶段执行，本报告不触部署

---

## 📌 TL;DR（执行摘要，3-5 行）

- **整体结论**：🔴 **No-Go（不通过）** —— 八个 P0 阻塞项横贯「构建 → 启动 → 数据闭坏 → 可观测性 → 可用性 → 无障碍 ×3」六条上线生命线，任一不修都上不了线。
- **阻塞项数量**：🔴 8 Critical（P0）＋ 🟠 5 High（P1）＋ 🟡 13 Medium（P2）＋ 🟢 8 Low（P3）＝ 34 条已确认发现（另 Low-6 待验证、designer m1~m6 合并计 1 Low）。
- **关键反转**：HANDOVER §7.4「类型检查 0 error」**已失效** —— qa-lead 实跑 `tsc` 现 3 个源码级 error，`next build` 在 Dockerfile 下**必失败**；多位成员交叉确认 M4 Tag.slug 闭环断裂（backfill 脚本从未落地）。
- **下一步**：先清 8 个 P0（多数 S/M 成本），再走 P1/P2；**部署侧（Coolify）必须实跑一次 `next build` + `migrate` + backfill** 验证，而非仅依赖本报告推断。

---

## 🎯 核心结论卡片

| 项目 | 内容 |
|------|------|
| **Go / No-Go** | 🔴 **No-Go** |
| **严重度分布** | 🔴 8 / 🟠 5 / 🟡 13 / 🟢 8（另 Low-6 待验证） |
| **关键行动项** | 8 条 P0（见行动清单） |
| **建议负责人** | 代码层修复：主理人（待用户授权，不代提交 git）；部署/迁移/回填/env/密钥/Docker 形态：用户 |
| **各维度子判定** | 产品 🟡 有条件通过 ｜ 安全 🟡 条件就绪 ｜ 质量 🔴 NOT Ready ｜ 设计 🟡 有条件通过 ｜ 排障 🔴 未通过 |

---

## 1. 各成员核心结论

### 🔍 产品官（功能完整性 / 路由SEO / 业务闭环 / API契约 / 死代码）
- **核心判断**：主站四大 Archive 页结构完整、主副站隔离无混淆，但**路由迁移有遗漏调用点**——首页「随机创作者」仍指向 M2 后已失效的 `/creators/[id]`（必 404），「随机角色」的 save 调用指向不存在接口且被 `.catch` 全吞；Collection 详情级缺 `error.tsx`（与交接文档「四页三态一致」不符）。
- **关键建议**：随机创作者链接改走新 slug 路由；删两处无效 save 调用；补 `credits/collection/[slug]/error.tsx` 与其他三页对齐。阻塞项：High-1、High-2。

### 🛡️ 安全卫士（OWASP Top10 + STRIDE）
- **核心判断**：鉴权主干扎实——51 个 admin 路由全 `requireAdminRole`、富文本经 DOMPurify 白名单、上传经 sharp 魔数校验、错误无堆栈泄漏、安全头齐全。但**生产 CSP nonce 两端不一致**会在 production 引发 hydration 白屏（dev 用 `unsafe-inline` 不可见），限流 IP 取自可伪造头、NEXTAUTH_SECRET 无持久化。
- **关键建议**：统一 middleware 与 theme-script 的 CSP nonce 通道；限流改为信任反代层真实 IP；部署强制注入持久 `NEXTAUTH_SECRET`。修复 F-01/F-02/F-03 后可 Go。

### ✅ 质量门神（tsc / eslint / build / Prisma迁移 / Docker / 上线清单）
- **核心判断**：**NOT Production Ready**。最重磅：**HANDOVER §7.4「类型检查 0 error」已失效**——实跑 `tsc` 现 3 个源码级 error（`error.tsx` 把 `reset` 改名 `_reset` 致 `TS2339`），`ignoreBuildErrors:false` + Dockerfile `next build` → 镜像构建必失败；Tag backfill 脚本从未落地（M4 闭环断）；`env.ts` 对空串不容错（容器启动即退）；另 NODE_OPTIONS 512MB×1MB header 乘法 OOM 路径、缺 `.env.example` 放大上线摩擦。
- **关键建议**：恢复 `reset` 命名；落地 `scripts/backfill-tag-slug.ts` 并回填；env schema 可选 URL 改容错空串；`docker-entrypoint.sh` header size 降到 64KB、堆上限按规格重估。阻塞项：#1（构建）、#2（数据）、#3（启动）。

### 🎨 设计顾问（Archive DS 同源 / 响应式 / 反 slop / a11y）
- **核心判断**：🟡 有条件通过（修订版）。四 Archive 页骨架同源、ArchiveHero 单一页头收敛良好、反 slop 达标。但有**三条 WCAG 硬伤**：排行榜奖章对比度约 1.9:1（C1）、SkeletonGrid 密度未透传致加载栅格跳动 CLS（C2，违背组件自身「防跳动」契约）、全局焦点环亮色仅 1.43:1（C3，原 m5 结案升 Critical，影响全站每个可聚焦元素）。另有多处「逐行同源」实际分叉（Studio 缺 state、Collection 空态 hero 槽位错、density 死 token）与 `@layer base` 焦点环死代码（M6）。
- **关键建议**：修 C1+C2+C3 三条 Critical 与 M1/M2/M4/M5/M6；M3（density 职责边界）需主理人先拍板，不阻断。修完八项可判 Production Ready。

### 🔧 排障手（性能 / 可观测性 / 可用性 / 缓存 / 部署风险）
- **核心判断**：🔴 未通过。两个 Critical 是**最高可用性风险**：**Sentry 生产全盲**（客户端 DSN 非 NEXT_PUBLIC、缺 `instrumentation.ts`、`silent:true` 吞告警 → 线上零可观测）+ **Prisma 离线降级粘滞**（一次抖动后置 mock 永不复位 → 空站数小时无人知，叠加 D-01 即「空站数小时零告警」）。另 `/credits/studio` 重查询执行两遍。数据访问层本身克制（批量查 + select 白名单 + 索引齐备），风险集中在**失效路径**。
- **关键建议**：DSN 改 `NEXT_PUBLIC_SENTRY_DSN` + 新建 `instrumentation.ts`（⚠️ 前置依赖 qa #3 先修）；Prisma 加时间窗半开重试 + 置位上报。阻塞项：D-01、D-02。

> 全部 5 位均上场，未上场成员不列。

---

## 2. 综合审查发现（去重合并后按严重度排序）

> 说明：investigator D-04 经交叉核对**位置有误且已并入 qa #7**，本表撤销 D-04；`export default configPromise` 经 qa-lead 证伪为**非问题**，不列入；security F-03 与 qa #4 同域合并为一行（均属 Medium）；designer m1~m6 合并为 LOW-8 一行（含明细）；designer m5 结案升 Critical（C3），并新增 M6。

### 🔴 Critical（P0，部署前必修）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 1 | 🔴 | 构建 | `src/app/credits/{tag/[slug],tag,collection}/error.tsx:7` | `reset` 解构改名 `_reset` 致 `TS2339`；`ignoreBuildErrors:false` + Dockerfile `next build` → 镜像构建必失败 | 恢复 `reset` 命名（或保持但同步 error boundary 类型） | 质量门神 |
| 2 | 🔴 | 数据闭环 | `scripts/backfill-tag-slug.ts`（缺失） | M4 迁移加了 `Tag.slug` 列（必填唯一）但回填脚本从未落地 → 存量 slug 全 NULL，`/credits/tag/[slug]` 端到端跑不通（catch→notFound） | 按 HANDOVER §4 落地 backfill 脚本并在部署侧执行回填 | 质量门神 |
| 3 | 🔴 | 部署/启动 | `src/lib/env.ts:25-45` | 空字符串不容错；compose `${VAR:-}` 注入空串使 `.url()` 校验失败 → 生产 `process.exit(1)` 启动即退（SENTRY/UPSTASH 留空合理却起不来） | 可选 URL 改 `z.string().url().optional()` 并对空串归一为 undefined（范式见 `env.ts:38`） | 质量门神 |
| 4 | 🔴 | 可观测 | `sentry.client.config.ts:4` / 缺 `instrumentation.ts` / `next.config.ts:78` | 客户端 DSN 用 `process.env.SENTRY_DSN`（非 NEXT_PUBLIC）→ 浏览器求值 undefined 静默禁用；缺根 `instrumentation.ts` → 服务端 SDK 从未 init、缺 `onRequestError`；`silent:true` 吞构建告警 → 线上零可观测 | DSN 改 `NEXT_PUBLIC_SENTRY_DSN` + 新建 `instrumentation.ts`（⚠️ **前置：必须先修 #3**，否则新加 optional url 变量会触发同款 `process.exit(1)`） | 排障手 |
| 5 | 🔴 | 可用性 | `src/lib/prisma.ts:68,118-127` | 一次连接抖动后置 `enabled.mock=true`，无 TTL/无半开探活/无复位 → 全站永久返回空、自愈不了；降级返回空结果而非抛错 → 监控无感，叠加 #4 即「空站数小时无人知」 | 加时间窗（如 30s）半开重试 + 置位上报 Sentry | 排障手 |
| 6 | 🔴 | 无障碍 | `src/app/ranking/page.tsx:137-141` | MEDALS 金 `bg-amber-400 text-white` 对比度约 1.9:1（远低于 WCAG AA 4.5:1）；名次数字是核心信息，弱光/色觉障碍不可读 | 金改深色字（如 `text-amber-950`）或改设计 token 高对比对（⚠️ 确认深色模式） | 设计顾问 |
| 7 | 🔴 | 布局/CLS | `archive-placeholder.tsx:44` / `skeleton-grid.tsx:40` | loading 态 `SkeletonGrid` 未传 `density` 落默认 standard；页面算出的 compact/dense 断链 → 加载前后栅格重排（CLS），违背组件自身「防跳动」契约 | `ArchivePlaceholder` 增 `loadingDensity` prop 透传，四页补传 | 设计顾问 |
| 8 | 🔴 | 无障碍 | `globals.css:942-953` / `:503-510` | 全局焦点环 `outline:2px solid rgba(var(--theme-r/g/b),0.4)`；亮色 `--background #fafafa` 下合成对比度仅 **1.43:1**，暗色 2.02:1，全模式低于 WCAG 2.4.7/1.4.11 的 3:1；根因 `.light` 把 `--theme-r/g/b` 原样复制暗色值、浅 teal 近白融为一体（仅 `.light .galvelica-root` 降过值，主站漏） | ① 去 alpha 用实色（暗色达 7.24:1）；② 亮色 `.light` 的 `--theme-r/g/b` 降为 `63,142,134`（复用 galvelica 值 → 3.71:1）；两步必须同时做。并清 `@layer base` 死规则（M6） | 设计顾问 |

### 🟠 High（P1）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 9 | 🟠 | 路由 | `src/components/random-discover-btns.tsx:31` | 随机创作者 → `/creators/[id]` 必 404（M2 后只按主站 cuid 查，上游传剥前缀 VNDB 数字 id 查不到） | 链接改 `/credits/creator/[slug]` 或按 slug 查 | 产品官 |
| 10 | 🟠 | 业务闭环 | `/api/characters/save`（不存在） | 两处 save 调用指向不存在接口且 `.catch(()=>{})` 全吞错 → 业务闭环断裂无告警 | 删两处无效 save 调用 | 产品官 |
| 11 | 🟠 | 安全 | `src/middleware.ts:100` / `src/components/theme-script.tsx:11` | CSP nonce 响应头 vs 请求头两端不一致 → 生产 hydration 失败/白屏（dev 用 `unsafe-inline` 不可见） | 统一 nonce 生成与注入通道（`NextResponse.next({request:{headers}})` 回写请求头） | 安全卫士 |
| 12 | 🟠 | 安全/部署 | `docker-entrypoint.sh:26-36`（=qa #4 同域） | `NEXTAUTH_SECRET` 缺失时 `openssl rand` 自动生成写 `/app/.secret`（可写层）→ 多副本/重建会话失效、非安全存储 | 部署强制注入持久 `NEXTAUTH_SECRET`（≥32 随机字符，外部密钥管理/持久卷） | 安全卫士 + 质量门神 |
| 13 | 🟠 | 性能 | `src/app/credits/studio/page.tsx:29` / `studio-archive-client.tsx:16,52` | 服务端只取 `res.total` 一个数字却拉 1000 条聚合，client 再 `useEffect` 拉一遍全丢；无 revalidate，每次访问双全量 | 服务端换 `count` + 首屏数据下发为 initial props | 排障手 |

### 🟡 Medium（P2）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 14 | 🟡 | 业务 | `src/lib/vndb-client.ts:26-59` / `random-discover-btns.tsx:84-86` | 首页强依赖 VNDB 境外直连，角色侧无 fallback（最长干等 30s ×2 重试） | 角色侧补与 creator 同构 fallback + 缩短 timeout | 产品官 |
| 15 | 🟡 | 路由一致性 | `src/app/credits/collection/[slug]/` | 缺详情级 `error.tsx`（P2-8 只补列表级），与 studio/creator/tag 三页不一致；交接文档据列表级写下「四页三态一致」失真 | 照抄 `credits/tag/[slug]/error.tsx` 新增 | 产品官 |
| 16 | 🟡 | 安全 | `src/lib/rate-limit.ts:108-122` | 限流 IP 取自可伪造头 `cf-connecting-ip`/`x-real-ip`/`x-forwarded-for` 最右段 | 仅当 remote addr 属已知代理网段时采信；nginx/CF 先 reset 再写入 | 安全卫士 |
| 17 | 🟡 | 部署 | `docker-compose*.yml` healthcheck | `start_period:30s` 窄于迁移最坏 366s → 误判 unhealthy 回滚 | 调到 ≥400s 或迁移与启动分离 | 质量门神 |
| 18 | 🟡 | 部署 | `docker-entrypoint.sh:92`（Dockerfile:134 为死声明） | `NODE_OPTIONS="--max-old-space-size=512 --max-http-header-size=1048576"`：紧堆上限 × 1MB header buffer 乘法放大器，小内存实例 OOM 路径（原 investigator D-04 并入） | header size 降到 64KB；堆上限按实例规格重估（1G 给 768）；删 Dockerfile:134 重复声明（⚠️ 需用户确认部署形态） | 质量门神 |
| 19 | 🟡 | 性能/缓存 | `src/lib/redis.ts:279-290,48-58` / `tags-browser.ts:16,18-22,43` | 无 single-flight（key 过期瞬间穿透 DB）；TTL 固定 300s 无抖动（重启后同步雪崩）；Redis 异常 `catch{return null}` 静默回源无告警；`!==null` 判命中使空结果无法缓存（穿透） | 加进程内 in-flight 去重 + TTL ±10% 抖动；`get` catch 补 `logger.warn` | 排障手 |
| 20 | 🟡 | 性能/容错 | `src/app/discover/page.tsx:43-77,85-88` / `src/lib/prisma.ts:146-161` | 四查询同处 `Promise.all`，`$queryRaw` 年份聚合一失败即整页 catch→null 连坐清空；`revalidate=120` 把空页固化 2 分钟 | `Promise.all` 改 `Promise.allSettled`，四板块逐块独立降级 | 排障手 |
| 21 | 🟡 | 设计同源 | `src/app/credits/studio/page.tsx:34` | 只算 `computeDensity` 未算 `computeArchiveState`，`data-archive-state` 缺失，四页不一致 | 补 `const state = computeArchiveState(total)` 并透传 | 设计顾问 |
| 22 | 🟡 | 设计同源 | `src/app/credits/collection/page.tsx:71-84` | 空态把 ArchiveHero 当 children 塞入 ArchiveShell，常态走 `header` 槽 → 两态 hero 落不同 div，`space-y-6` 间距不一致 | 空态改 `header={<ArchiveHero …/>}` | 设计顾问 |
| 23 | 🟡 | 设计同源 | `collection/page.tsx:67,122` / `tag/page.tsx:60,118` | density 注入 Shell 但网格列数硬编码不读 `DENSITY_GRID` → 四页密度行为实际不同源 | ⚠️ 需用户拍板——改用 DENSITY_GRID，或注释澄清两页不受密度驱动 | 设计顾问 |
| 24 | 🟡 | 无障碍 | `src/components/breadcrumb.tsx:206,281` | 末项 `<span>` 缺 `aria-current="page"` → 读屏无法识别当前页节点 | 末项加 `aria-current="page"` | 设计顾问 |
| 25 | 🟡 | 无障碍 | `src/app/ranking/page.tsx:254` | 名次序号 `text-muted-foreground/40` 约 2.2:1，第 4 名起近不可读 | 提至 `/60`–`/70` | 设计顾问 |
| 26 | 🟡 | 设计体系 | `globals.css:522-537` vs `:941-953` | `@layer base` 内 `a:focus-visible{ring-2 ring-primary}` 被顶层裸规则 `box-shadow:none` 级联压死，是死代码；团队误以为焦点环是 ring 规范 | 删 L522-537 死代码，或移除 L945 `box-shadow:none` 让 ring 复活（若复活 ring-primary 也需按 #8 校验对比度） | 设计顾问 |

### 🟢 Low（P3）

| # | 严重度 | 类别 | 位置 | 问题描述 | 建议 | 来源成员 |
|---|--------|------|------|---------|------|---------|
| 27 | 🟢 | 死代码 | `/collections/loading.tsx` ×2 | P2-8 只清了 /tags，/collections 下 2 个遗留 loading.tsx 死代码 | 删除（确认无引用后） | 产品官 |
| 28 | 🟢(待验证) | 路由 | `/characters/[id]` / `src/lib/vndb.ts` | 传剥前缀数字 id 也可能 404，与 #9 同源；若成立应升 High | 补验 `getCharacterDetail` 的 id 处理再定级 | 产品官 |
| 29 | 🟢 | 安全 | `/admin` 中间件 `src/middleware.ts:62-69` | 陈旧 JWT role 校验（页面外壳，API 层实时查库无越权） | 收敛：中间件查库或缩短 JWT maxAge | 安全卫士 |
| 30 | 🟢 | 安全 | `next.config.ts:37` | `dangerouslyAllowSVG:true` 开放 SVG 优化 | 关闭或仅对自有可信域放行 | 安全卫士 |
| 31 | 🟢 | 安全 | `/api/translate/route.ts:48-50` | 匿名可调用转发第三方翻译，结合 #16 可放大配额滥用 | 要求登录或更强限流 | 安全卫士 |
| 32 | 🟢 | 部署 | 仓库根（无 `.env.example`） | 21+ 环境变量无权威清单，放大 #3 与 #12 的上线摩擦（注：排障手复核称 `.env.example` 存在但 SENTRY_* 全注释且缺 `NEXT_PUBLIC_SENTRY_DSN`，口径以「清单不完整、未标必需/可选」为准） | 补/修 `.env.example`，标注必需/可选 + 空串语义注释 | 质量门神 + 排障手 |
| 33 | 🟢 | 部署 | `Dockerfile` runner 阶段 | COPY 全量 node_modules 抵消 standalone 瘦身 | 仅 COPY standalone 输出（⚠️ 需用户确认部署形态） | 质量门神 |
| 34 | 🟢 | 设计 Minor | `archive-hero.tsx` / `archive-placeholder.tsx` / `discover/page.tsx` | m1 间距基数混用；m2 注释误导（主标题未放大）；m3 历史覆盖残留 `rounded-none bg-transparent shadow-none ring-0`；m4 装饰图标未 `aria-hidden`、error 未 `role="alert"`；m6 discover `space-y-8` 节奏不统一 | 逐项清理 | 设计顾问 |

---

## ✅ 行动清单（P0 必清，建议部署前全修）

| # | 行动 | 负责方 | 紧急度 | 期望完成 |
|---|------|--------|--------|---------|
| 1 | 恢复 `error.tsx` 的 `reset` 命名，过 `tsc` 确保 `next build` 不失败 | 主理人（代码） | **P0** | 部署前 |
| 2 | 落地 `scripts/backfill-tag-slug.ts` 并在部署环境执行回填（解 M4 闭环） | 用户（部署侧） | **P0** | 部署前 |
| 3 | `env.ts` 可选 URL 改容错空串，避免容器启动即退 | 主理人（代码） | **P0** | 部署前 |
| 4 | Sentry：DSN 改 `NEXT_PUBLIC_SENTRY_DSN` + 新建 `instrumentation.ts`（**前置：#3 先修**） | 主理人（代码） | **P0** | 部署前 |
| 5 | Prisma 离线降级加时间窗半开重试 + 置位上报 | 主理人（代码） | **P0** | 部署前 |
| 6 | 无障碍三项：ranking 奖章对比度（#6）、SkeletonGrid 透传 density（#7）、全局焦点环实色 + 亮色降 `--theme-r/g-b`（#8，含清 #26 死代码） | 主理人（代码） | **P0** | 部署前 |
| 7 | 随机创作者链接改 slug 路由 + 删两处无效 save 调用（#9/#10） | 主理人（代码） | **P1** | 部署前 |
| 8 | 统一 CSP nonce 通道（#11）；限流改真实 IP（#16）；强制持久 NEXTAUTH_SECRET（#12） | 主理人+用户 | **P1** | 部署前 |
| 9 | `/credits/studio` 重查询改 count + initial props（#13） | 主理人（代码） | **P1** | 部署前 |
| 10 | designer M1/M2/M4/M5 同源与 a11y 回归（#21/#22/#24/#25）；M3（#23）先拍板密度职责边界 | 主理人（代码） | **P2** | 部署前 |
| 11 | 补/修 `.env.example`、调 healthcheck、清 Dockerfile NODE_OPTIONS 放大（#32、#17、#18、#33） | 用户+主理人 | **P2** | 部署前 |
| 12 | 死代码清理 + 路由核实（#28）+ 安全 Low 项（#29/#30/#31）+ 缓存/雪崩（#19/#20） | 主理人（代码） | **P3** | 上线后 Sprint 1 |

---

## ⚠️ 阻塞项清单（Go/No-Go 决策依据）

- **#1** 构建必失败 → 镜像出不来
- **#2** Tag slug 无回填 → M4 数据闭环断（部署侧动作）
- **#3** 空串 env → 容器启动即退
- **#4** Sentry 全盲（前置 #3）
- **#5** Prisma 粘滞 → 空站不可自愈
- **#6/#7/#8** 三条 WCAG 硬伤（奖章 / CLS / 全站焦点环）

## ⚠️ 回滚预案（部署前确认）

1. **代码回滚**：Coolify 保留上一成功镜像，部署失败自动回滚到上一个 running 容器；git 不在此阶段操作（遵循用户铁律）。
2. **DB 回滚**：M4 迁移 `20260731080000_add_tag_slug` 为**纯加列 + 唯一索引**，无破坏性；若回填出错，先 `DROP INDEX` 该唯一索引再 `SET slug=NULL` 即可降级（HANDOVER §4 已给步骤）。`20260731041500_add_archive_slugs`（CuratedCollection）同理。
3. **配置回滚**：env / NODE_OPTIONS / healthcheck 改动仅改 compose 与 entrypoint，回退即还原文件，无数据风险。
4. **观测兜底**：#4 修复前，上线问题只能靠用户反馈；建议先在 **非生产域名 / 影子实例** 跑一轮真实流量验证，确认无 #1~#5 再切主流量。

---

## ⚠️ 待完善 / 已知局限

- **redirect/permanentRedirect 本地不可验证**：所有 308 跳转在 `next dev`/`next start` 下 curl 均未见 3xx（含既有页面），根因暂不确定，以 Coolify（standalone server.js）实际行为为准；写法保持 308 不降级。
- **本地 DB 缺列**：Studio/Creator 已回填；但 `CuratedCollection.slug` / `Tag.slug` 列在本地库缺失 → M3/M4 详情端到端本地跑不通，需部署侧应用迁移 + 回填。
- **`next build` 未实跑**：受 WorkBuddy safe-delete 守卫中断（删 ≥50 文件即中止，Coolify 无此守卫）。qa-lead 用 `tsc` 推断 #1 构建失败；**强烈建议 Coolify 实际跑一次 `next build` 确认**。
- **设计维度未实跑浏览器测量**：a11y 对比度基于源码色值推算；#8 已由 qa-lead 代查 `globals.css` 四个作用域定义点确认亮色 `--theme-r/g/b` 未降值（m5 结案）。
- **本次审查全程只读**：未改任何项目文件、未碰 git/Docker/Coolify/DB/env；所有修复待用户授权后由后续阶段执行。
- **#28 未定级**：`/characters/[id]` 是否同源 404 待补验 `src/lib/vndb.ts`。

---

## 📚 成员产出索引

- gstack-product-reviewer（产品官）原始产出：功能/路由/业务闭环 6 项（High-1/2、Medium-3/4、Low-5/6），子判定 🟡 有条件通过
- gstack-security-officer（安全卫士）原始产出：OWASP+STRIDE F-01~F-06 + 大量正向确认（认证/越权/XSS/上传/密钥/错误/安全头均达标），子判定 🟡 条件就绪
- gstack-qa-lead（质量门神）原始产出：构建/迁移/Docker 报告（#1 Critical + #2/#3 High + #4/#5/#7 Medium + #6/#8 Low）+ 补遗（#7 NODE_OPTIONS、#8 .env.example、D-04 并入澄清、configPromise 证伪），子判定 🔴 NOT Ready
- gstack-designer（设计顾问）原始产出：Archive DS 同源 / 反 slop / a11y 报告（C1/C2/C3 Critical + M1~M6 Major + m1~m6 Minor，含 m5 结案升 C3、新增 M6 `@layer base` 死代码），子判定 🟡 有条件通过
- gstack-investigator（排障手）原始产出：性能/可观测/可用性 报告（D-01/D-02 Critical + D-03 High + D-05/D-06 Medium；D-04 撤销并入 qa #7），子判定 🔴 未通过

---

> 本报告由 GStack 软件工坊 AI 协作生成。Pre-Deployment Review 属「只检查不部署」阶段，关键决策与部署动作（迁移/回填/env/密钥/Docker 形态）请由工程负责人复核并在部署环境执行。
