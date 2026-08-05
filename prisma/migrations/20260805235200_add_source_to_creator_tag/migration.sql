-- 数据来源标记：circleica=主站 / galvelica=副站。
-- 用途（主副站数据隔离）：主站读取恒过滤 source='circleica'，
-- 副站(Galvelica)摄入写入时打 source='galvelica'，从根本上杜绝副站数据窜入主站。
-- 存量行全部回填为 'circleica'（默认），未来副站写入才会是 'galvelica'。
-- Postgres：NOT NULL + DEFAULT 一次性 ALTER 回填，安全无锁表风险。

ALTER TABLE "Creator" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'circleica';

ALTER TABLE "Tag" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'circleica';

CREATE INDEX "Creator_source_idx" ON "Creator"("source");

CREATE INDEX "Tag_source_idx" ON "Tag"("source");
