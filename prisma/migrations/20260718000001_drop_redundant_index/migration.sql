-- Drop redundant single-column index (covered by composite [isSolved, createdAt])
DROP INDEX IF EXISTS "ForumPost_isSolved_idx";
