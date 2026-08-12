CREATE TABLE IF NOT EXISTS "ViewHistory" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS "ViewHistory_userId_targetType_targetId_key" ON "ViewHistory"("userId","targetType","targetId");
CREATE INDEX IF NOT EXISTS "ViewHistory_userId_targetType_createdAt_idx" ON "ViewHistory"("userId","targetType","createdAt");
