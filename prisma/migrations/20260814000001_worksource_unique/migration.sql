-- A-6：WorkSource (source, externalId) 唯一约束
-- 背景：原仅普通索引，同源同 externalId 可重复插入导致资料馆重复收录。
-- 对账确认现有 0 重复组后加唯一约束。
-- 开发库存在历史漂移，本 DDL 通过 `prisma db execute` 非破坏式应用（未走 migrate reset）。

DROP INDEX IF EXISTS "WorkSource_source_externalId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "WorkSource_source_externalId_key"
  ON "WorkSource" ("source", "externalId");
