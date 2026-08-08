-- 新增私聊通知类型
-- 说明：手动增量迁移（开发库存在历史遗留漂移，不可 prisma migrate dev reset）。

-- AlterEnum
ALTER TYPE "NotificationTypeEnum" ADD VALUE 'private_message';
ALTER TYPE "NotificationTargetTypeEnum" ADD VALUE 'conversation';
