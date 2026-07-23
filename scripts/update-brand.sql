-- 品牌重构：将站点名/描述更新为 Circleica 品牌与定位
-- 使用 UPSERT（INSERT ... ON CONFLICT）以保证幂等：
--   若 SiteSetting 表中尚无 site_name / site_description 行则插入，已有则更新。
-- 注意：SiteSetting 表的 key 为唯一约束，故 ON CONFLICT 用 key 做冲突判定。

INSERT INTO "SiteSetting" ("id", "key", "value", "updatedAt")
VALUES
  (gen_random_uuid(), 'site_name', 'Circleica', now()),
  (gen_random_uuid(), 'site_description', 'Circleica - 极客同人社区 | 完全免费开放的视觉小说档案库', now())
ON CONFLICT ("key") DO UPDATE
  SET "value" = EXCLUDED."value",
      "updatedAt" = now();
