-- CreateTable
CREATE TABLE "ViewHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ViewHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ViewHistory_userId_targetType_targetId_key" ON "ViewHistory"("userId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "ViewHistory_userId_targetType_createdAt_idx" ON "ViewHistory"("userId", "targetType", "createdAt");
