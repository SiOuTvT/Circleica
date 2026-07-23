-- 品牌更名：将系统配置表（SiteSetting）中的站点名称 / 描述更新为 Circleica
-- 代码里 site_name / site_description 仅有 fallback 默认值，真实值存于数据库。
-- 在数据库（与 DATABASE_URL 对应的 Postgres）中执行本文件即可生效，无需重新部署。
--
-- 注意：Prisma model 为 SiteSetting，默认表名 "SiteSetting"（首字母大写）。
--       若你的库中表名为小写 site_setting，请将下面两处表名改为 "site_setting"。

UPDATE "SiteSetting"
SET "value" = 'Circleica'
WHERE "key" = 'site_name';

UPDATE "SiteSetting"
SET "value" = 'Circleica - 极客同人社区 | 完全免费开放的视觉小说档案库'
WHERE "key" = 'site_description';
