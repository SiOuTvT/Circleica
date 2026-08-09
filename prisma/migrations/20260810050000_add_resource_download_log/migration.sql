-- CreateTable
CREATE TABLE "ResourceDownloadLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "downloadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResourceDownloadLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResourceDownloadLog_userId_downloadedAt_idx" ON "ResourceDownloadLog"("userId", "downloadedAt");

-- CreateIndex
CREATE INDEX "ResourceDownloadLog_gameId_idx" ON "ResourceDownloadLog"("gameId");

-- AddForeignKey
ALTER TABLE "ResourceDownloadLog" ADD CONSTRAINT "ResourceDownloadLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownloadLog" ADD CONSTRAINT "ResourceDownloadLog_resourceId_fkey" FOREIGN KEY ("resourceId") REFERENCES "GameResource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResourceDownloadLog" ADD CONSTRAINT "ResourceDownloadLog_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
