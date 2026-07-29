# Circleica Archive Design System — 架构重定位方案

> 取代旧版（仅 Studio 单页、偏制作组通讯录）。本文定位**体系层**，覆盖 Studio / Creator / Collection 三实体及未来标签页/系列页/专题页。
> 状态：方案设计稿，待确认后进入 M1 开发。不出代码、不出原型。

## 令牌基线（强制复用，不另起炉灶）
- 主色 `--mint:#5FA8A0`；hover `#69ada6` / active `#72b2ab` / accent `#7bbfb8`；ring `rgba(95,168,160,.3)`；glow `rgba(95,168,160,.08)`。
- 语义令牌：文本 / 背景 / 卡面 / 边框沿用现有；圆角 卡 `1rem` / 输入 `.75rem` / 按钮 `.5rem`。
- 复用 GameCard / Tag；动效仅 `transition`；提亮用 `color-mix(in srgb, var(--mint) 12%, white)`。
- 新增密度令牌：`--archive-density: compact | standard | dense`（驱动列数 / 内边距 / 字号）。

---

## 1. 三实体最终定位

| 实体 | 定位 | 信息架构（区块顺序） | 主焦点 |
|------|------|---------------------|--------|
| **Studio** | 制作组组织档案（组织维度） | Hero(组织画像) → StatsBar → 创作者拼贴 → AZ网格 → Pager | 组织身份 + 创作者聚合 |
| **Creator** | 个人创作者档案（个人维度） | Hero(头像+角色) → 隶属组胶囊 → StatsBar → 履历网格 → Pager | 头像 + 角色标签 |
| **Collection** | 系列档案（系列维度） | Hero(标题+导语) → StatsBar → 有序作品流(序号) → 世界观长文 → Pager | 有序流 + 长文 |

**同显大量游戏却让用户感到不同的核心手法：**
- Studio = 网格 + 字母索引 + 创作者拼贴（横向关系网），强调「这是一个组织」。
- Collection = 有序列表 + 序号 + 推荐理由 + 世界观长文（纵向叙事链），强调「这是一个系列」。
- Creator = 履历网格 + 角色标签 + 隶属组（个人视角），强调「这是一个人」。

| 组件 | Studio | Collection | Creator |
|------|--------|-----------|---------|
| Hero 变体 | org(徽标+简介) | series(标题+导语) | person(头像+姓名) |
| StatsBar | 作品 / 创作者 / 成立年 | 作品 / 序长 / 世界观标签 | 作品 / 隶属组 / 活跃年 |
| 卡片 | GameCard 网格 | GameCard + 序号 + 理由 | GameCard 履历 |
| 叙事区 | 无 | 世界观长文(必) | 角色简介(选) |

---

## 2. 三者如何避免定位冲突

- **布局 / 组件差异**
  - Studio：强依赖 **AZIndex**（组名首字母）、无序号、有「创作者拼贴」区、无长文。
  - Collection：**有序列表**（1,2,3 + 推荐理由行）、无字母索引、有「世界观长文」区。
  - Creator：履历网格 + 角色标签 + 隶属组胶囊，无字母索引（可选，按名首字母）、无长文。
- **语义区分**
  - Collection 卡片带 `--archive-order` 序号徽标 + `--archive-reason` 文案；Studio 卡片仅封面 + 名。
  - 三者 Hero 变体、图标、主色用法、排版节奏均不同（见下）。
- **视觉锚点**
  - 图标：Studio=工坊 / Collection=书卷 / Creator=人物。
  - 主色用法：Studio 作徽标底；Collection 作序号徽标 + 长文首字下沉；Creator 作头像环。
  - 排版节奏：Studio 紧凑网格；Collection 宽栏长文（max 68ch）；Creator 头像留白。

---

## 3. 可抽象成 Archive 公共的组件（组件契约）

| 组件 | 职责 | 关键 props | 变体 | 复用方式 |
|------|------|-----------|------|---------|
| **ArchiveShell** | 骨架：Hero + Toolbar + Index + Grid + Pager + Placeholder 插槽 | `entity`, `density` | 按 entity 注入插槽 | 全复用 |
| **AZIndex** | A–Z + # sticky 条 | `active`, `available[]` | 稀疏隐藏 | 全复用 |
| **ArchiveHero** | 编辑式标题区 | `variant: org|person|series`, `title`, `lede`, `meta[]` | 三变体 | 全复用 + 传参 |
| **StatsBar** | 统计条 | `items[]`, `density` | 按实体传 items | 全复用 |
| **EntityCard** | 卡片外壳（三变体共享） | `variant`, 插槽 `media/body/extra` | 三变体 | 外壳复用 + 插槽异 |
| **ArchivePlaceholder** | 三态 | `state`, `entity` | Loading / Empty / Error | 全复用 |
| **SkeletonGrid** | 骨架屏 | `count`, `density` | 随 density | 全复用 |
| **FilterSortBar** | 筛排 | `filters[]`, `sort[]` | — | 全复用 |
| **Pager** | 分页 | `page`, `total` | — | 全复用 |

**原则**：Shell / Index / Stats / Placeholder / Skeleton / Pager / FilterSort **全复用**；EntityCard 与 ArchiveHero **共享外壳 + 按实体传插槽**（variant 切换，零重做）。

---

## 4. Studio 图鉴如何「数据少不空、数据多不乱」

- **密度阈值**：`works ≤ 3` → compact；`≥ 12` → dense；中间 → standard。由 ArchiveShell 计算注入 `--archive-density`。
- **稀疏态（1~3 部）**
  - 禁用稀疏网格；改用「1 张特色大卡 + 简介 + 余下小卡拼贴」。
  - AZIndex 隐藏（available 不足）。
  - Hero 副文案 / 统计 / 简介填留白，StatsBar 单行。
  - 目的：用编辑式留白与叙事显得「精致」而非「空」。
- **空态（0 部）**：ArchivePlaceholder(Empty)「该组暂未收录作品」。
- **密集态（≥ 12 部）**
  - 网格 +1 列（4→5/6）。
  - AZIndex sticky 强依赖；Pager / 无限滚动。
  - 卡片降载（仅封面 + 名 + 作品数，隐多余 meta）。
  - StatsBar 加均值 / 年份分布。
- **决策**：组件读 `--archive-density` 切换内边距 / 字号 / 列数。compact 用 `--space-lg`、dense 用 `--space-sm`。

---

## 5. Creator 图鉴如何无缝接入同一套系统（零重做）

1. `ArchiveShell entity="creator"` 直接复用。
2. `ArchiveHero variant="person"`（头像 + 姓名 + 角色）。
3. `EntityCard variant="creator"`：插槽 `media=头像`、`body=角色标签+作品数`、`extra=隶属组胶囊`。
4. 「隶属制作组」横向胶囊行（复用 Tag，非新组件）。
5. `StatsBar items=[作品数, 隶属组, 活跃年]`。
6. AZIndex 按 Creator 名首字母；Placeholder / Skeleton / Pager 全复用。

---

## 6. 哪些设计可复用于标签页 / 系列页 / 专题页

| 页面 | Shell | AZIndex | Hero | StatsBar | EntityCard | Placeholder | Skeleton | Pager |
|------|-------|---------|------|----------|-----------|-------------|----------|-------|
| Studio | ✓ | ✓字母 | org | ✓ | studio | ✓ | ✓ | ✓ |
| Creator | ✓ | ✓字母 | person | ✓ | creator | ✓ | ✓ | ✓ |
| Collection | ✓ | ✗有序 | series | ✓ | collection | ✓ | ✓ | ✓ |
| 标签页 | ✓ | ✓热度/字母 | tag | ✓ | game | ✓ | ✓ | ✓ |
| 系列页 | ✓ | ✗ | series | ✓ | collection | ✓ | ✓ | ✓ |
| 专题页 | ✓ | ✗ | longform | ✓ | game | ✓ | ✓ | ✓ |

- **标签页**：Shell + AZIndex(按 tag 首字母/热度) + EntityCard(game) + StatsBar(作品数/均分)。
- **系列页** ≈ Collection 变体（已是同一套）。
- **专题页**：ArchiveHero(longform) + 内容流 + EntityCard(game)。

---

## 确认后 M1 起点建议
先抽 **ArchiveShell + EntityCard(三变体外壳) + ArchiveHero(三变体)** 三个公共组件——它们是所有页面的骨架与卡片契约基础；随后补 AZIndex 与 StatsBar。Studio 页作为首个落地，验证 `--archive-density` 密度令牌与 ArchivePlaceholder 三态。
