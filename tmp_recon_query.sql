SELECT table_name, column_name, is_nullable
FROM information_schema.columns
WHERE column_name = 'slug' AND table_schema = 'public'
ORDER BY table_name;
