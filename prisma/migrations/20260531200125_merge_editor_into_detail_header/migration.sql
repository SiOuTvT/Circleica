-- 将"编辑器标签"组合并入"详情页信息栏标签"组
-- 1. 将编辑器标签组的标签转移到详情页信息栏标签组
-- 2. 删除编辑器标签组

-- 更新详情页信息栏标签组的 positions
UPDATE "TagGroup"
SET positions = '["detail_header","detail_related","resource_card"]'
WHERE id = 'preset_detail_header';

-- 将属于编辑器标签组的标签转移到详情页信息栏标签组
UPDATE "Tag"
SET "groupId" = 'preset_detail_header'
WHERE "groupId" = 'preset_editor';

-- 删除编辑器标签组
DELETE FROM "TagGroup"
WHERE id = 'preset_editor';