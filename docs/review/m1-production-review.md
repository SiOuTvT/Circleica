# M1 Production Review（生产级验收）

> 视角：未参与开发的资深架构师 + UI/UX 设计师 + 全栈工程师
> 范围：`src/components/archive/*`、`src/app/credits/studio/**`、`src/lib/makers.ts`、studios API
> 结论：架构边界守得住，但存在 1 个高频可见缺陷 + 多处可维护性/一致性债，距"生产级"还差一轮打磨。

## ① 发现的问题（按严重程度）

### 🔴 Critical

**C1 · EntityCard / HeroCover 缺图片加载失败兜底**
- 位置：`entity-card.tsx` 的 `CoverMedia`（L66-86）、`archive-hero.tsx` 的 `HeroCover`（L32-50）
- 为什么是问题：两处 `<Image>` 都没有 `onError`，而同类组件 `GameCard` 有完整 `imgError/imgFallback` 降级（game-card.tsx L45-133）。Archive 封面来自本站游戏封面（外链/对象存储），404 或防盗链是常态。
- 影响：封面加载失败时浏览器显示**破碎图片图标**，而不是渐变首字占位。资源站高频场景，直接破坏"档案馆感"。
- 建议：照搬 GameCard 模式——CoverMedia 加 `useState` + `onError`，失败时渲染 `initial` 渐变块；HeroCover 同理。
- 成本：低（各约 10 行）。

### 🟠 Important

**I1 · Studio 详情页创作者区用 bespoke 渲染，未复用 EntityCard creator 变体**
- 位置：`[name]/page.tsx` L156-201（内联创作者卡） vs `entity-card.tsx` L125-161（`EntityCard variant="creator"`）
- 为什么是问题：`EntityCard` 的 `creator` 变体在 M1 中完全未被使用，详情页又手写了一套视觉不同的创作者卡（用 `<Tag>`、尺寸/圆角不一致）。同时造成：① 一个死抽象；② 两种创作者视觉，未来 Creator Archive 接入时不知以哪个为准。
- 影响：违反"同源但不同"里的组件契约统一，也抵触"不要预埋半成品"——creator 卡视觉其实已写完。
- 建议：二选一 —— A) 详情页直接 `<EntityCard variant="creator" data={...} />` 复用；B) 既然 M1 只做 Studio，把 creator/collection 的视觉变体从 EntityCard 删掉，只保留联合类型契约，等对应页面落地再写视觉。倾向 B。
- 成本：中（A 低 / B 中）。

**I2 · `ROLE_LABELS` 重复定义**
- 位置：`entity-card.tsx` L27-35 与 `[name]/page.tsx` L19-27 各一份，内容相同。
- 为什么是问题：同一映射两份，改一处忘另一处会漂移。
- 建议：抽到 `src/lib/role-labels.ts`（或 `archive/` 内共享），两处 import。
- 成本：低。

**I3 · `MakerSummary` / `MakerListResult` 在客户端重复声明**
- 位置：`studio-archive-client.tsx` L15-27 重新定义 `makers.ts` 已导出的同名类型。
- 为什么是问题：数据层改字段时客户端类型不同步，运行时才暴露。
- 建议：直接从 `@/lib/makers` import 这两个 interface。
- 成本：低。

**I4 · 密度→网格列数映射复制三份**
- 位置：`skeleton-grid.tsx` L11-15、`studio-archive-client.tsx` L32-36、`[name]/page.tsx` L56-60，三处 `gridByDensity` 几乎一致。
- 为什么是问题：将来 Creator/Collection/Tag 接入会再复制第 4、5 份。密度三态是"最高优先级令牌"，却散落在各页面手写。
- 建议：抽到 `archive/density.ts` 导出 `DENSITY_GRID: Record<ArchiveDensity, string>`，三处复用（`skeleton-grid` 保留 `gap-3`，其余 `cn("grid gap-3", DENSITY_GRID[density])`）。
- 成本：低。

**I5 · 列表无分页、单次拉全量 1000 上限会静默截断**
- 位置：`studio-archive-client.tsx` L29 `PAGE_SIZE=1000`；`makers.ts` L74、studios route L16 双重 clamp 到 1000。
- 为什么是问题：列表是"浏览全部 + AZIndex 跳字母"模型，但 `getMakers` 最多返回 1000 条。制作组 >1000 时超出部分既不在列表也不在索引里，静默丢数据。
- 影响：当前规模不触发，但属明确正确性陷阱，规模化后 AZIndex 与计数都对不上。
- 建议：要么列表改服务端分页 + 索引区只列有数据的字母；要么把 1000 上限明确成配置并在超量时显示"仅显示前 N 个"。M1 至少加 `if (total > fetched) warn/提示`。
- 成本：中。

**I6 · 详情路由缺 `error.tsx` 与 `loading.tsx`**
- 位置：`src/app/credits/studio/[name]/` 下无这两个文件（Glob 确认）。
- 为什么是问题：详情页是 `force-dynamic` Server Component，`getMakerDetail` 异常会落 Next 默认错误页；DB 慢时用户面对白屏等待无加载态。
- 建议：补 `[name]/error.tsx`（友好错误 + 返回图鉴）与 `[name]/loading.tsx`（骨架屏）。
- 成本：低。

**I7 · `--archive-density` CSS 变量是"死令牌"**
- 位置：`archive-shell.tsx` L45 注入 `style={{ "--archive-density": density }}`，但全局 CSS 无任何规则读取；密度实际由 JS `gridByDensity` 映射驱动。
- 为什么是问题：文档/注释把 density 描述为"最高优先级令牌"，但真实实现是 JS 分支，变量名误导后续维护者。
- 建议：要么在 `globals.css` 用 `[data-density="dense"] .archive-grid {...}` 真让 CSS 驱动；要么删掉注入。
- 成本：低~中。

**I8 · 未实现目标的契约/死链**
- 位置：`entity-card.tsx` `collection` 变体链接 `/collections/${slug}`（L166）、`ArchiveHero variant="detail"`（定义但 M1 未用）。
- 为什么是问题：collection 路由不存在，该变体在 M1 完全未用；`detail` 变体是未来 Game Detail 预定的未测代码。
- 建议：按 I1-B 一并移除契约外视觉；或注明"仅类型契约，页面未实现"。
- 成本：低。

### 🟡 Suggestion

- **S1** AZIndex 无 scroll-spy：`active` prop（L7）从未传入，点击字母不高亮当前位置。建议加 IntersectionObserver。
- **S2** 详情页 `force-dynamic` 无缓存：公开档案页每请求查 DB（还跑 findMany + $queryRaw）。建议加 `export const revalidate = 300` 或 `unstable_cache`。
- **S3** 移动端密度不一致：列表 compact `grid-cols-1` vs 详情 GameCard compact `grid-cols-2`。建议统一移动端基准。
- **S4** Hero 标题无截断：`archive-hero.tsx` L84 `h1` 无 `break-words`/`truncate`，超长名可能溢出。
- **S5** `unoptimized` 性能：EntityCard `next/image` 全用 `unoptimized`，数据量大时多封面全尺寸请求。可评估开启优化 + 合理 `sizes`。
- **S6** 类型谎言：`MakerGameItem.releaseDate` 声明 `string | null`，但 `getMakerDetail` 实际返回 `Date | null`。无害但误导，改 `Date | null` 更准。
- **S7** 客户端双解包脆弱：`studio-archive-client.tsx` L69-71 手写 `res.data ?? res`，而 `api-handler.ts` 已有 `parseApiResponse`。建议统一用现有工具。
- **S8** 符号开头归类：`firstCharKey` 对 "★C83" 归到该符号 key，AZIndex 显示孤立符号。建议符号/标点统一归 `#`。
- **S9** 搜索态文案歧义：列表 Hero `meta` "共 N 个制作组" 搜索时表示匹配数而非全站总数。建议搜索态改"匹配 N 个"。
- **S10** 详情页 DB 压力：`getMakerDetail` 每次 `findMany` 带 games 全量关联再切片，`force-dynamic` 无缓存，高流量下重。可只查当前页所需 games。

## ② 综合评分（100 分制）

| 维度 | 分数 | 简评 |
|---|---|---|
| 架构 | 85 | Studio≠Game Detail 边界在类型层锁死；Shell 只做槽位不做业务。扣分 I1、I7。 |
| 代码质量 | 78 | tsc/lint 干净，但 I2/I3/I4 重复、I6 缺边界、S6 类型谎言。 |
| UI | 80 | 克制、留白合理、编辑式方向对。扣分 C1（破碎图）、Hero 偏朴素。 |
| UX | 82 | 首访清晰、搜索/排序直觉、三态密度自然、AZIndex 跳字母可用。扣分 S1、I6。 |
| 可维护性 | 80 | 组件拆分清晰、Framework/Language 分层好；重复映射与死抽象让 Creator/Collection 接入时要先清理。 |
| 扩展性 | 83 | 联合类型 + 槽位设计天然支持后续接入；摩擦来自 I1、I4、I5。 |
| 综合 | 81 | 架构对、方向对，但"生产级"要求的高频缺陷（C1）和一致性债（I1-I4）还需一轮打磨。 |

## ③ 一句话结论

M1 的架构骨架站得住（最大加分项，也是反复强调的边界），但当前是"功能正确版"而非"生产级版"：最该立刻修的是 C1（封底图兜底），其次清掉 I1-I4 一致性债（会在 Creator/Collection 接入时反噬）。建议用户定方向后再动手，不在本次 Review 改。
