# 数据模型

数据库为 PostgreSQL，由 Prisma 管理。下面是与业务最直接相关的模型与约束。**字段名以 `schema.prisma` 为准**；下面对外暴露的语义用中文说明。

## 核心模型

### Game（游戏）
资源站的主体。含标题、简介、封面、标签、来源、各种计数（浏览 / 下载 / 收藏）。详情页聚合评论、资源、关联制作人。

### Creator（制作人 / 社团）
资料馆里的「谁做了这个游戏」。有 `name` 与 `source`，三者共同构成唯一身份：`(name, source)` 唯一约束防止跨来源重复录入。

### Tag（标签）
游戏分类标签。`slug` 唯一，用于资料馆可读路由。

### Studio（社团 / 发行）
与 Creator 类似但侧重组织维度。`slug` 唯一。

### CuratedCollection（精选集）
运营或用户整理的策展合集，内含若干 Game（`CuratedCollectionGame` 关联）。`slug` 唯一。

### WorkSource（资料来源）
记录某个作品在外部来源（VNDB、Steam、EGS 等）的对应关系。`(source, externalId)` 唯一，避免同一外部条目重复；`(workId, source)` 也唯一。

### Comment（评论）
游戏下的评论。`likeCount` 为缓存计数，等于 `CommentLike` 实际条数。

### CommentLike / Favorite
评论点赞、游戏收藏。前者驱动 `Comment.likeCount`，后者驱动 `Game.favoriteCount`。

### GameResource / GameResourceEntry（资源）
游戏的可下载资源与具体下载项。每个 `GameResourceEntry` 有 `downloadCount`（原子自增），`Game.downloadCount` 为这些条目的汇总缓存。

### InclusionRequest（收录申请）
用户向资料馆提交外部作品收录的请求，经审核进入资料馆数据。

## 关系

- Game 多对多关联 Tag / Creator / Studio（`GameTag` / `GameCreator` / `GameStudio`）。
- Game 一对多 Comment、GameResource。
- CuratedCollection 多对多 Game。
- WorkSource 描述作品在外部的对应，经 Galvelica 作品关联回 Game。

## slug 策略

资料馆的 Tag / Studio / Creator / CuratedCollection 路由使用 `slug`（可读、可含中日韩字符），而非数字 id，便于传播与 SEO。所有 slug 要求非空且唯一，由迁移 `slug_not_null` 与对应唯一索引保证。

## 计数器

以下为缓存计数，实际值由关联表推导，定期由对账脚本校准：

- `Game.favoriteCount` ← `Favorite`
- `Game.downloadCount` ← `GameResourceEntry.downloadCount` 汇总
- `Game.viewCount` ← 浏览事件
- `Comment.likeCount` ← `CommentLike`

> 部署前整备轮已对真实库只读核验：上述计数器与关联表实际条数**全部一致，0 偏差**。

## 约束与迁移

关键约束：

- Creator：`(name, source)` 唯一；`slug` 非空唯一。
- Tag / Studio / CuratedCollection：`slug` 非空唯一。
- WorkSource：`(source, externalId)` 唯一、`(workId, source)` 唯一。
- 外键删除策略按业务设定（如评论随游戏删除而清理）。

部署前补齐的 3 个迁移（均已应用）：

1. `slug_not_null`：把 slug 置为 NOT NULL（含空值回填守卫）。
2. `worksource_unique`：`WorkSource (source, externalId)` 唯一索引。
3. `schema_consistency`：补齐 `WorkSourceType` 枚举变体、Creator `(name, source)` 唯一约束。

## 数据维护

`scripts/` 下是对账与回填工具（非临时脚本）：slug 回填、计数器重算、孤儿清理、WorkSource 去重、迁移 / 唯一约束校验等。涉及数据写入的脚本先统计、再修复、再复核，不在正常发布流程里自动跑。
