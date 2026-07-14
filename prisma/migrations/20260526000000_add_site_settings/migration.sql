-- Add new columns to existing SiteSetting table (created by 20260512050000_add_site_setting)
ALTER TABLE "SiteSetting"
ADD COLUMN IF NOT EXISTS "id" TEXT,
ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3);

-- 填充现有行
UPDATE "SiteSetting" SET "id" = gen_random_uuid() WHERE "id" IS NULL;
UPDATE "SiteSetting" SET "updatedAt" = NOW() WHERE "updatedAt" IS NULL;

-- 设置 NOT NULL
ALTER TABLE "SiteSetting"
ALTER COLUMN "id" SET NOT NULL,
ALTER COLUMN "updatedAt" SET NOT NULL;

-- 添加 key 唯一索引（如果不存在）
CREATE UNIQUE INDEX IF NOT EXISTS "SiteSetting_key_key" ON "SiteSetting"("key");

-- Seed default placeholder (幂等)
INSERT INTO "SiteSetting" ("id", "key", "value", "updatedAt") VALUES (gen_random_uuid(), 'default_placeholder_image', '', NOW())
ON CONFLICT (key) DO NOTHING;