-- 印记商店（marks shop）
-- 1) AvatarFrame 增加价格（0=免费，>0=需印记兑换）
-- 2) User 增加已消费印记累计（可用余额 = 总印记 - marksSpent）
-- 3) UserAvatarFrame 记录已购买的头像框，避免重复扣费
-- 说明：本迁移为手动增量迁移（因开发库存在历史遗留漂移，不可 prisma migrate dev reset）。

-- AlterTable: AvatarFrame
ALTER TABLE "AvatarFrame" ADD COLUMN "price" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: User
ALTER TABLE "User" ADD COLUMN "marksSpent" INTEGER NOT NULL DEFAULT 0;

-- CreateTable: UserAvatarFrame
CREATE TABLE "UserAvatarFrame" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "avatarFrameId" TEXT NOT NULL,
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserAvatarFrame_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserAvatarFrame_userId_avatarFrameId_key" ON "UserAvatarFrame"("userId", "avatarFrameId");
CREATE INDEX "UserAvatarFrame_userId_idx" ON "UserAvatarFrame"("userId");
CREATE INDEX "AvatarFrame_price_idx" ON "AvatarFrame"("price");

-- AddForeignKey
ALTER TABLE "UserAvatarFrame" ADD CONSTRAINT "UserAvatarFrame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAvatarFrame" ADD CONSTRAINT "UserAvatarFrame_avatarFrameId_fkey" FOREIGN KEY ("avatarFrameId") REFERENCES "AvatarFrame"("id") ON DELETE CASCADE ON UPDATE CASCADE;
