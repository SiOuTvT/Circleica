-- 主题配置导出（原生 SQL 版本）
-- 用法：psql -d fangame -f scripts/export-theme.sql

SELECT value FROM "SiteSetting" WHERE key = 'theme';