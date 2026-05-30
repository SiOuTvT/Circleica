-- 修复标签组描述的中文编码问题
-- 执行方式: Get-Content scripts/fix-tag-group-descriptions.sql | npx prisma db execute --stdin --schema prisma/schema.prisma

UPDATE "TagGroup"
SET "description" = '游戏制作风格标签，如：纯爱、拔作、剧情作、萌作'
WHERE "name" = '首页卡片标签';

UPDATE "TagGroup"
SET "description" = '详情页信息栏和游戏编辑器共用标签，如：题材、分级、游戏类型'
WHERE "name" = '详情页信息栏标签';

UPDATE "TagGroup"
SET "description" = '个人中心和收藏页标签，如：游玩状态、收藏分类'
WHERE "name" = '个人中心标签';

UPDATE "TagGroup"
SET "description" = '发现页标签云和排行榜标签，如：热门题材、风格分类'
WHERE "name" = '发现页标签';