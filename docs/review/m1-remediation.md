# M1 Production 整改报告

> 依据 `docs/review/m1-production-review.md`，逐条核实代码后修复。
> 红线：继续遵守 Archive Design System v1（Studio ≠ Game Detail / Framework 与 Design Language 分层 / ArchiveShell 不做业务 / 不扩张阶段范围 / 不碰 API·Schema·架构层）。

## ① 已修复的问题（对应 C/I/S 编号）

### 🔴 P0
- **C1 · 封面加载失败无兜底**：`entity-card.tsx` 的 `CoverMedia` 与 `archive-hero.tsx` 的 `HeroCover` 的 `<Image>` 缺 `onError`。外链封面 404 会显示破碎图。已加 `useState(errored)` + `onError`，失败降级为渐变首字占位（与 `GameCard` 同思路）。两个文件加 `"use client"`。

### 🟠 P1
- **I1 · EntityCard 死分支**：`creator`/`collection` 变体在 M1 完全未被使用（死抽象，且与详情页创作者卡视觉不一致，抵触「不预埋半成品」）。已收窄 EntityCard 为仅 `studio` 变体，删两处死分支与本地 `ROLE_LABELS`；保留 `CreatorCardData`/`CollectionCardData` 数据契约接口供后续页面。
- **I2 · ROLE_LABELS 重复**：抽 `src/lib/role-labels.ts`（`ROLE_LABELS` + `roleLabel`），详情页改为 import，消除双份定义。
- **I3 · 类型重复声明**：`studio-archive-client.tsx` 删除本地 `MakerSummary`/`MakerListResult`，改从 `@/lib/makers` 导入。
- **I4 + S3 · 密度映射复制 3 处**：抽 `DENSITY_GRID` 到 `density.ts`，`skeleton-grid` / 列表 / 详情(GameCard 网格) 三处统一复用；详情移动端 compact 由 2 列→1 列与列表一致。
- **I5 · 1000 上限静默截断**：列表 `total > makers.length` 时渲染「当前展示前 N 个（共 M 个）」提示，不再静默丢数据。
- **I6 · 详情缺错误/加载边界**：`src/app/credits/studio/[name]/` 补 `error.tsx`（client，重试 + 返回图鉴）与 `loading.tsx`（骨架屏）。均为新增文件，不触碰现有逻辑。
- **I7 · `--archive-density` 死令牌**：`ArchiveShell` 删除无 CSS 消费的 `--archive-density` 内联注入，保留 `data-density` 属性（供 CSS/QA 钩子），注释改为说明 JS 层 `DENSITY_GRID` 驱动。

### 🟡 P2（仅低风险建议）
- **S1 · AZIndex scroll-spy**：`AZIndex` 接入 `active` prop，列表页加轻量 `IntersectionObserver` 高亮当前可见首字分区（带 disconnect 清理）。
- **S4 · Hero 标题溢出**：`ArchiveHero` 的 `h1` 加 `break-words`，超长名换行不溢出。
- **S7 · 客户端双解包**：用 `parseApiResponse` 替代手写 `res.data ?? res`。
- **S8 · 符号开头归类**：`firstCharKey` 把符号/标点统一归 `#`，CJK/假名保留首字（避免索引出现孤立符号键）。
- **S9 · 搜索态文案**：搜索时 meta 改「匹配 N 个制作组」（原「共 N 个」易误解为全站总数）。

## ② Review 判断不成立的项（说明理由）

- **I8 之 `ArchiveHero variant="detail"`**：非 Bug。这是「Game Detail 复用 ArchiveHero（Design Language）」的既定契约（用户多次确认），属有意保留，非未测死代码。→ **保留**。
- **S6 `MakerGameItem.releaseDate` 类型谎言**：误报。`getMakerDetail` 返回前已 `g.releaseDate.toISOString()`，类型 `string | null` 正确（详情页 `new Date(g.releaseDate)` 对 string 也合法）。→ **不改**。

## ③ 暂缓的建议（说明原因）

- **S2 详情页缓存**：`force-dynamic` 下加 `revalidate` 无效；要缓存须移除 `force-dynamic`，但 `force-dynamic` 在 DB 偶发不可达时避免把 `notFound` 结果缓存 5 分钟。属行为变更、有 stale-notFound 风险，非 Bug。→ **暂缓**。
- **S5 图片 `unoptimized` 优化**：改 `next/image` 优化需先配置封面域名白名单（R2/对象存储），当前环境未确认；贸然开启可能让封面 500。→ **暂缓**。
- **S10 详情 DB 压力**：当前「全量查再切片分页」功能正确；优化为「只查当前页」属数据层重构，触碰已验证逻辑。→ **暂缓**（留待后续性能专项）。

## ④ 修改文件列表

新增：
- `src/lib/role-labels.ts`（共享角色标签）
- `src/app/credits/studio/[name]/error.tsx`
- `src/app/credits/studio/[name]/loading.tsx`

修改：
- `src/components/archive/entity-card.tsx`（C1 / I1）
- `src/components/archive/archive-hero.tsx`（C1 / S4）
- `src/components/archive/archive-shell.tsx`（I7）
- `src/components/archive/density.ts`（I4 / S8）
- `src/components/archive/skeleton-grid.tsx`（I4）
- `src/components/archive/studio-archive-client.tsx`（I3 / I4 / I5 / S1 / S7 / S9）
- `src/app/credits/studio/[name]/page.tsx`（I2 / I4-S3）

未改动：数据层 `makers.ts`、API 路由、DB Schema、Archive 架构分层、Game Detail 任何逻辑。

## ⑤ 风险评估

- **架构风险**：无。EntityCard 收窄为 studio-only 是「不预埋半成品」的方向收敛，不推倒重来；Creator/Collection 后续接页面时按契约接口新增变体即可。Framework / Design Language 分层、Game Detail 不进 Framework 全部保持。
- **行为回归**：详情 GameCard 网格移动端 compact 由 2 列变 1 列（与列表统一），视觉更克制但属预期内一致性改进。
- **客户端复杂度**：S1 的 IntersectionObserver 仅在列表挂载、带 `disconnect` 清理，无内存泄漏；`makers`/搜索变化会重建观察，开销极小。
- **缓存/数据**：I5 提示为纯展示，不改取数逻辑；API 契约未变。
- **SSR/Hydration**：`"use client"` 仅加在封面子组件与 Hero（本就处 client/server 边界之内），未改变组件树结构，冒烟验证 200 + 标题正常。

## ⑥ 最终验证结果

| 检查 | 结果 |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint`（改动文件） | 0 error / 0 warning |
| `npx next build` | exit 0（新路由 `/credits/studio`、`/credits/studio/[name]` 均在产物） |
| 运行时冒烟（`next start` + curl） | 列表页 200 且含「制作组图鉴」；API 在 DB 不可达时返回安全空 `{"success":true,"data":{"makers":[],"total":0,...}}`（**未注入假数据**）；详情页路由稳定 |

> 部署与浏览器回归按协作边界由用户侧执行（agent 不动 git/部署/服务器）。
