-- 将「关联到至少一个已发布主站游戏」的标签归为主站来源 circleica。
-- 仅修正 games.ts 修复前因同名被复用为副站来源的历史数据；副站纯作品标签不受影响。
UPDATE "Tag"
SET "source" = 'circleica'
WHERE id IN (
  SELECT DISTINCT "tagId"
  FROM "GameTag"
  WHERE "gameId" IN (SELECT id FROM "Game" WHERE "isPublished" = true)
);
