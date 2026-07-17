-- Fix searchVector: add trigger to auto-populate from title/originalWork/englishName
-- and create GIN index on the column (not expression index)

-- 1. Backfill existing rows
UPDATE "Game"
SET "searchVector" = to_tsvector('simple',
  coalesce("title", '') || ' ' || coalesce("originalWork", '') || ' ' || coalesce("englishName", '')
);

-- 2. Drop the expression index (wrong target)
DROP INDEX IF EXISTS "Game_search_vector_gin_idx";

-- 3. Create GIN index on the actual column
CREATE INDEX IF NOT EXISTS "Game_searchVector_gin_idx"
  ON "Game" USING gin ("searchVector");

-- 4. Create trigger function to auto-update searchVector on insert/update
CREATE OR REPLACE FUNCTION game_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW."searchVector" := to_tsvector('simple',
    coalesce(NEW."title", '') || ' ' || coalesce(NEW."originalWork", '') || ' ' || coalesce(NEW."englishName", '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Attach trigger to Game table
DROP TRIGGER IF EXISTS game_search_vector_trigger ON "Game";
CREATE TRIGGER game_search_vector_trigger
  BEFORE INSERT OR UPDATE OF "title", "originalWork", "englishName"
  ON "Game"
  FOR EACH ROW
  EXECUTE FUNCTION game_search_vector_update();
