# 🎯 代码优化和部署完整指南

## ✅ 已完成的优化（共10项）

### 🔒 安全修复
1. ✅ **环境变量保护** - 创建 `.env.example`，防止敏感信息泄露
2. ✅ **图片域名白名单** - 限制只允许 UploadThing 和 VNDB
3. ✅ **XSS 防护** - 评论和论坛系统添加 HTML 转义
4. ✅ **API 速率限制** - 防止暴力攻击和滥用
5. ✅ **输入验证增强** - 邮箱、用户名格式验证，长度限制

### 🚀 性能优化
6. ✅ **竞态条件修复** - 收藏功能使用事务确保数据一致性
7. ✅ **数据库索引优化** - 添加13个索引提升查询性能
8. ✅ **统一过滤器** - NSFW 过滤逻辑统一管理

### 🛠️ 代码质量
9. ✅ **错误处理改进** - 创建日志工具，添加结构化日志
10. ✅ **签到逻辑加固** - 移除 localStorage 依赖，完全后端验证

---

## 📦 新增文件清单

```
├── .env.example                          # 环境变量模板
├── src/lib/
│   ├── rate-limit.ts                     # 速率限制器
│   ├── middleware.ts                     # API 中间件
│   ├── filters.ts                        # 统一过滤器
│   └── logger.ts                         # 日志工具
├── OPTIMIZATION_SUMMARY.md               # 优化详细文档
├── DEPLOY_GUIDE.md                       # 完整部署指南
├── checklist.md                          # 快速部署清单
└── README_部署.md                        # 本文件
```

---

## 🚀 服务器部署（小白版）

### 第一步：准备服务器

你需要：
- 一台 Linux 服务器（推荐 Ubuntu 20.04+）
- 服务器的 root 密码
- PostgreSQL 数据库（可以在服务器上安装）

### 第二步：在本地打包文件

1. **不要包含这些文件夹**：
   - ❌ `node_modules/`
   - ❌ `.next/`
   - ❌ `.git/`

2. **需要包含的文件**：
   - ✅ `src/`
   - ✅ `prisma/`
   - ✅ `public/`
   - ✅ `package.json`
   - ✅ `package-lock.json`
   - ✅ `next.config.ts`
   - ✅ `tsconfig.json`
   - ✅ `components.json`
   - ✅ `.env` (你自己创建的)

3. 压缩成 zip 文件

### 第三步：配置 .env 文件

在本地创建 `.env` 文件：

```env
DATABASE_URL="postgresql://fangame:你的密码@localhost:5432/fangame"
NEXTAUTH_SECRET="访问 https://generate-secret.vercel.app/32 生成"
NEXTAUTH_URL="http://你的服务器IP"
UPLOADTHING_TOKEN="从 uploadthing.com 获取"
```

### 第四步：上传到服务器

使用 FileZilla：
1. 下载 FileZilla: https://filezilla-project.org/
2. 连接信息：
   - 主机: `sftp://你的服务器IP`
   - 用户名: `root`
   - 密码: 你的服务器密码
   - 端口: `22`
3. 上传到: `/var/www/fangame-next/`

### 第五步：在服务器上执行命令

连接到服务器后，依次执行：

```bash
# 1. 安装必要软件
apt update && apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs postgresql nginx unzip
npm install -g pm2

# 2. 配置数据库
sudo -i -u postgres
psql -c "CREATE USER fangame WITH PASSWORD '设置密码';"
psql -c "CREATE DATABASE fangame OWNER fangame;"
psql -c "GRANT ALL PRIVILEGES ON DATABASE fangame TO fangame;"
exit

# 3. 修改 PostgreSQL 认证
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' $PG_HBA
systemctl restart postgresql

# 4. 进入项目目录
cd /var/www/fangame-next
unzip fangame-next.zip  # 如果上传的是zip
rm fangame-next.zip

# 5. 安装依赖和构建
npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# 6. 启动项目
pm2 start npm --name "fangame-next" -- start
pm2 startup
pm2 save

# 7. 配置 Nginx
cat > /etc/nginx/sites-available/fangame-next << 'EOF'
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

ln -s /etc/nginx/sites-available/fangame-next /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx

# 8. 配置防火墙
ufw allow OpenSSH
ufw allow 'Nginx Full'
echo "y" | ufw enable
```

### 第六步：测试网站

在浏览器访问：`http://你的服务器IP`

---

## 🔍 故障排查

### 网站无法访问？

```bash
# 检查服务状态
systemctl status nginx
pm2 status
systemctl status postgresql

# 查看日志
pm2 logs fangame-next --lines 50
tail -n 50 /var/log/nginx/error.log
```

### 数据库连接失败？

```bash
# 测试连接
PGPASSWORD='你的密码' psql -U fangame -d fangame -h localhost -c "SELECT 1;"
```

### 内存不足？

```bash
# 添加 2GB 交换空间
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 📊 常用维护命令

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs fangame-next

# 重启
pm2 restart fangame-next

# 更新代码
cd /var/www/fangame-next
npm install
npx prisma migrate deploy
npm run build
pm2 restart fangame-next
```

---

## ⚠️ 重要提醒

### 必须做的事情

1. **更换密钥**：
   - NEXTAUTH_SECRET（必须重新生成）
   - 数据库密码（设置强密码）
   - UPLOADTHING_TOKEN（注册获取）

2. **创建管理员账号**：
   ```bash
   # 在服务器上执行
   PGPASSWORD='你的密码' psql -U fangame -d fangame -h localhost
   ```
   ```sql
   -- 将某个用户设为管理员
   UPDATE "User" SET role = 'ADMIN' WHERE username = '你的用户名';
   ```

3. **定期备份数据库**：
   ```bash
   # 备份
   PGPASSWORD='密码' pg_dump -U fangame -h localhost fangame > backup.sql

   # 恢复
   PGPASSWORD='密码' psql -U fangame -h localhost fangame < backup.sql
   ```

---

## 📚 相关文档

- `OPTIMIZATION_SUMMARY.md` - 详细的优化说明
- `DEPLOY_GUIDE.md` - 完整的部署教程（含截图说明）
- `checklist.md` - 快速部署检查清单

---

## 🎉 完成！

如果一切顺利，你的网站已经在线运行了！

祝你使用愉快！有任何问题可以查看日志找出错误信息。
