-- A-5：slug NOT NULL 迁移（非破坏性，数据已回填）
-- 历史漂移（_bak_* 表 / WorkSourceType 枚举多出变体 / Collection.slug 未在迁移中）导致
-- `prisma migrate dev` 要求 reset 全库，故此处直接用 DDL 应用，避免清空数据。
-- 仅对 4 个 slug 字段置非空；全部行已回填，SET NOT NULL 安全。

ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Studio" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "Creator" ALTER COLUMN "slug" SET NOT NULL;
ALTER TABLE "CuratedCollection" ALTER COLUMN "slug" SET NOT NULL;
