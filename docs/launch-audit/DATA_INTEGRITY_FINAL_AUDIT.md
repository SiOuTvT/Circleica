# Circleica 数据完整性最终审计（部署前整备轮）

生成日期：2026-08-16
方法：先 `prisma validate` + `migrate status` 确认迁移状态，再对真实数据库 `127.0.0.1:5432/circleica` 做**只读**核验（先统计），发现 3 个迁移未应用后按"先统计→再修复→再统计"执行 `migrate deploy`，最后重新全量只读核验（验证为 0）。

## 数据库现状（核验前）

| 表 | 行数 | 表 | 行数 |
|---|---|---|---|
| Game | 8 | CuratedCollection | 0 |
| Creator | 13,165 | WorkSource | 20,928 |
| Tag | 259 | Comment | 0 |
| Studio | 5 | Favorite | 8 |

这是一份含真实摄入数据的开发/镜像库（非生产库，但结构真实，可用作只读核验）。

## 迁移一致性（关键发现）

- `prisma validate`：schema 有效。
- `prisma migrate status`（修复前）：**3 个迁移未应用**
  - `20260814000000_slug_not_null`（slug 置 NOT NULL）
  - `20260814000001_worksource_unique`（WorkSource (source,externalId) 唯一索引）
  - `20260815000000_schema_consistency`（补 WorkSourceType 枚举变体 + Creator(name,source) 唯一约束）
- 原因：开发库历史漂移，这三个 DDL 此前经 `prisma db execute` 非破坏式应用、未在 `_prisma_migrations` 注册，故 `migrate status` 显示 pending。三个文件均为**幂等 DO 块 / IF EXISTS 守卫**，可安全经 `migrate deploy` 重新应用。

## 只读基线统计（修复前）

- slug 空值：Creator/Tag/Studio/CuratedCollection 全部 0；WorkSource 无 slug 列（其唯一性由 (source,externalId) 约束，见下）。
- slug 重复：Creator/Tag/Studio/CuratedCollection 全部 0。
- WorkSource (source,externalId) 重复组：0；(workId,source) 重复组：0。
- 孤儿：GameTag / GameCreator / GameStudio / Comment / CuratedCollectionGame / GameResource 全部 0。
- 计数器一致性：Game.favoriteCount ↔ Favorite 0 不一致；Comment.likeCount ↔ CommentLike 0 不一致；Game.downloadCount ↔ GameResourceEntry 下载量汇总 0 不一致。
- Creator(name,source) 重复：0；Game 空标题 / Creator 空名：0。

## 修复动作

应用 `npx prisma migrate deploy`（标准、幂等、前向）：成功应用上述 3 个迁移，`migrate status` 修复后无 pending。

## 修复后全量只读核验（验证为 0）

| 检查项 | 结果 |
|---|---|
| Creator/Tag/Studio/CuratedCollection slug 空值 | 0 |
| 上述四类 slug 重复 | 0 |
| WorkSource (source,externalId) 重复 | 0 |
| WorkSource (workId,source) 重复 | 0 |
| 6 类关联表孤儿 | 0 |
| Game.favoriteCount 不一致 | 0 |
| Comment.likeCount 不一致 | 0 |
| Game.downloadCount 不一致 | 0 |
| Creator(name,source) 重复 | 0 |
| Game 空标题 / Creator 空名 | 0 |

**TOTAL ANOMALIES => 0**

## 结论

数据维度达到"可部署"状态：
- Prisma schema 与数据库一致，31 个迁移全部应用（含本轮补齐的 3 个）。
- 真实数据经只读核验：slug 完整性、唯一约束、外键孤儿、计数器一致性、空值异常 —— **全部 0 异常**。
- 未做任何为审计数字而修改数据的操作；异常本就为 0，迁移补齐属标准 deploy 步骤（也是 C-6 的 migrate 门禁）。

> 备注：本轮核验针对开发/镜像库。生产库在部署服务器首次 `migrate deploy` 时同样应跑上述只读核验（脚本逻辑一致），作为 C-6/C-7 部署验收的只读核对项。
