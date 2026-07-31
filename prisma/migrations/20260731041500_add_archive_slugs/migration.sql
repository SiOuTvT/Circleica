-- Add slug columns to Archive entities (Studio / Creator / CuratedCollection)
-- CJK-safe stable readable route identifiers, decoupled from normalizedName.
-- Nullable + unique: backfill assigns a stable slug to every existing row.
-- NOTE: Archive 精选合集 uses the `CuratedCollection` model (table "CuratedCollection"),
-- NOT the user-personal `Collection` model. slug 必须落在 CuratedCollection 上。

ALTER TABLE "Studio" ADD COLUMN "slug" TEXT;
ALTER TABLE "Creator" ADD COLUMN "slug" TEXT;
ALTER TABLE "CuratedCollection" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");
CREATE UNIQUE INDEX "CuratedCollection_slug_key" ON "CuratedCollection"("slug");
