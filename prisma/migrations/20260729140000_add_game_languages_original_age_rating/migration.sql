-- 新增 Game 基础信息字段：游戏语言 / 原始语言 / 年龄分级
-- 与上一迁移 add_game_platforms_official_website 一起在服务器执行 `prisma migrate deploy` 应用

ALTER TABLE "Game" ADD COLUMN "languages" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "originalLanguage" TEXT NOT NULL DEFAULT '',
ADD COLUMN "ageRating" TEXT NOT NULL DEFAULT '';
