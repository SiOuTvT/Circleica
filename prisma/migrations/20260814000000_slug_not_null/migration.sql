-- A-5：slug NOT NULL 迁移
-- 背景：Tag/Creator/Studio/CuratedCollection 的 slug 字段原为 String?（可空），
-- 已通过 scripts/backfill-slugs.ts 回填全部 NULL/空值（Creator 6627 行、Tag 5 行）。
-- 本迁移在回填后将 4 列置为 NOT NULL。
-- 注：开发库存在历史漂移（_bak_* 表、WorkSourceType 枚举多出变体、Collection.slug 未在迁移中），
-- 导致 `prisma migrate dev` 要求 reset 全库；故该库通过 `prisma db execute` 直接应用本 DDL，未走 reset。
-- 干净部署环境可用 `prisma migrate deploy` 正常应用本迁移。

ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Studio" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Creator" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "CuratedCollection" ALTER COLUMN "slug" SET NOT NULL;
