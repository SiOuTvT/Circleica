-- CreateEnum
CREATE TYPE "WorkSourceType" AS ENUM ('VNDB', 'BANGUMI', 'EROGESCAPE', 'DLSITE', 'STEAM', 'MANUAL');

-- CreateEnum
CREATE TYPE "InclusionRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- DropForeignKey
ALTER TABLE "User" DROP CONSTRAINT "User_faveGameId_fkey";

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "uid" DROP DEFAULT;

-- CreateTable
CREATE TABLE "Work" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "gameId" TEXT,
    "title" TEXT NOT NULL,
    "originalWork" TEXT NOT NULL DEFAULT '',
    "englishName" TEXT NOT NULL DEFAULT '',
    "aliases" TEXT NOT NULL DEFAULT '',
    "description" TEXT NOT NULL DEFAULT '',
    "coverImage" TEXT NOT NULL DEFAULT '',
    "releaseDate" TIMESTAMP(3),
    "studioName" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT '',
    "duration" TEXT NOT NULL DEFAULT '',
    "isNsfw" BOOLEAN NOT NULL DEFAULT false,
    "officialUrl" TEXT NOT NULL DEFAULT '',
    "steamAppId" TEXT NOT NULL DEFAULT '',
    "provenance" JSONB NOT NULL DEFAULT '{}',
    "manualFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ratingAvg" DOUBLE PRECISION,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastFusedAt" TIMESTAMP(3),

    CONSTRAINT "Work_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkSource" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "source" "WorkSourceType" NOT NULL,
    "externalId" TEXT NOT NULL,
    "raw" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ok',
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InclusionRequest" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "requestedBy" TEXT,
    "status" "InclusionRequestStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT NOT NULL DEFAULT '',
    "reviewedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InclusionRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkTag" (
    "workId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,

    CONSTRAINT "WorkTag_pkey" PRIMARY KEY ("workId","tagId")
);

-- CreateTable
CREATE TABLE "WorkCreator" (
    "id" TEXT NOT NULL,
    "workId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "role" TEXT NOT NULL,

    CONSTRAINT "WorkCreator_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Work_slug_key" ON "Work"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Work_gameId_key" ON "Work"("gameId");

-- CreateIndex
CREATE INDEX "Work_title_idx" ON "Work"("title");

-- CreateIndex
CREATE INDEX "Work_releaseDate_idx" ON "Work"("releaseDate");

-- CreateIndex
CREATE INDEX "Work_isNsfw_idx" ON "Work"("isNsfw");

-- CreateIndex
CREATE INDEX "WorkSource_source_externalId_idx" ON "WorkSource"("source", "externalId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkSource_workId_source_key" ON "WorkSource"("workId", "source");

-- CreateIndex
CREATE INDEX "InclusionRequest_status_idx" ON "InclusionRequest"("status");

-- CreateIndex
CREATE INDEX "InclusionRequest_workId_idx" ON "InclusionRequest"("workId");

-- CreateIndex
CREATE INDEX "WorkTag_tagId_idx" ON "WorkTag"("tagId");

-- CreateIndex
CREATE INDEX "WorkCreator_creatorId_idx" ON "WorkCreator"("creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkCreator_workId_creatorId_role_key" ON "WorkCreator"("workId", "creatorId", "role");

-- CreateIndex
CREATE INDEX "ForumPost_category_idx" ON "ForumPost"("category");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_faveGameId_fkey" FOREIGN KEY ("faveGameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Work" ADD CONSTRAINT "Work_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkSource" ADD CONSTRAINT "WorkSource_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InclusionRequest" ADD CONSTRAINT "InclusionRequest_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTag" ADD CONSTRAINT "WorkTag_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkTag" ADD CONSTRAINT "WorkTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCreator" ADD CONSTRAINT "WorkCreator_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkCreator" ADD CONSTRAINT "WorkCreator_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "Creator"("id") ON DELETE CASCADE ON UPDATE CASCADE;
