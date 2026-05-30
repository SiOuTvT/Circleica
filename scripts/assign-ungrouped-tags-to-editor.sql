-- 将所有未分组标签（groupId IS NULL）分配到"详情页信息栏标签"预设组（合并了原编辑器标签组）
-- 幂等操作：只更新 groupId 为 NULL 的标签
UPDATE "Tag"
SET "groupId" = 'preset_detail_header'
WHERE "groupId" IS NULL;