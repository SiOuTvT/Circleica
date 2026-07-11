-- 兼容已有部署：将迁移前已存在的所有用户标记为已验证
-- 这些用户在邮箱验证功能上线前就已注册，不应被锁定
UPDATE "User" SET "emailVerified" = true WHERE "emailVerified" = false;
