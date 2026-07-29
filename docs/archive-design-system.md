# Circleica Archive Design System — 锁定版 v1

> **锁定版 v1 · 2026-07-29** — M1 起不再调整整体方向。
> 基于旧版重定，不另起框架。风格 = A（字母编辑索引）+ C（精选叙事）融合「编辑式档案馆」：保留 AZIndex / Hero / StatsBar / 留白 / Placeholder / 三态，拒纯通讯录、拒海报墙。

## 核心原则 · 同源但不同（最高优先级 · 不可违反）

Archive Design System 是一套**统一的设计体系（设计语言 + 公共组件）**，**不是一整个页面**。

**Archive 浏览体系**（Studio / Creator / Collection 三类，以及未来 Tag/Publisher/Event/Character）是**独立功能模块 / 独立页面**；Game Detail **不属于 Archive 模块**，仅复用 Archive Design Language（见下方「Game Detail 架构约束」）。三者**不是**做成一个页面，也**不是**一个页面里切几个 Tab：

| 模块 | 归属 | 页面 | 构成 |
|------|------|------|------|
| Studio Archive | Archive 浏览体系（继承 ArchiveShell） | 制作组图鉴 | 列表页 + 制作组详情页 |
| Creator Archive（新增） | Archive 浏览体系（继承 ArchiveShell） | 创作者图鉴 | 列表页 + 创作者详情页 |
| Collection Archive | Archive 浏览体系（继承 ArchiveShell） | 精选合集 | 列表页 + 合集详情页 |
| Game Detail | 核心内容页（仅复用设计语言，**不**继承 ArchiveShell） | 游戏详情页（现有页面） | 单层详情页 |

### 共享什么（同源 vs 框架，须分清）

Archive 浏览体系（Studio / Creator / Collection，以及未来 Tag/Publisher/Event/Character）共用一套**设计语言**与**公共组件**；Game Detail 仅复用**设计语言子集**，不进入 Archive Framework。

**① Archive Design Language（设计语言，Game Detail 也复用）**
- Design Token（主色 / 语义色 / 圆角 / 间距 / 字号 / 动效令牌）
- ArchiveHero（编辑式标题区）
- StatsBar（统计条，按需）
- Skeleton（骨架屏）
- ArchivePlaceholder（三态占位）
- 动效（统一 transition 规则）
- 留白（统一节奏）
- 配色（统一主色与中性色）

**② Archive Framework（框架，仅 Archive 浏览体系继承，Game Detail 不继承）**
- ArchiveShell（骨架：Hero+Toolbar+Index+Grid+Pager+Placeholder 结构）
- AZIndex（字母索引）
- FilterSort（筛排）
- Pager（分页）
- EntityCard（archive 卡片外壳）
- 档案馆语言（索引浏览 / 拼贴 / 统计的浏览语汇）

> **Game Detail 与 Archive Framework 的边界**：Game Detail **永远作为独立业务页面**存在，属于网站**核心内容页**，**不属于 Archive 浏览体系**。Archive Design Language 可以服务于 Game Detail；**Archive Framework（尤其 ArchiveShell）不服务 Game Detail**。禁止为了兼容 Game Detail 去修改 ArchiveShell。

**不共享的，是页面本身（且 Framework 仅限 Archive 浏览体系）。**

### 各自独立什么（不同）

每个页面都必须有自己的：

- **页面布局**（版式结构不同）
- **信息架构**（区块顺序与层级不同）
- **浏览逻辑**（如何进入、如何筛选、如何跳转不同）
- **数据组织方式**（按组织 / 按个人 / 按系列 / 单作品不同）
- **视觉重点**（组织身份 vs 个人履历 vs 系列叙事 vs 单作深读，第一眼可辨）
- **交互体验**（索引浏览 vs 履历流 vs 有序序列 vs 长文阅读不同）

**不要为了复用组件，把四个页面做得越来越像。** 用户进入不同页面时，第一眼就应知道自己进入的是不同的功能，而不是换了一份数据。

### 反抽象原则（重要）

- **不要为了以后可能复用，而把现在的页面设计得很抽象。** 应该先把每一个页面做到最好。
- 公共组件只是**减少重复开发**，而不是**限制页面设计**。
- 页面设计优先于组件通用性：当某个页面的独特表达与公共组件的通用形态冲突时，保留页面的独特性，组件让路。

### 未来 Archive 扩展原则

未来若增加 Tag / Publisher / Event / Character 等 Archive，**也必须遵循同样原则**（均继承 ArchiveShell，作为独立页面）：

- 每增加一个 Archive = 新增一个**独立页面**（独立列表页 + 详情页、独立入口）；
- **绝对不是**往现有页面里继续塞 Tab、塞切换、塞 Variant。
- 公共组件契约可扩展（如新增 variant），但页面永远是新增而非并入。

### 当前开发阶段约束

- **当前只开发 Studio Archive。** Creator Archive、Collection Archive 现在只**锁定设计契约与公共组件接口**，不提前实现、不预埋半成品、不为了未来功能影响当前 Studio 体验。
- **开发顺序始终保持：Studio → Creator → Collection**（Game Detail 为核心内容页，本就不在 Archive 开发序列内，仅其设计语言与 Archive 体系保持一致即可）。
- 护栏：M1 起方向不再频繁调整，逐模块落地 + 验证。

**绝对禁止（红线）：**
- ❌ 把 Studio / Creator / Collection 做成一个大页面
- ❌ 把 Archive 浏览体系做成一个页面里用 Tab 切换
- ❌ 因为共用组件而牺牲各自的独立性
- ❌ 为未来复用过度抽象当前页面
- ❌ 为了未来功能在 Studio 里预埋半成品 / 妥协当前体验

各页面重点（互不相同）：
- Game Detail（核心内容页）：阅读一部游戏
- Studio Archive：浏览一个制作组的发展、作品以及成员（非百科介绍）
- Creator Archive：浏览一个人的履历、参与作品、所属制作组
- Collection Archive：浏览一个系列的发展、作品顺序、推荐理由、系列介绍、世界观

它们只是**共用一套设计系统**，而不是做成一个页面。

## Game Detail 架构约束（最高优先级 · 长期架构约束）

**Game Detail 不属于 Archive 模块。它只复用 Archive Design Language，不进入 Archive Framework。**

- Game Detail **不继承 ArchiveShell**。
- Game Detail **不参与 Archive 公共页面结构**（无列表 / 索引 / 分页 / FilterSort 注入）。
- Game Detail 只允许复用 **Archive Design Language 子集**：
  - Design Token
  - ArchiveHero（编辑式标题）
  - StatsBar（按需）
  - Skeleton
  - ArchivePlaceholder
  - 动效
  - 留白
  - 配色
- **禁止为了兼容 Game Detail 去修改 ArchiveShell。** ArchiveShell 的契约只服务于 Archive 浏览体系。
- **ArchiveShell 只服务于**：Studio Archive / Creator Archive / Collection Archive（以及未来 Tag / Publisher / Event / Character Archive）。
- **Game Detail 永远作为独立业务页面存在**：属于网站核心内容页，**不属于 Archive 浏览体系**。
- 关系公式：**Archive Design Language 可服务 Game Detail；Archive Framework 不服务 Game Detail。**

> 当 Game Detail 的展示需求与 ArchiveShell 的结构假设冲突时，以 Game Detail 自身设计为准，不得反向改造 ArchiveShell 去"兼容"它。

## 令牌基线（强制复用）
- 主色 `--mint:#5FA8A0`；hover `#69ada6` / active `#72b2ab` / accent `#7bbfb8`；ring `rgba(95,168,160,.3)`；glow `rgba(95,168,160,.08)`。
- 圆角 卡 `1rem` / 输入 `.75rem` / 按钮 `.5rem`；复用 GameCard / Tag；提亮 `color-mix(in srgb, var(--mint) 12%, white)`。
- 密度令牌 `--archive-density: compact | standard | dense`（驱动列数/内边距/字号/索引显隐）—— **全系统最高优先级**。
- 序号徽标 `--archive-order`、推荐理由 `--archive-reason`；留白 `--space-lg`(compact)/`--space-sm`(dense)。

## 1. Archive 档案定位表（浏览体系三类 + 核心内容页）

| 类型 | 定位 | 列表 | 信息架构区块顺序 | 主焦点 | 复用公共组件 |
|------|------|:---:|-----------------|--------|-------------|
| **Game Detail** | 核心内容页（**非 Archive 模块**，仅复用设计语言，不继承 ArchiveShell） | 否 | Hero(编辑式)→StatsBar→Placeholder/正文 | 单作品深度阅读 | Hero·StatsBar·Placeholder·Skeleton（仅设计语言，**不**继承 ArchiveShell/EntityCard/AZIndex/Pager） |
| **Studio** | 制作组组织档案 | 是 | Hero(org)→StatsBar→创作者拼贴→AZ网格→Pager | 组织身份+创作者聚合 | 全 9 件 |
| **Creator** | 个人创作者档案（独立页） | 是 | Hero(person)→隶属组胶囊→StatsBar→履历网格→AZIndex→Pager | 头像+角色标签 | 全 9 件（独立 entity） |
| **Collection** | 精选系列档案 | 是 | Hero(series)→StatsBar→有序作品流(序号)→世界观长文→Pager | 有序流+长文 | 全 9 件（无 AZIndex） |

## 2. Creator 独立说明
Studio（组织）与 Creator（个人）是**两个独立 Archive 类型**：数据模型、展示重点、浏览方式均不同；从组件层即按 `EntityCard variant=studio|creator`、`ArchiveHero variant=org|person`、`AZIndex` 各自按名首字母分离设计，**绝不在 Studio 页内嵌 Creator 列表充当图鉴**。
当前 `/credits` 双 Tab 为遗留结构：未来 **Studio Tab → Studio Archive**、**Creator → 独立 Creator Archive**（仅记迁移方向，不现在做；P2-4 推进，Creator 页后续阶段开发，但组件契约与设计现即锁定）。

## 3. 避免定位冲突
- **Studio（组织）**：AZIndex（组名首字母）+ 网格 + 创作者拼贴（横向关系网），无序号、无长文 → 「这是一个组织」。
- **Collection（系列）**：有序流（1,2,3 + `--archive-order` 序号 + `--archive-reason` 推荐理由）+ 世界观长文（max 68ch）→ 「这是一个系列」。
- **Creator（个人）**：履历网格 + 角色标签 + 隶属组胶囊 + 头像环（主色作头像环）→ 「这是一个人」。
- **Game Detail（核心内容页）**：**不属于 Archive 模块**，仅复用设计语言（Hero/StatsBar/Placeholder/Skeleton），**不继承 ArchiveShell**，无列表/索引/分页/FilterSort。

## 4. 公共组件契约表（9 件）

| 组件 | 职责 | 关键 props | 变体 | Archive 浏览体系复用 |
|------|------|-----------|------|---------|
| **ArchiveShell** | 骨架插槽 Hero+Toolbar+Index+Grid+Pager+Placeholder | `entity`,`density`,`slots` | 按 entity 注入 | **Studio·Creator·Collection（+未来扩展）全用；Game✗（仅复用设计语言，不继承 Shell）** |
| **AZIndex** | A–Z+# sticky 索引条 | `available[]`,`active` | 稀疏自动隐藏 | Game✗·Studio✓字母·Creator✓名·Collection✗ |
| **ArchiveHero** | 编辑式标题区 | `variant`,`title`,`lede`,`meta[]` | org/person/series | 四类全用（Game=detail 契约） |
| **StatsBar** | 统计条 | `items[]`,`density` | 按实体传 items | 四类全用 |
| **EntityCard** | 卡片外壳（三变体共享） | `variant`,`media/body/extra` | studio/creator/collection | Game✗·Studio·Creator·Collection 用 |
| **ArchivePlaceholder** | 三态占位 | `state`,`entity` | Loading/Empty/Error | 四类全用（Game=详情 Empty） |
| **SkeletonGrid** | 骨架屏 | `count`,`density` | 随 density | 四类全用（Game 仅详情） |
| **FilterSortBar** | 筛排 | `filters[]`,`sort[]` | — | Game✗·Studio·Creator·Collection 用 |
| **Pager** | 分页 | `page`,`total` | — | Game✗·Studio·Creator·Collection 用 |

**原则**：Archive Framework（Shell/Index/Stats/Hero/Placeholder/Skeleton/FilterSort/Pager）由 Archive 浏览体系公共复用；EntityCard 与 ArchiveHero 共享外壳 + variant 切换（零重做）。Game Detail 仅复用设计语言子集（Hero/StatsBar/Placeholder/Skeleton），**不继承 ArchiveShell / EntityCard**，不用 AZIndex/Pager/列表/FilterSort。

## 5. 密度三态（空/少/多）— 最高优先级
现实约束：主站多同人，制作组常仅 1~3 部。**须适配空/少/多三态：空不崩、少不空、多不乱。**
- `0` → **Empty**：ArchivePlaceholder 走 Empty（"暂无收录作品"），不崩。
- `1~3` → **compact**：编辑式大卡 + 简介填留白，AZIndex 隐藏，StatsBar 单行，显精致不空。
- `4~11` → **standard**：常规网格 + 完整 Stats。
- `≥12` → **dense**：网格 +1 列（4→5/6）、AZIndex sticky 强依赖、卡片降载（仅封面+名+作品数）、StatsBar 加均值/年份分布。
- ArchiveShell 计算注入 `--archive-density`，组件读令牌切换内边距/字号/列数（compact `--space-lg`、dense `--space-sm`）。

## 6. 复用矩阵（Archive 浏览体系 × 组件；Game Detail 仅复用设计语言，见约束）

| 组件 | Game Detail | Studio | Creator | Collection |
|------|:---:|:---:|:---:|:---:|
| ArchiveShell | ✗（仅设计语言） | ✓ | ✓ | ✓ |
| AZIndex | ✗ | ✓字母 | ✓名 | ✗ |
| ArchiveHero | ✓detail | ✓org | ✓person | ✓series |
| StatsBar | ✓ | ✓ | ✓ | ✓ |
| EntityCard | ✗ | ✓studio | ✓creator | ✓collection |
| ArchivePlaceholder | ✓Empty | ✓三态 | ✓三态 | ✓三态 |
| SkeletonGrid | ✓detail | ✓ | ✓ | ✓ |
| FilterSortBar | ✗ | ✓ | ✓ | ✓ |
| Pager | ✗ | ✓ | ✓ | ✓ |

## 7. M1 落地顺序与验证点
**顺序**：
1. 先抽 **ArchiveShell + EntityCard(三变体外壳) + ArchiveHero(三变体 org/person/series)** —— 骨架与卡片契约基础（含 Creator 契约，免日后推倒）。
2. 再补 **AZIndex / StatsBar**。
3. Studio 页首个落地。
**Studio 验证点**：`--archive-density` 在空/少/多三态切换生效；ArchivePlaceholder 三态（空不崩/少不空/多不乱）；AZIndex 稀疏自动隐藏；密度外观符合令牌。
**护栏**：M1 起方向不再频繁调整，逐模块落地 + 验证。

## 锁定确认
本规范即 M1 基准。四类档案定位、Creator 独立契约、9 件公共组件契约、密度三态令牌均已锁定；后续仅做模块内实现与局部打磨，不再重定整体方向。
