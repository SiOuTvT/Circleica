-- Step 1: Add serialId and uid columns to User table (nullable initially for existing data)
ALTER TABLE "User" ADD COLUMN "serialId" INTEGER;
ALTER TABLE "User" ADD COLUMN "uid" TEXT;

-- Step 2: Backfill existing users with serialId using ROW_NUMBER()
-- Ordered by createdAt to ensure deterministic ordering
WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
    FROM "User"
)
UPDATE "User" u
SET "serialId" = n.rn
FROM numbered n
WHERE u."id" = n."id";

-- Step 3: Generate uid from serialId (pad to 5 digits)
UPDATE "User"
SET "uid" = LPAD("serialId"::TEXT, 5, '0');

-- Step 4: Add NOT NULL constraints and defaults
ALTER TABLE "User" ALTER COLUMN "serialId" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "uid" SET NOT NULL;

-- Step 5: Add UNIQUE constraints
CREATE UNIQUE INDEX "User_serialId_key" ON "User"("serialId");
CREATE UNIQUE INDEX "User_uid_key" ON "User"("uid");

-- Step 6: Set up the auto-increment sequence for future inserts
-- Create sequence starting after the max existing serialId
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX("serialId"), 0) INTO max_id FROM "User";
    EXECUTE 'CREATE SEQUENCE "User_serialId_seq" START WITH ' || (max_id + 1);
    ALTER TABLE "User" ALTER COLUMN "serialId" SET DEFAULT nextval('"User_serialId_seq"');
    ALTER SEQUENCE "User_serialId_seq" OWNED BY "User"."serialId";
END $$;

-- Step 7: Add serialId to Game table
ALTER TABLE "Game" ADD COLUMN "serialId" INTEGER;

-- Step 8: Backfill existing games with serialId
WITH numbered AS (
    SELECT "id", ROW_NUMBER() OVER (ORDER BY "createdAt" ASC) AS rn
    FROM "Game"
)
UPDATE "Game" g
SET "serialId" = n.rn
FROM numbered n
WHERE g."id" = n."id";

-- Step 9: Add NOT NULL constraint for Game serialId
ALTER TABLE "Game" ALTER COLUMN "serialId" SET NOT NULL;

-- Step 10: Add UNIQUE constraint for Game serialId
CREATE UNIQUE INDEX "Game_serialId_key" ON "Game"("serialId");

-- Step 11: Set up auto-increment sequence for Game
DO $$
DECLARE
    max_id INTEGER;
BEGIN
    SELECT COALESCE(MAX("serialId"), 0) INTO max_id FROM "Game";
    EXECUTE 'CREATE SEQUENCE "Game_serialId_seq" START WITH ' || (max_id + 1);
    ALTER TABLE "Game" ALTER COLUMN "serialId" SET DEFAULT nextval('"Game_serialId_seq"');
    ALTER SEQUENCE "Game_serialId_seq" OWNED BY "Game"."serialId";
END $$;

-- Step 12: Create trigger function to auto-generate uid for new users
CREATE OR REPLACE FUNCTION generate_user_uid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW."uid" = '' OR NEW."uid" IS NULL THEN
    IF NEW."serialId" < 100000 THEN
      NEW."uid" := LPAD(NEW."serialId"::TEXT, 5, '0');
    ELSE
      NEW."uid" := NEW."serialId"::TEXT;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 13: Create trigger on User table
CREATE TRIGGER trg_generate_user_uid
BEFORE INSERT ON "User"
FOR EACH ROW
EXECUTE FUNCTION generate_user_uid();

-- Step 14: Backfill uid for any records that still have empty uid
UPDATE "User"
SET "uid" = CASE
  WHEN "serialId" < 100000 THEN LPAD("serialId"::TEXT, 5, '0')
  ELSE "serialId"::TEXT
END
WHERE "uid" = '' OR "uid" IS NULL;
