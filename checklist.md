# 部署前检查清单

在上传文件到服务器之前，请确认以下内容：

## ✅ 代码检查

- [x] 所有优化已完成
- [x] 没有语法错误
- [x] 新增的工具文件已创建

## 📝 你需要准备的内容

### 1. 环境变量 (.env 文件)

在本地创建一个 `.env` 文件，包含以下内容：

```env
DATABASE_URL="postgresql://fangame:你的数据库密码@localhost:5432/fangame"
NEXTAUTH_SECRET="随机生成的32位字符串"
NEXTAUTH_URL="http://你的服务器IP或域名"
UPLOADTHING_TOKEN="sk_live_从uploadthing.com获取"
```

**重要提醒**：
- ⚠️ 必须更换 `NEXTAUTH_SECRET`（访问 https://generate-secret.vercel.app/32 生成）
- ⚠️ 必须设置正确的数据库密码
- ⚠️ 必须修改 `NEXTAUTH_URL` 为你的实际地址

### 2. 文件打包

需要上传到服务器的文件：
- ✅ `src/` 文件夹
- ✅ `prisma/` 文件夹
- ✅ `public/` 文件夹
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `next.config.ts`
- ✅ `tsconfig.json`
- ✅ `.env` 文件（你刚创建的）
- ✅ `components.json`
- ✅ `eslint.config.mjs`
- ✅ `postcss.config.mjs`

**不要上传**：
- ❌ `node_modules/` 文件夹
- ❌ `.next/` 文件夹
- ❌ `.git/` 文件夹
- ❌ 任何 `.md` 文档文件（可选，不传也可以）

---

## 🚀 服务器部署步骤（快速版）

### 第一步：连接服务器

```bash
ssh root@你的服务器IP
```

### 第二步：运行一键安装脚本

复制下面的所有内容，粘贴到服务器终端执行：

```bash
#!/bin/bash
echo "开始安装必要的软件..."

# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib

# 安装 Nginx
apt install -y nginx

# 安装 PM2
npm install -g pm2

# 安装 unzip（用于解压）
apt install -y unzip

echo "✅ 软件安装完成！"
echo "Node版本: $(node --version)"
echo "NPM版本: $(npm --version)"
echo "PostgreSQL版本: $(psql --version)"
echo "Nginx版本: $(nginx -v 2>&1)"
echo "PM2版本: $(pm2 --version)"
```

### 第三步：配置数据库

```bash
# 切换到 postgres 用户
sudo -i -u postgres

# 进入 PostgreSQL
psql << EOF
CREATE USER fangame WITH PASSWORD '设置一个强密码';
CREATE DATABASE fangame OWNER fangame;
GRANT ALL PRIVILEGES ON DATABASE fangame TO fangame;
EOF

# 退出
exit
```

**记住你设置的密码！**

### 第四步：修改 PostgreSQL 认证方式

```bash
# 找到配置文件并修改
PG_HBA=$(find /etc/postgresql -name pg_hba.conf | head -1)
sed -i 's/local   all             all                                     peer/local   all             all                                     md5/' $PG_HBA

# 重启 PostgreSQL
systemctl restart postgresql
```

### 第五步：上传项目文件

在你的电脑上：
1. 把项目文件夹压缩成 zip（不包含 node_modules）
2. 用 FileZilla 上传到服务器的 `/var/www/fangame-next/` 目录

FileZilla 连接信息：
- 主机: `sftp://你的服务器IP`
- 用户名: `root`
- 密码: 你的服务器密码
- 端口: `22`

### 第六步：在服务器上安装和构建

```bash
# 进入项目目录
cd /var/www/fangame-next

# 如果上传的是 zip，先解压
unzip fangame-next.zip
rm fangame-next.zip

# 安装依赖
npm install

# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate deploy

# 构建项目
npm run build

# 用 PM2 启动
pm2 start npm --name "fangame-next" -- start

# 设置开机自启
pm2 startup
pm2 save
```

### 第七步：配置 Nginx

```bash
# 创建配置文件
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

# 启用配置
ln -s /etc/nginx/sites-available/fangame-next /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启 Nginx
systemctl restart nginx
```

### 第八步：配置防火墙

```bash
# 安装 UFW
apt install -y ufw

# 配置规则
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable

echo "y" | ufw status
```

### 第九步：测试

在浏览器访问：`http://你的服务器IP`

---

## 🔍 故障排查

### 网站无法访问？

```bash
# 检查 Nginx
systemctl status nginx

# 检查 PM2
pm2 status

# 查看日志
pm2 logs fangame-next --lines 50
tail -n 50 /var/log/nginx/error.log
```

### 数据库连接失败？

```bash
# 检查 PostgreSQL
systemctl status postgresql

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

## 📞 常用命令速查

```bash
# 查看项目状态
pm2 status

# 查看实时日志
pm2 logs fangame-next

# 重启项目
pm2 restart fangame-next

# 停止项目
pm2 stop fangame-next

# 更新代码后重新部署
cd /var/www/fangame-next
npm install
npx prisma migrate deploy
npm run build
pm2 restart fangame-next

# 查看系统资源
htop
df -h
free -h
```

---

## ✨ 完成！

如果一切顺利，你的网站现在已经在线运行了！

下一步建议：
1. 注册一个管理员账号
2. 在数据库中手动将该账号的 role 改为 ADMIN
3. 登录管理后台添加游戏内容

祝你好运！🎉
