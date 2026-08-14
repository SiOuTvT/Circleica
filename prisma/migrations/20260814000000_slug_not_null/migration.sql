-- A-5：slug NOT NULL 迁移（幂等版）
-- 背景：Tag/Creator/Studio/CuratedCollection 的 slug 字段原为 String?（可空），
-- 已通过 scripts/backfill-slugs.ts 回填全部 NULL/空值（Creator 6627 行、Tag 5 行）。
-- 本迁移在回填后将 4 列置为 NOT NULL。
-- 注：开发库存在历史漂移（_bak_* 表、WorkSourceType 枚举多出变体、Collection.slug 未在迁移中），
-- 导致 `prisma migrate dev` 要求 reset 全库；故该库通过 `prisma db execute` 直接应用本 DDL，未走 reset，
-- 因而本迁移文件在 _prisma_migrations 中未注册、migrate status 显示 pending。
-- 为兼容「已应用过的库」与「干净生产库」两种场景，改为幂等 DO 块：
--   仅当列当前可空时才补回填并执行 SET NOT NULL；已 NOT NULL 则安全跳过，避免 migrate deploy 重复执行报错。

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Tag' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    UPDATE "Tag" SET slug = 'tag-' || id WHERE slug IS NULL OR slug = '';
    ALTER TABLE "Tag" ALTER COLUMN "slug" SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Studio' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    UPDATE "Studio" SET slug = 'studio-' || id WHERE slug IS NULL OR slug = '';
    ALTER TABLE "Studio" ALTER COLUMN "slug" SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Creator' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    UPDATE "Creator" SET slug = 'creator-' || id WHERE slug IS NULL OR slug = '';
    ALTER TABLE "Creator" ALTER COLUMN "slug" SET NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'CuratedCollection' AND column_name = 'slug' AND is_nullable = 'YES'
  ) THEN
    UPDATE "CuratedCollection" SET slug = 'cc-' || id WHERE slug IS NULL OR slug = '';
    ALTER TABLE "CuratedCollection" ALTER COLUMN "slug" SET NOT NULL;
  END IF;
END $$;
