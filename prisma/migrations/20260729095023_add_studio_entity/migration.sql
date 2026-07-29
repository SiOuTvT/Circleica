/*
  Warnings:

  - You are about to drop the column `studioName` on the `Game` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Game" DROP COLUMN "studioName";

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "aliases" TEXT NOT NULL DEFAULT '[]',
    "vndbId" TEXT,
    "producerType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameStudio" (
    "gameId" TEXT NOT NULL,
    "studioId" TEXT NOT NULL,
    "role" TEXT,

    CONSTRAINT "GameStudio_pkey" PRIMARY KEY ("gameId","studioId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Studio_normalizedName_key" ON "Studio"("normalizedName");

-- CreateIndex
CREATE INDEX "Studio_normalizedName_idx" ON "Studio"("normalizedName");

-- CreateIndex
CREATE INDEX "GameStudio_studioId_idx" ON "GameStudio"("studioId");

-- CreateIndex
CREATE INDEX "GameStudio_gameId_idx" ON "GameStudio"("gameId");

-- AddForeignKey
ALTER TABLE "GameStudio" ADD CONSTRAINT "GameStudio_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameStudio" ADD CONSTRAINT "GameStudio_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
