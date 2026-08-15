SELECT 'Creator_slug_null' AS chk, COUNT(*) FROM "Creator" WHERE "slug" IS NULL OR "slug"='';
SELECT 'Tag_slug_null' AS chk, COUNT(*) FROM "Tag" WHERE "slug" IS NULL OR "slug"='';
SELECT 'Studio_slug_null' AS chk, COUNT(*) FROM "Studio" WHERE "slug" IS NULL OR "slug"='';
SELECT 'CuratedCollection_slug_null' AS chk, COUNT(*) FROM "CuratedCollection" WHERE "slug" IS NULL OR "slug"='';
SELECT 'WorkSource_slug_null' AS chk, COUNT(*) FROM "WorkSource" WHERE "slug" IS NULL OR "slug"='';

SELECT 'Creator_dup_slug' AS chk, COUNT(*) FROM (SELECT "slug" FROM "Creator" GROUP BY "slug" HAVING COUNT(*)>1) x;
SELECT 'Tag_dup_slug' AS chk, COUNT(*) FROM (SELECT "slug" FROM "Tag" GROUP BY "slug" HAVING COUNT(*)>1) x;
SELECT 'Studio_dup_slug' AS chk, COUNT(*) FROM (SELECT "slug" FROM "Studio" GROUP BY "slug" HAVING COUNT(*)>1) x;
SELECT 'CuratedCollection_dup_slug' AS chk, COUNT(*) FROM (SELECT "slug" FROM "CuratedCollection" GROUP BY "slug" HAVING COUNT(*)>1) x;
SELECT 'WorkSource_dup_slug' AS chk, COUNT(*) FROM (SELECT "slug" FROM "WorkSource" GROUP BY "slug" HAVING COUNT(*)>1) x;

SELECT 'GameTag_orphan' AS chk, COUNT(*) FROM "GameTag" gt LEFT JOIN "Game" g ON gt."gameId"=g.id WHERE g.id IS NULL;
SELECT 'GameCreator_orphan' AS chk, COUNT(*) FROM "GameCreator" gc LEFT JOIN "Game" g ON gc."gameId"=g.id WHERE g.id IS NULL;
SELECT 'GameStudio_orphan' AS chk, COUNT(*) FROM "GameStudio" gs LEFT JOIN "Game" g ON gs."gameId"=g.id WHERE g.id IS NULL;
SELECT 'Comment_orphan' AS chk, COUNT(*) FROM "Comment" c LEFT JOIN "Game" g ON c."gameId"=g.id WHERE g.id IS NULL;
SELECT 'CuratedCollectionGame_orphan' AS chk, COUNT(*) FROM "CuratedCollectionGame" cg LEFT JOIN "CuratedCollection" cc ON cg."collectionId"=cc.id WHERE cc.id IS NULL;
SELECT 'GameResource_orphan' AS chk, COUNT(*) FROM "GameResource" gr LEFT JOIN "Game" g ON gr."gameId"=g.id WHERE g.id IS NULL;

SELECT 'Game_favoriteCount_mismatch' AS chk, COUNT(*) FROM "Game" g WHERE g."favoriteCount" <> (SELECT COUNT(*) FROM "Favorite" f WHERE f."gameId"=g.id);
SELECT 'Comment_likeCount_mismatch' AS chk, COUNT(*) FROM "Comment" c WHERE c."likeCount" <> (SELECT COUNT(*) FROM "CommentLike" cl WHERE cl."commentId"=c.id);
SELECT 'Game_downloadCount_mismatch' AS chk, COUNT(*) FROM "Game" g WHERE g."downloadCount" <> (SELECT COALESCE(SUM(gre."downloadCount"),0) FROM "GameResource" gr JOIN "GameResourceEntry" gre ON gre."resourceId"=gr.id WHERE gr."gameId"=g.id);

SELECT 'Creator_dup_name_source' AS chk, COUNT(*) FROM (SELECT "name","source" FROM "Creator" GROUP BY "name","source" HAVING COUNT(*)>1) x;

SELECT 'Game_empty_title' AS chk, COUNT(*) FROM "Game" WHERE "title"='' OR "title" IS NULL;
SELECT 'Creator_empty_name' AS chk, COUNT(*) FROM "Creator" WHERE "name"='' OR "name" IS NULL;

SELECT 'row_Game' AS chk, COUNT(*) FROM "Game";
SELECT 'row_Creator' AS chk, COUNT(*) FROM "Creator";
SELECT 'row_Tag' AS chk, COUNT(*) FROM "Tag";
SELECT 'row_Studio' AS chk, COUNT(*) FROM "Studio";
SELECT 'row_CuratedCollection' AS chk, COUNT(*) FROM "CuratedCollection";
SELECT 'row_WorkSource' AS chk, COUNT(*) FROM "WorkSource";
SELECT 'row_Comment' AS chk, COUNT(*) FROM "Comment";
SELECT 'row_Favorite' AS chk, COUNT(*) FROM "Favorite";
