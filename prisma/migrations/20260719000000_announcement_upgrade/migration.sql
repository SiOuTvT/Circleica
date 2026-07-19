-- AlterTable: Add summary, status, isPinned columns
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'published';
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: isActive=false → status='hidden'
UPDATE "Announcement" SET "status" = 'hidden' WHERE "isActive" = false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Announcement_status_idx" ON "Announcement"("status");
