-- 验证标签分组状态
SELECT 
  COALESCE(tg.name, '(未分组)') as "分组",
  COUNT(*) as "标签数"
FROM "Tag" t
LEFT JOIN "TagGroup" tg ON t."groupId" = tg.id
GROUP BY tg.name
ORDER BY "标签数" DESC;