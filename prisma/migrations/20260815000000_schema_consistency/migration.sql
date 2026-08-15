-- 20260815000000 schema consistency fixes
-- 1) 补齐 WorkSourceType 枚举缺失变体（schema 定义 12 个，历史迁移仅注册 8 个：
--    GETCHU / FUWANOVEL / BOOTH 缺失）。干净库 migrate deploy 后若应用写入这三源
--    会运行时报 invalid input value for enum work sourcetype。幂等补齐（PG 12+ 支持事务内 ADD VALUE）。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'WorkSourceType' AND e.enumlabel = 'GETCHU'
  ) THEN
    ALTER TYPE "WorkSourceType" ADD VALUE 'GETCHU';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'WorkSourceType' AND e.enumlabel = 'FUWANOVEL'
  ) THEN
    ALTER TYPE "WorkSourceType" ADD VALUE 'FUWANOVEL';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'WorkSourceType' AND e.enumlabel = 'BOOTH'
  ) THEN
    ALTER TYPE "WorkSourceType" ADD VALUE 'BOOTH';
  END IF;
END
$$;

-- 2) Creator(name, source) 唯一约束：副站摄入用 resolveCreatorByName 按名软隔离，
--    但并发摄入可能插入重复 Creator。加唯一约束 + 应用层 upsert 双保险。
-- 当前库 name 已唯一（对账 0 重名），(name, source) 亦唯一，加约束安全。
-- 幂等守卫：若约束已存在（如 db push 建立的库）则不重复添加，避免 migrate deploy 报错。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Creator_name_source_unique'
  ) THEN
    ALTER TABLE "Creator" ADD CONSTRAINT "Creator_name_source_unique" UNIQUE ("name", "source");
  END IF;
END
$$;
