-- Add slug columns to Archive entities (Studio / Creator / Collection)
-- CJK-safe stable readable route identifiers, decoupled from normalizedName.
-- Nullable + unique: backfill assigns a stable slug to every existing row.

ALTER TABLE "Studio" ADD COLUMN "slug" TEXT;
ALTER TABLE "Creator" ADD COLUMN "slug" TEXT;
ALTER TABLE "Collection" ADD COLUMN "slug" TEXT;

CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");
CREATE UNIQUE INDEX "Creator_slug_key" ON "Creator"("slug");
CREATE UNIQUE INDEX "Collection_slug_key" ON "Collection"("slug");
