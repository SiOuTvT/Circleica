# Galvelica 数据体系架构决策（ADR）

> 状态：**规划基线（Draft）** — 2026-07-25 由用户重新定义产品方向后确立，作为后续数据层 / 搜索 / 详情页改动的唯一基线。
> 关联约定：`MEMORY.md` →「Circleica × Galvelica 产品定位与数据体系（最高优先级）」。

---

## 0. 一句话结论

Galvelica 不是 Circleica 的镜像，而是**拥有自己（更大）数据库的独立资料馆**。当前 `src/lib/galvelica.ts` 把 Galvelica 实现成「`Game` 表的策展视图层」，**直接违背**此方向，必须在数据层重构为独立的 `Work` 档案 + 多源字段级融合引擎。

---

## 1. 背景与现状审计

### 1.1 当前实现（矛盾点）

| 现状 | 位置 | 与新方向的冲突 |
|------|------|----------------|
| Galvelica 是 `Game` 的 `isPublished:true` 视图层，注释明写「不引入新表」 | `src/lib/galvelica.ts:7-14` | 资料库规模被 Circleica 已收录游戏锁死，无法大于 Circleica |
| VNDB 自动填充直接写 `Game` 字段（单源、后写覆盖） | `src/app/api/admin/vndb/autofill/route.ts` | 无字段级 provenance、无多源融合、无人工覆盖锁定 |
| 搜索只查 `Game` | `galvelica.ts listWorks` | 「找不到资源也能找到资料」无法实现 |
| `Work` / 多源 / 申请收录 概念均不存在 | — | 联动与收录申请流程无载体 |

### 1.2 结论

必须新建独立的 Galvelica 数据层，把 `Game`（Circleica 资源）降级为「**已托管来源**」之一，而非 Galvelica 的全部。

---

## 2. 核心原则（从八点方向提炼，不可妥协）

1. **职责分离**：Circleica=资源站（只展已收录）；Galvelica=资料馆（收录整个生态）。
2. **Galvelica 自有数据库**：`Work` 可独立存在，不要求对应 `Game`。
3. **多源、不依赖任一**：VNDB / Bangumi / ErogameScape·批评空间 / DLsite / Steam，可续扩；谁有数据用谁，一个源也能建页。
4. **字段级融合（非后写覆盖）**：每字段按优先级选优合并；人工改过的字段锁定、不被同步覆盖。
5. **Galvelica 永远保留自己的最终资料**：第三方只是提供者，不是拥有者。
6. **联动不出现空页**：未收录→「申请收录」→进后台待审核；已收录→「前往 Circleica」。

---

## 3. 目标数据模型（Prisma 草案）

新增 3 张表，复用现有 `Tag` / `Creator`（通过 `WorkTag` / `WorkCreator` 关联，与 `GameTag` / `GameCreator` 平行）。

```prisma
// ── Galvelica 档案主体（独立于 Game） ──
model Work {
  id          String   @id @default(cuid())
  slug        String   @unique          // URL 用，如 /galvelica/works/<slug>
  gameId      String?  @unique          // 若已被 Circleica 收录则链接 Game；否则 null
  game        Game?    @relation("workGame", fields: [gameId], references: [id], onDelete: SetNull)

  // 融合后的「有效展示值」（单一真相，页面只读这里）
  title        String
  originalWork String   @default("")
  englishName  String   @default("")
  aliases      String   @default("")    // 多源合并后的别名，逗号分隔
  description  String   @default("")
  coverImage   String   @default("")
  releaseDate  DateTime?
  studioName   String   @default("")
  status       String   @default("")
  duration     String   @default("")
  isNsfw       Boolean  @default(false)

  // 外链（按源选优后归一）
  officialUrl  String   @default("")    // DLsite 优先
  steamAppId   String   @default("")    // Steam 优先

  // 字段级 provenance：field -> { source, manual }
  provenance   Json     @default("{}")
  // 被人工锁定、融合时跳过的字段名
  manualFields String[] @default([])

  ratingAvg    Float?
  ratingCount  Int      @default(0)
  viewCount    Int      @default(0)
  favoriteCount Int     @default(0)

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  lastFusedAt  DateTime?

  sources      WorkSource[]
  tags         WorkTag[]
  creators     WorkCreator[]
  links        WorkLink[]     // 系列 / 角色 / 社团关系（融合后归一）
  requests     InclusionRequest[]

  @@index([title])
  @@index([releaseDate])
  @@index([isNsfw])
}

// ── 每源原始载荷 + 关联（provenance 的底层） ──
model WorkSource {
  id         String   @id @default(cuid())
  workId     String
  work       Work     @relation(fields: [workId], references: [id], onDelete: Cascade)
  source     String                     // 'VNDB' | 'BANGUMI' | 'EROGAMESCAPE' | 'DLSITE' | 'STEAM' | 'MANUAL'
  externalId String                     // 该源的作品 ID（v12345 / bgm123 / appid ...）
  raw        Json                        // 该源返回的原始 payload（缓存，供重融合）
  status     String   @default("ok")    // ok | stale | error
  fetchedAt  DateTime @default(now())
  @@unique([workId, source])
  @@index([source, externalId])
}

// ── 收录申请（Circleica↔Galvelica 联动载体） ──
model InclusionRequest {
  id        String   @id @default(cuid())
  workId    String
  work      Work     @relation(fields: [workId], references: [id], onDelete: Cascade)
  requestedBy String?                  // 发起用户（游客可为空）
  status    String   @default("PENDING") // PENDING | APPROVED | REJECTED
  note      String   @default("")
  createdAt DateTime @default(now())
  decidedAt DateTime?
  @@index([status])
}

// 与 GameTag / GameCreator 平行的关系表
model WorkTag {
  workId String
  tagId  String
  work   Work @relation(fields: [workId], references: [id], onDelete: Cascade)
  tag    Tag  @relation(fields: [tagId], references: [id], onDelete: Cascade)
  @@id([workId, tagId])
}
model WorkCreator {
  id        String @id @default(cuid())
  workId    String
  creatorId String
  role      String
  work      Work    @relation(fields: [workId], references: [id], onDelete: Cascade)
  creator   Creator @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  @@unique([workId, creatorId, role])
}
```

**关键点**：`Work.gameId` 唯一可空 —— 它是两站联动的唯一锚点。有值=已托管；空值=资料存在但 Circleica 未收录。

---

## 4. 源适配器接口契约

每个数据源实现统一接口，融合引擎与具体源解耦：

```ts
type SourceKey = 'VNDB' | 'BANGUMI' | 'EROGAMESCAPE' | 'DLSITE' | 'STEAM' | 'MANUAL'

interface NormalizedWork {
  title?: string
  originalWork?: string
  englishName?: string
  aliases?: string[]
  description?: string
  coverImage?: string
  releaseDate?: string        // ISO
  studioName?: string
  tags?: { name: string; sourceId?: string }[]
  creators?: { name: string; role: string; sourceId?: string }[]
  officialUrl?: string
  steamAppId?: string
}

interface SourceAdapter {
  readonly key: SourceKey
  /** 按外部 ID 拉取原始 payload（缓存进 WorkSource.raw） */
  fetchByExternalId(externalId: string): Promise<unknown | null>
  /** 把原始 payload 归一为源无关结构 */
  normalize(payload: unknown): NormalizedWork
  /** 可选：按标题搜索（用于「用户给了作品名但无 ID」的场景） */
  search?(query: string): Promise<{ externalId: string; title: string }[]>
}
```

- 现有 `src/app/api/admin/vndb/*` 的拉取逻辑**重构为 `VndbAdapter`**，不丢弃。
- `BangumiAdapter` 等后续源按同一接口实现，融合引擎零改动即可接入。

---

## 5. 字段级融合引擎 + 优先级表

融合算法（对每个 `Work` 运行一次）：

```
for field in ALL_FIELDS:
  if field in work.manualFields:        // 人工锁定
    keep work.fields[field]             // 永不覆盖
    continue
  for source in FUSION_TABLE[field]:    // 按优先级遍历
    val = work.sources[source]?.normalized[field]
    if val not empty:
      work.fields[field] = val
      work.provenance[field] = { source, manual: false }
      break
```

### 字段级融合优先级表（核心）

| 字段 | 优先级（优→劣） | 合并策略 |
|------|----------------|----------|
| `title` 作品名 | VNDB → BANGUMI → MANUAL | 取首个非空 |
| `originalWork` 原名/日文 | VNDB → MANUAL | 取首个非空 |
| `englishName` | VNDB → MANUAL | 取首个非空 |
| `aliases` 别名 | VNDB + BANGUMI | **合并去重**（两源都取，union） |
| `description` | VNDB（最丰富）→ BANGUMI → MANUAL | 取最长非空 |
| `coverImage` | VNDB → BANGUMI → MANUAL → DLSITE | 取首个非空 |
| `releaseDate` | VNDB → BANGUMI → MANUAL | 取首个非空 |
| `studioName` 社团 | VNDB → BANGUMI → MANUAL | 取首个非空 |
| `tags` | VNDB + BANGUMI + MANUAL | **多源 name 去重合并**，每条记 sourceId |
| `creators` Staff | 所有源 | 按 `(name, role)` 合并；取含 bio/avatar 最完整的源；角色可累加 |
| `officialUrl` 购买链 | DLSITE → MANUAL | DLsite 优先 |
| `steamAppId` | STEAM → MANUAL | Steam 优先 |
| `links`（角色/CV/系列） | VNDB + BANGUMI | 按实体名去重融合，不重复 |
| `ratingAvg/Count` | 本站 `GameRating` 优先 | 用户评分是 Galvelica 的权威评分；源站评分仅展示 |

> 任何字段在无任何源提供时留空（不报错），只要有一个源有数据即可建页。

---

## 6. 人工覆盖锁定机制

- 站长在 Galvelica 后台改某字段 → 该字段名写入 `work.manualFields`，值写入 `work.fields`。
- 此后任何同步/融合**跳过**该字段（provenance 标记 `manual:true`）。
- 后台提供「解锁并重新同步」动作：从 `manualFields` 移除该字段，下次融合按优先级重新选优。
- 这是「Galvelica 永远保留自己的最终资料」的落地保障。

---

## 7. Circleica↔Galvelica 联动与收录申请流程

### 7.1 资料页判定

```
if work.gameId != null:
  展示 [查看资源] [前往 Circleica]  → 链接 /games/<game.serialId>
else:
  展示 [申请收录] 按钮（无空页）
```

### 7.2 申请收录

1. 用户点「申请收录」→ `POST /api/galvelica/<id>/request-inclusion`
2. 创建 `InclusionRequest { workId, requestedBy?, status: PENDING }` + 给管理员发通知
3. 后台 `/admin/inclusion-requests` 列出待审；「通过」→
   - 用 `Work` 已融合字段**预填**一个草稿 `Game`（`isPublished:false`，`vndbId` 取自 `WorkSource{VNDB}.externalId`）
   - 设 `Work.gameId = game.id`
   - 管理员补 Circleica 专属字段（下载链、资源等）后发布
4. 流程自然，无需用户留言或额外反馈。

---

## 8. 搜索分治

| 搜索域 | 查询对象 | 行为 |
|--------|----------|------|
| Circleica `/search` `/games` | `Game`（`isPublished`） | 只返本站资源（现有不变） |
| Galvelica `/galvelica/works` | `Work` | 查整个资料库，**`gameId` 为空也返回**（改造 `galvelica.ts listWorks` 从查 `Game` 改查 `Work`） |

Galvelica 搜索可覆盖：作品 / Staff / 社团 / 标签 / 发布时间 / 系列 / 角色 / 官方信息 —— 实现「找不到资源，也能找到资料」。

---

## 9. 从现状到目标态的迁移路线

| 阶段 | 内容 | 产出 |
|------|------|------|
| **A. 地基** | 新增 `Work` / `WorkSource` / `InclusionRequest` / `WorkTag` / `WorkCreator` 表；`Game` 加反向关系 | 迁移 + schema |
| **B. 适配器** | `VndbAdapter`（重构现有 autofill）；`SourceAdapter` 接口 | 可拉取+归一 |
| **C. 回填** | 把现有已发布 `Game` → 生成 `Work` + `WorkSource{VNDB}`（用 `vndbId` 重拉或复用现有字段）；设 `gameId` | 历史数据不丢 |
| **D. 多源融合** | `BangumiAdapter` + 融合引擎上线；字段级优先级表生效 | 多源资料页 |
| **E. 联动 UX** | 收录申请流程 + 后台待审队列 | 未收录页不空 |
| **F. 搜索分治** | `galvelica.ts listWorks` 改查 `Work` | 资料库级搜索 |

> 阶段 C 之前 `galvelica.ts` 仍查 `Game` 保持兼容；C 完成后切换。所有回填/融合在**真实数据库**跑（沙箱无 DB，见 `MEMORY.md` 环境限制）。

---

## 10. 开放问题 / 待确认

1. **`Work` 与 `Game` 字段分歧**：Game 有 `downloadLinks` / `screenshots` / `resources` 等 Circleica 专属字段，Work 不存这些；链接建立后初始值从 Work 拷贝，但各自可独立演化（Game 不被 Work 反向覆盖）。是否接受「两表各自为真相、仅初始同步」？
2. **评分归属**：Galvelica 展示的 `ratingAvg` 用本站用户评分还是源站评分？本文档默认本站优先。
3. **去重归并键**：跨源同一作品靠 `externalId` 映射（如 VNDB↔Bangumi 的关联 ID）；若两源无互相 ID，靠「标题+社团+年份」模糊匹配归并，需定义匹配阈值。
4. **DLsite / Steam / ErogameScape 是否需要 API key / 爬虫**：影响阶段 D 的排期与合规，需单独评估。

---

---

## 11. 落地进度

### 阶段 A（地基表）— 已落地 2026-07-25
- **已落地到 `prisma/schema.prisma`**：`WorkSourceType` / `InclusionRequestStatus` 两个枚举，`Work` / `WorkSource` / `InclusionRequest` / `WorkTag` / `WorkCreator` 五张表。
- **反向关系已补回**（Prisma 关系必须双向）：`Tag.works`、`Creator.works`、`Game.galvelicaWork`（relation 名 `gameToGalvelica`，锚点 `Work.gameId` 唯一可空）。
- **验证**：`prisma validate` 通过（✅）。`prisma generate` 在 agent 沙箱内因禁止覆盖 query engine 二进制而失败（环境限制，非 schema 问题）；在你本机 `npx prisma generate` + `npx prisma migrate dev --name galvelica_stage_a` 即可建表。
- **阶段 A 对 §10 开放问题的落地决策**：
  1. **字段分歧**：Work 与 Game 各自为真相。`Work.duration` 对应 `Game.gameDuration`；收录时初始值单向拷贝，之后各自演化（Work 不反向覆盖 Game）。Game 仅加了一个可选单值反向锚点 `galvelicaWork`，不污染 Game 既有字段。
  2. **评分归属**：`Work.ratingAvg/Count` 默认优先取自本站 Game 评分（§5 表）；源站评分仅展示、不入此字段。Stage A 只建字段，融合逻辑在 Stage D。
  3. **跨源归并键**：以 `WorkSource.externalId`（每源各自）为存储基础；跨源同一作品归并（VNDB↔Bangumi 映射 / 标题+社团+年份模糊匹配）留到 Stage D 融合引擎，阶段 A 不建映射表。
  4. **DLsite/Steam/EGS 合规**：属 Stage B/D 适配器层，与 schema 无关；阶段 A 仅在 `WorkSourceType` 枚举预留值。

### 阶段 B（适配器）— 已落地 2026-07-25
- **新增 `src/lib/galvelica/sources/`**：
  - `types.ts`：`SourceKey` / `NormalizedWork` / `SourceAdapter` 接口（与 §4、Stage A 的 `WorkSourceType` 枚举一致；`SourceKey` 用 `EROGESCAPE` 对齐枚举值）。
  - `vndb.ts`：`VndbAdapter` 实现，把原 `/api/admin/vndb` 的「名称解析 + 标签清洗 + 创作者提取」迁进 `fetchByExternalId + normalize`；传输层复用 `VNDBClient`（代理 / IPv4 / 重试 / 熔断器 / 缓存）；附带可选 `search()`。
  - `index.ts`：`getAdapter(key)` / `listAdapters()` 注册表，`VNDB` 已注册，Bangumi 等留位注释。
- **`VNDBClient` 瘦身**：新增 `fetchVisualNovelRaw(vnId)`（带 aliases + released 完整字段）；删除重复的 `autoFillFromVNDB`（归一化已归一到适配器），顺带移除 `vndb.ts` 里不再使用的 `cleanTags` 导入。
- **三条路由统一走适配器**：`/api/admin/vndb`（主）、`autofill`、`import` 全部改用 `vndbAdapter.fetchByExternalId + normalize`，对外响应形态保持兼容（主路由返回 `title/japaneseName/englishName/aliases/releaseDate/.../creators`；autofill 返回 `title/original/tags/creators/message`；import 路由建 `Game` 逻辑不变）。
- **单一归一化真相源**：全站不再有两套 VNDB 名称 / 标签解析逻辑并存。

### 阶段 C（回填）— 已落地 2026-07-25
- **新增 `scripts/backfill-galvelica.ts`**（npm script `galvelica:backfill`）：遍历已发布 `Game` → slug=`g{serialId}`；有 `vndbId` 优先 `vndbAdapter.fetchByExternalId` 重拉原始 payload 入 `WorkSource{VNDB}`（失败回退 `MANUAL` 复用 Game 既有字段），创建 `Work` + 设 `gameId`；复制本站评分/浏览/收藏数到 `Work`。**幂等**（slug 已存在则跳过），可在真实库多次安全重跑。
- **跑批在真实数据库执行**（沙箱无 DB，见 `MEMORY.md` 环境限制）：你本机建完 Stage A 表后 `npm run galvelica:backfill` 即可把历史游戏灌入 Galvelica 资料库、并自动融合 VNDB 字段。
- 回填即触发 `fuseWork`（Stage D 引擎），所以 C 完成的同时首轮融合已就绪。

### 阶段 D（多源融合）— 已落地 2026-07-25
- **融合引擎 `src/lib/galvelica/fusion.ts`**：纯函数 `mergeSources(sources, manualFields)`，按 §5 字段级优先级表选优；`aliases`/`tags` 合并去重、`description` 取最长非空、`creators` 按 `(name,role)` 去重；导出 `FUSION_TABLE` 与类型。
- **`BangumiAdapter`（`src/lib/galvelica/sources/bangumi.ts`）**：实现 `SourceAdapter`，`key="BANGUMI"`；`BANGUMI_ACCESS_TOKEN` 未配置时 `fetchByExternalId`/`search` 优雅返回 null/[]（不报错、不吃异常），配了令牌即自动进入多源融合。已注册进 `sources/index.ts`。
- **编排层 `src/lib/galvelica/work-service.ts`**：`fuseWork(workId)`（读 Work+sources → 各源 `normalize` → `mergeSources` → 写标量字段+provenance → 同步 `WorkTag`/`WorkCreator`）、`getOrCreateWorkFromSource`、`refetchSource`、`slugify`。
- **人工锁定**：`manualFields` 字段融合时跳过，落地「Galvelica 永远保留自己的最终资料」。
- DLsite / Steam / ErogameScape 适配器按同一 `SourceAdapter` 接口留位，接入零改引擎。
- **启用 Bangumi 多源融合的实际步骤（重要）**：仅配 `BANGUMI_ACCESS_TOKEN` **不会**自动给现有作品灌 Bangumi 数据——backfill 只建 `WorkSource{VNDB}`，融合引擎只会对「已存在的 BANGUMI 源」生效。必须再跑 `npm run galvelica:enrich-bangumi`：它为尚无 BANGUMI 源的 Work 按标题在 Bangumi 搜 galgame（type=4）、取首个结果挂 `WorkSource{BANGUMI}` 并重融合（幂等、可重跑）。因 §5 优先级表 Bangumi 只「补充」标签/别名/简介(若 VNDB 为空)/封面(若 VNDB 为空)/原名(若 VNDB 为空)，`title`/发售日/社团/Staff 仍以 VNDB 优先，即便个别匹配不准也只多几个标签/别名，风险可控。新增 `scripts/enrich-bangumi.ts` + `work-service.attachSourceToWork`（给**已存在** Work 挂源并重融合，区别于会新建 Work 的 `getOrCreateWorkFromSource`）。

### 阶段 E（联动 UX）— 已落地 2026-07-25
- **前端**：`src/components/galvelica/work-detail.tsx`（已收录/未收录两条路由复用的详情视图）；已收录→「查看资源·前往下载页」`/games/{serialId}`；未收录→ `<RequestInclusionButton>`。
- **API**：`src/app/api/galvelica/[id]/request-inclusion/route.ts`（`POST`，已收录/已 Pending 返回 409，游客可提交 `requestedBy=null`，`auth()` from `@/lib/auth`）。
- **后台队列**：`src/app/admin/inclusion-requests/page.tsx`（`requireAdmin()`，列 PENDING + 最近 20 条已处理；通过→用 Work 融合字段预填未发布 `Game` 草稿并设 `Work.gameId`；驳回→REJECTED）；侧边栏入口 + 待审数量 badge（`/api/admin/counts` 新增 `inclusionRequests` 计数）。
- 效果：未收录作品页永不空页，走「申请收录 → 后台待审 → 一键建草稿」自然闭环。

### 阶段 F（搜索分治）— 已落地 2026-07-25
- **`src/lib/galvelica.ts` 整体重写**：公开类型/签名（`GalvelicaWorkCard`/`GalvelicaWorkDetail`/`listWorks`/`getWorkBySerialId`/`getPopularTags` 等）保持兼容；卡片/详情类型新增 `href`/`slug`/`included`/`gameId`。
- **主路径改读 `Work`**：`workCardSelect`/`mapWorkCard`/`workWhere`/`buildDetailFromWork`/`getWorkBySlug`；通过 `archiveReady()`（`prisma.work.count()>0` 带缓存判定）**优雅回退**到旧 `Game` 实现（`*FromGame`）。即 Stage C 未跑前旧行为不变，跑完后自动切到资料库级阅读。
- **详情路由 `works/[serialId]/page.tsx`**：`resolveWork(segment)` 数字走 `getWorkBySerialId`、否则走 `getWorkBySlug`，统一渲染 `<WorkDetailView>`（已删除冲突的 `[slug]` 同级目录）。
- **消费组件同步**：14 处引用改为用 `work.href` 链接；`/api/search` 仍走 `searchService` 查 `Game`（Circleica 搜索分治不变）。
- 效果：Galvelica 可搜索整个资料库（含 `gameId` 为空、未收录作品），实现「找不到资源，也能找到资料」。

### 全部阶段落地状态（截至 2026-07-25）
A 地基 / B 适配器 / C 回填 / D 多源融合 / E 联动 UX / F 搜索分治 —— **六项全部落地**。剩余仅「真实数据库执行」由你本机完成（沙箱无 DB，见下「执行清单」）。

**执行清单（你本机、非沙箱）**：
1. `npx prisma generate && npx prisma migrate dev --name galvelica_stage_a`（建 Stage A 新表）
2. `npm run galvelica:backfill`（Stage C 回填 + 首轮融合）
3. 启用 Bangumi 多源融合（两步）：① 在 `.env` 加 `BANGUMI_ACCESS_TOKEN=你的令牌`；② 跑 `npm run galvelica:enrich-bangumi` 把现有作品关联到 Bangumi 并重融合（仅配令牌不跑此步 = 无效果）。

> 沙箱环境无法连 DB（网络层拦截 5432，对 agent 内一切进程生效），故上述两条命令需在**你自己的桌面**（双击 `D:\Circleica\start-dev.bat` 起的 `localhost:3000`）执行；agent 内起的 765/3000 预览无库，仅渲染空框架、绝不注入假数据。

---

*本文档为规划基线，落地前以对应阶段的实际实现为准。任何数据层 / 搜索 / 详情页改动都须以此为准，不得把 Galvelica 当 Circleica 镜像。*
