-- AlterTable
ALTER TABLE "Game" ADD COLUMN "searchVector" tsvector;

-- CreateIndex (GIN index for full-text search, not trigram)
CREATE INDEX "Game_searchVector_idx" ON "Game" USING GIN ("searchVector");

-- Fill searchVector for existing rows
UPDATE "Game" SET "searchVector" =
  setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
  setweight(to_tsvector('english', coalesce("originalWork", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("englishName", '')), 'B') ||
  setweight(to_tsvector('english', coalesce("aliases", '')), 'C') ||
  setweight(to_tsvector('english', coalesce("description", '')), 'C');

-- CreateFunction: update searchVector on row change
CREATE OR REPLACE FUNCTION game_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" :=
    setweight(to_tsvector('english', coalesce(NEW."title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW."originalWork", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."englishName", '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW."aliases", '')), 'C') ||
    setweight(to_tsvector('english', coalesce(NEW."description", '')), 'C');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER game_search_vector_update
BEFORE INSERT OR UPDATE ON "Game"
FOR EACH ROW EXECUTE FUNCTION game_search_vector_update();