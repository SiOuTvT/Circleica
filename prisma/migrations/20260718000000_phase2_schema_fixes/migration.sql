-- Phase 2: Schema fixes
-- Enums, indexes, type changes, data migration

-- 1. Create new enum types
DO $$ BEGIN
  CREATE TYPE "PlayStatusType" AS ENUM ('WANT_TO_PLAY', 'PLAYING', 'PLAYED', 'ON_HOLD', 'DROPPED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "GameStatus" AS ENUM ('FINISHED', 'ONGOING', 'HIATUS', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ForumCategory" AS ENUM ('discussion', 'question', 'showcase', 'guide', 'feedback');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('forum_post_like', 'forum_comment_like', 'forum_comment_new', 'follow', 'achievement_unlock');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationTargetType" AS ENUM ('forum_post', 'forum_comment', 'user', 'achievement');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Migrate PlayStatus.status to enum
-- Map existing Chinese values to enum constants
ALTER TABLE "PlayStatus" ADD COLUMN "status_new" "PlayStatusType";
UPDATE "PlayStatus" SET "status_new" = CASE
  WHEN "status" = '想玩' THEN 'WANT_TO_PLAY'::"PlayStatusType"
  WHEN "status" = '在玩' THEN 'PLAYING'::"PlayStatusType"
  WHEN "status" = '玩过' THEN 'PLAYED'::"PlayStatusType"
  WHEN "status" = '搁置' THEN 'ON_HOLD'::"PlayStatusType"
  WHEN "status" = '弃坑' THEN 'DROPPED'::"PlayStatusType"
  ELSE 'WANT_TO_PLAY'::"PlayStatusType"
END;
ALTER TABLE "PlayStatus" DROP COLUMN "status";
ALTER TABLE "PlayStatus" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "PlayStatus" ALTER COLUMN "status" SET DEFAULT 'WANT_TO_PLAY'::"PlayStatusType";
ALTER TABLE "PlayStatus" ALTER COLUMN "status" SET NOT NULL;

-- 3. Migrate Game.status to enum
ALTER TABLE "Game" ADD COLUMN "status_new" "GameStatus";
UPDATE "Game" SET "status_new" = CASE
  WHEN "status" = '完结' THEN 'FINISHED'::"GameStatus"
  WHEN "status" = '连载' THEN 'ONGOING'::"GameStatus"
  WHEN "status" = '休刊' THEN 'HIATUS'::"GameStatus"
  WHEN "status" = '终止' THEN 'CANCELLED'::"GameStatus"
  ELSE 'FINISHED'::"GameStatus"
END;
ALTER TABLE "Game" DROP COLUMN "status";
ALTER TABLE "Game" RENAME COLUMN "status_new" TO "status";
ALTER TABLE "Game" ALTER COLUMN "status" SET DEFAULT 'FINISHED'::"GameStatus";
ALTER TABLE "Game" ALTER COLUMN "status" SET NOT NULL;

-- 4. Migrate ForumPost.category to enum
ALTER TABLE "ForumPost" ADD COLUMN "category_new" "ForumCategory";
UPDATE "ForumPost" SET "category_new" = CASE
  WHEN "category" = 'discussion' THEN 'discussion'::"ForumCategory"
  WHEN "category" = 'question' THEN 'question'::"ForumCategory"
  WHEN "category" = 'showcase' THEN 'showcase'::"ForumCategory"
  WHEN "category" = 'guide' THEN 'guide'::"ForumCategory"
  WHEN "category" = 'feedback' THEN 'feedback'::"ForumCategory"
  ELSE 'discussion'::"ForumCategory"
END;
ALTER TABLE "ForumPost" DROP COLUMN "category";
ALTER TABLE "ForumPost" RENAME COLUMN "category_new" TO "category";
ALTER TABLE "ForumPost" ALTER COLUMN "category" SET DEFAULT 'discussion'::"ForumCategory";
ALTER TABLE "ForumPost" ALTER COLUMN "category" SET NOT NULL;

-- 5. Migrate Notification.type to enum
ALTER TABLE "Notification" ADD COLUMN "type_new" "NotificationType";
UPDATE "Notification" SET "type_new" = CASE
  WHEN "type" = 'forum_post_like' THEN 'forum_post_like'::"NotificationType"
  WHEN "type" = 'forum_comment_like' THEN 'forum_comment_like'::"NotificationType"
  WHEN "type" = 'forum_comment_new' THEN 'forum_comment_new'::"NotificationType"
  WHEN "type" = 'follow' THEN 'follow'::"NotificationType"
  ELSE 'follow'::"NotificationType"
END;
ALTER TABLE "Notification" DROP COLUMN "type";
ALTER TABLE "Notification" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "Notification" ALTER COLUMN "type" SET NOT NULL;

-- 6. Migrate Notification.targetType to enum
ALTER TABLE "Notification" ADD COLUMN "targetType_new" "NotificationTargetType";
UPDATE "Notification" SET "targetType_new" = CASE
  WHEN "targetType" = 'forum_post' THEN 'forum_post'::"NotificationTargetType"
  WHEN "targetType" = 'forum_comment' THEN 'forum_comment'::"NotificationTargetType"
  WHEN "targetType" = 'user' THEN 'user'::"NotificationTargetType"
  ELSE 'user'::"NotificationTargetType"
END;
ALTER TABLE "Notification" DROP COLUMN "targetType";
ALTER TABLE "Notification" RENAME COLUMN "targetType_new" TO "targetType";
ALTER TABLE "Notification" ALTER COLUMN "targetType" SET NOT NULL;

-- 7. User.faveGameId — add FK to Game
-- First clean up any orphaned references
UPDATE "User" SET "faveGameId" = NULL
WHERE "faveGameId" IS NOT NULL
  AND "faveGameId" NOT IN (SELECT "id" FROM "Game");

ALTER TABLE "User"
  ADD CONSTRAINT "User_faveGameId_fkey"
  FOREIGN KEY ("faveGameId") REFERENCES "Game"("id") ON DELETE SET NULL;

-- 8. TagGroup.positions — String → Json (cast existing JSON strings)
ALTER TABLE "TagGroup" ALTER COLUMN "positions" TYPE jsonb USING "positions"::jsonb;
ALTER TABLE "TagGroup" ALTER COLUMN "positions" SET DEFAULT '[]'::jsonb;

-- 9. User.uid — default '' → generate cuid for existing empty values
-- Note: cuid generation happens at app level; empty UIDs are backfilled
UPDATE "User" SET "uid" = "id" WHERE "uid" = '';

-- 10. New indexes
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");
CREATE INDEX IF NOT EXISTS "User_faveGameId_idx" ON "User"("faveGameId");
CREATE INDEX IF NOT EXISTS "Favorite_gameId_idx" ON "Favorite"("gameId");
CREATE INDEX IF NOT EXISTS "Notification_targetId_idx" ON "Notification"("targetId");

-- 11. ForumPost — replace [category, createdAt] with [isPinned, category, createdAt]
DROP INDEX IF EXISTS "ForumPost_category_createdAt_idx";
CREATE INDEX IF NOT EXISTS "ForumPost_isPinned_category_createdAt_idx" ON "ForumPost"("isPinned", "category", "createdAt");

-- 12. Drop redundant indexes (unique already creates them)
DROP INDEX IF EXISTS "EmotionalMessage_key_idx";
DROP INDEX IF EXISTS "EmailVerificationToken_tokenHash_idx";

-- 13. Drop old B-tree index on searchVector (ineffective for FTS)
DROP INDEX IF EXISTS "Game_searchVector_idx";

-- 14. Create GIN index for full-text search on Game
-- This supports Prisma's { search: q } operator which generates to_tsvector/to_tsquery
CREATE INDEX IF NOT EXISTS "Game_search_vector_gin_idx"
  ON "Game" USING gin (to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("originalWork", '') || ' ' || coalesce("englishName", '')));
