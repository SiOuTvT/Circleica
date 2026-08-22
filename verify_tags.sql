SELECT
  (SELECT COUNT(*) FROM "Tag" WHERE "source" = 'circleica') AS circleica_tags,
  (SELECT COUNT(*) FROM "Tag" WHERE "source" = 'circleica' AND id IN (
     SELECT DISTINCT "tagId" FROM "GameTag"
     WHERE "gameId" IN (SELECT id FROM "Game" WHERE "isPublished" = true)
  )) AS circleica_tags_with_published_game;
