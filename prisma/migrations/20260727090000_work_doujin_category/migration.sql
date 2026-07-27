-- 新增「同人分类」字段：纯正同人 PURE / 同人系公司商业作 DERIVATIVE
-- Galvelica 对外展示用，由摄入脚本按生产者类型(ng/in → PURE；同人系公司白名单 → DERIVATIVE)打标。

CREATE TYPE "WorkCategory" AS ENUM ('PURE', 'DERIVATIVE');

ALTER TABLE "Work" ADD COLUMN "doujinCategory" "WorkCategory";
