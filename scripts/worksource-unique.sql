-- A-6：WorkSource (source, externalId) 唯一约束
-- 背景：原仅 @@index([source, externalId]) 非唯一，同源同 externalId 可重复插入导致资料馆重复收录。
-- 对账（scripts/reconcile-worksource.ts）确认现有 0 重复组，可直接加唯一约束。
-- 因开发库存在历史漂移，复用 A-5 方式：prisma db execute 非破坏式应用，未走 migrate reset。

-- 先删除原普通索引（如存在），再建唯一索引（与 Prisma @@unique 命名一致）。
DROP INDEX IF EXISTS "WorkSource_source_externalId_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "WorkSource_source_externalId_key"
  ON "WorkSource" ("source", "externalId");
