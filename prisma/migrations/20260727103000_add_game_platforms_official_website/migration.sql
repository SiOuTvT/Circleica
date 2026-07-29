-- CreateTable / AlterTable
-- 为 Game 模型新增：支持平台（platforms，JSONB 数组，存 VNDB 平台代码）与官方网站（officialWebsite，TEXT）
-- 通过统一的 VNDB 导入管道（Normalize → DTO → adminGameService.create/update）落库
-- 该迁移仅生成、未应用；部署阶段由 `prisma migrate deploy` 在服务器执行

-- AlterTable
ALTER TABLE "Game" ADD COLUMN "platforms" JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN "officialWebsite" TEXT NOT NULL DEFAULT '';
