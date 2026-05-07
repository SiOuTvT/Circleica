# fangame-next 服务器部署指南（小白版）

本指南会一步步教你如何把网站部署到服务器上。

---

## 📋 准备工作

### 1. 你需要准备的东西

- ✅ 一台 Linux 服务器（推荐 Ubuntu 20.04 或更高版本）
- ✅ 服务器的 root 密码或 SSH 密钥
- ✅ 一个域名（可选，但推荐）
- ✅ PostgreSQL 数据库（可以在服务器上安装，也可以用云数据库）

### 2. 本地需要安装的软件

- **FTP 客户端**: FileZilla（用于上传文件）
  - 下载地址: https://filezilla-project.org/
- **SSH 客户端**: PuTTY（Windows）或直接使用终端（Mac/Linux）
  - PuTTY 下载: https://www.putty.org/

---

## 🚀 第一步：在服务器上安装必要的软件

### 方法 A：使用一键安装脚本（推荐新手）

1. 用 PuTTY 或终端连接到服务器：
   ```bash
   ssh root@你的服务器IP
   ```

2. 复制下面的命令，在服务器上执行：

```bash
#!/bin/bash
# 更新系统
apt update && apt upgrade -y

# 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 安装 PostgreSQL
apt install -y postgresql postgresql-contrib

# 安装 Nginx
apt install -y nginx

# 安装 PM2（进程管理器）
npm install -g pm2

# 验证安装
node --version
npm --version
psql --version
nginx -v
pm2 --version

echo "✅ 所有软件安装完成！"
```

3. 等待安装完成（大约 5-10 分钟）

### 方法 B：手动安装（适合有经验的用户）

如果你想了解每一步在做什么，可以分开执行：

```bash
# 1. 更新系统
apt update && apt upgrade -y

# 2. 安装 Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 3. 安装 PostgreSQL
apt install -y postgresql postgresql-contrib

# 4. 安装 Nginx
apt install -y nginx

# 5. 安装 PM2
npm install -g pm2
```

---

## 🗄️ 第二步：配置 PostgreSQL 数据库

### 1. 切换到 postgres 用户

```bash
sudo -i -u postgres
```

### 2. 进入 PostgreSQL 命令行

```bash
psql
```

### 3. 创建数据库和用户

在 `psql` 提示符下，依次执行以下命令（**请修改密码**）：

```sql
-- 创建数据库用户
CREATE USER fangame WITH PASSWORD '你的强密码';

-- 创建数据库
CREATE DATABASE fangame OWNER fangame;

-- 授予权限
GRANT ALL PRIVILEGES ON DATABASE fangame TO fangame;

-- 退出 psql
\q
```

**重要**: 记住你设置的密码，后面要用！

### 4. 退出 postgres 用户

```bash
exit
```

### 5. 配置 PostgreSQL 允许密码认证

编辑配置文件：

```bash
nano /etc/postgresql/*/main/pg_hba.conf
```

找到这一行：
```
local   all             all                                     peer
```

改成：
```
local   all             all                                     md5
```

按 `Ctrl+O` 保存，`Ctrl+X` 退出。

重启 PostgreSQL：

```bash
systemctl restart postgresql
```

---

## 📦 第三步：上传项目文件

### 1. 在本地打包项目

在你的电脑上（Windows）：

1. 打开项目文件夹 `d:\fangame-next`
2. 选中**所有文件和文件夹**
3. 右键 → 发送到 → 压缩(zipped)文件夹
4. 命名为 `fangame-next.zip`

**注意**: 不要包含 `node_modules` 文件夹和 `.env` 文件！

### 2. 配置 .env 文件

在本地创建一个新的 `.env` 文件，内容如下：

```env
# 数据库连接（修改为你的密码）
DATABASE_URL="postgresql://fangame:你的密码@localhost:5432/fangame"

# NextAuth 密钥（生成随机字符串）
NEXTAUTH_SECRET="这里填随机生成的字符串"

# 网站地址（换成你的域名或服务器IP）
NEXTAUTH_URL="http://你的服务器IP"

# UploadThing Token（去 uploadthing.com 注册获取）
UPLOADTHING_TOKEN="sk_live_你的token"
```

**如何生成 NEXTAUTH_SECRET**：
- 访问 https://generate-secret.vercel.app/32
- 复制生成的字符串

### 3. 使用 FileZilla 上传文件

1. 打开 FileZilla
2. 填写连接信息：
   - **主机**: `sftp://你的服务器IP`
   - **用户名**: `root`
   - **密码**: 你的服务器密码
   - **端口**: `22`
3. 点击"快速连接"
4. 在**远程站点**输入框，输入：`/var/www/fangame-next`
5. 在**本地站点**找到你的项目文件夹
6. 把本地文件拖到右边（上传）

---

## ⚙️ 第四步：在服务器上配置项目

### 1. 连接到服务器

```bash
ssh root@你的服务器IP
```

### 2. 进入项目目录

```bash
cd /var/www/fangame-next
```

### 3. 解压文件（如果上传的是 zip）

```bash
apt install -y unzip  # 如果还没安装 unzip
unzip fangame-next.zip
rm fangame-next.zip   # 删除压缩包
```

### 4. 上传 .env 文件

用 FileZilla 把你刚才配置的 `.env` 文件上传到 `/var/www/fangame-next/`

### 5. 安装依赖

```bash
cd /var/www/fangame-next
npm install
```

这会花费几分钟时间...

### 6. 生成 Prisma 客户端

```bash
npx prisma generate
```

### 7. 运行数据库迁移

```bash
npx prisma migrate deploy
```

这会创建所有数据库表。

---

## 🏗️ 第五步：构建和启动项目

### 1. 构建项目

```bash
npm run build
```

这会花费几分钟，完成后会看到类似这样的输出：
```
✓ Compiled successfully
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 2. 用 PM2 启动项目

```bash
pm2 start npm --name "fangame-next" -- start
```

### 3. 设置开机自启

```bash
pm2 startup
pm2 save
```

### 4. 查看运行状态

```bash
pm2 status
```

应该看到：
```
┌────┬────────────────┬──────────┬──────┬───────────┬──────────┬──────────┐
│ id │ name           │ mode     │ ↺    │ status    │ cpu      │ memory   │
├────┼────────────────┼──────────┼──────┼───────────┼──────────┼──────────┤
│ 0  │ fangame-next   │ fork     │ 0    │ online    │ 0%       │ 100mb    │
└────┴────────────────┴──────────┴──────┴───────────┴──────────┴──────────┘
```

### 5. 查看日志

```bash
pm2 logs fangame-next
```

按 `Ctrl+C` 退出日志。

---

## 🌐 第六步：配置 Nginx（反向代理）

### 1. 创建 Nginx 配置文件

```bash
nano /etc/nginx/sites-available/fangame-next
```

### 2. 粘贴以下内容

```nginx
server {
    listen 80;
    server_name 你的服务器IP;  # 如果有域名，填域名

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
```

**重要**: 把 `你的服务器IP` 改成实际的 IP 或域名！

### 3. 启用配置

```bash
ln -s /etc/nginx/sites-available/fangame-next /etc/nginx/sites-enabled/
```

### 4. 测试配置

```bash
nginx -t
```

应该看到：
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 5. 重启 Nginx

```bash
systemctl restart nginx
```

---

## 🔒 第七步：配置防火墙

### 1. 安装 UFW（如果还没有）

```bash
apt install -y ufw
```

### 2. 配置规则

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
```

输入 `y` 确认。

### 3. 查看状态

```bash
ufw status
```

---

## ✅ 第八步：测试网站

### 1. 在浏览器中访问

打开浏览器，访问：
```
http://你的服务器IP
```

应该能看到网站首页！

### 2. 测试功能

- ✅ 注册一个新账号
- ✅ 登录
- ✅ 浏览游戏列表
- ✅ 发表评论
- ✅ 签到功能

---

## 🔧 常用维护命令

### 查看项目状态

```bash
pm2 status
```

### 查看日志

```bash
pm2 logs fangame-next
```

### 重启项目

```bash
pm2 restart fangame-next
```

### 停止项目

```bash
pm2 stop fangame-next
```

### 更新代码

```bash
cd /var/www/fangame-next

# 上传新文件后
npm install
npx prisma migrate deploy
npm run build
pm2 restart fangame-next
```

### 查看服务器资源使用

```bash
htop  # 按 q 退出
```

---

## ❓ 常见问题

### 1. 网站无法访问

**检查 Nginx 是否运行**：
```bash
systemctl status nginx
```

**检查 PM2 进程**：
```bash
pm2 status
```

**查看错误日志**：
```bash
pm2 logs fangame-next --lines 50
tail -n 50 /var/log/nginx/error.log
```

### 2. 数据库连接失败

**检查 PostgreSQL 是否运行**：
```bash
systemctl status postgresql
```

**测试数据库连接**：
```bash
psql -U fangame -d fangame -h localhost
```

输入密码，如果能进入说明连接正常。

### 3. 端口被占用

**查看 3000 端口占用**：
```bash
lsof -i :3000
```

**杀掉进程**：
```bash
kill -9 <PID>
```

### 4. 内存不足

Next.js 构建需要至少 1GB 内存。如果服务器内存小，可以添加交换空间：

```bash
# 创建 2GB 交换空间
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile

# 永久生效
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

---

## 🎉 完成！

恭喜！你的网站已经成功部署了！

现在你可以：
1. 开始添加游戏内容
2. 邀请用户注册
3. 配置域名和 HTTPS（后续优化）

---

## 📞 需要帮助？

如果遇到问题：
1. 查看日志找出错误信息
2. 搜索错误信息
3. 检查每个服务的状态（Nginx、PostgreSQL、PM2）

祝你好运！🚀
