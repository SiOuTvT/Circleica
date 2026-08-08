-- 移除游玩状态系统（PlayStatus）
-- 删除 PlayStatus 表 + PlayStatusType 枚举（已确认无其他业务依赖）
-- 说明：手动增量迁移（开发库存在历史遗留漂移，不可 prisma migrate dev reset）。

-- DropForeignKey
ALTER TABLE "PlayStatus" DROP CONSTRAINT "PlayStatus_gameId_fkey";
ALTER TABLE "PlayStatus" DROP CONSTRAINT "PlayStatus_userId_fkey";

-- DropTable
DROP TABLE "PlayStatus";

-- DropEnum
DROP TYPE "PlayStatusType";
