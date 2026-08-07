-- AlterTable
-- 方案B（2026-08-07）：Work 增加截图/平台/语言/原语言/官网列，与 Game 同名列类型一致。
-- 注：本迁移手工以 `prisma db execute` 应用（项目迁移历史存在既有漂移，migrate dev 会要求 reset，不可行）。
ALTER TABLE "Work" ADD COLUMN "screenshots" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "platforms" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "languages" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "originalLanguage" TEXT NOT NULL DEFAULT '',
ADD COLUMN "officialWebsite" TEXT NOT NULL DEFAULT '';
