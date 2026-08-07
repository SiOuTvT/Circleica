-- 阶段0：Work 加评分/封面分级/截图分级/质量分/内容旗标列（NSFW 合规 + 质量分排序数据源）
ALTER TABLE "Work"
  ADD COLUMN "rating" DOUBLE PRECISION,
  ADD COLUMN "coverSexual" INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN "coverViolence" INTEGER NOT NULL DEFAULT -1,
  ADD COLUMN "coverDims" JSONB,
  ADD COLUMN "coverSexualSource" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "screenshotsSexual" JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN "qualityScore" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "qualitySignal" JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN "contentFlags" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "Work_qualityScore_idx" ON "Work"("qualityScore");
CREATE INDEX IF NOT EXISTS "Work_coverSexual_idx" ON "Work"("coverSexual");
