-- 合并"编辑器标签"组到"详情页信息栏标签"组
-- 步骤1: 将编辑器标签组中的所有标签转移到详情页信息栏标签组
UPDATE "Tag"
SET "groupId" = 'preset_detail_header'
WHERE "groupId" = 'preset_editor';

-- 步骤2: 更新详情页信息栏标签组的positions，包含game_form
UPDATE "TagGroup"
SET "positions" = '["detail_header","detail_related","resource_card","game_form"]',
    "description" = '游戏详情页和编辑器表单中展示的标签，用于详细了解游戏属性和后台编辑选择'
WHERE "id" = 'preset_detail_header';

-- 步骤3: 删除编辑器标签组
DELETE FROM "TagGroup" WHERE "id" = 'preset_editor';