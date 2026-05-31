# 部署指南

## 服务器要求

- 最低配置：2 核 CPU / 2 GB 内存（需加 2G swap）/ 40 GB SSD
- 推荐配置：4 核 CPU / 8 GB 内存 / 80 GB SSD
- 推荐系统：Ubuntu 22.04 LTS / Debian 12

## 环境依赖

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Nginx 或 OpenResty
- Git >= 2.x

---

## 第一步：1Panel 安装所需软件

登录 1Panel 面板 → 应用商店，按顺序安装：

1. **OpenResty**（反向代理，应用商店搜索 OpenResty 安装）
2. **PostgreSQL**（数据库，应用商店搜索 postgres 安装）
   - 安装时设置一个 root 密码，记住它

> 1Panel 会自动管理 OpenResty 和 PostgreSQL 的启停，不需要手动配置 systemd

---

## 第二步：配置 PostgreSQL

### 方法 A：通过 1Panel 面板操作

1. 进入 1Panel → 数据库 → PostgreSQL
2. 点击「创建数据库」
   - 数据库名：`fangame`
   - 用户名：`fangame`
   - 密码：`自定义一个强密码，记住它`
   - 授权：选择 `fangame` 用户
3. 点击确认

### 方法 B：通过命令行操作

```bash
# SSH 登录服务器后执行
sudo -u postgres psql
```

进入 psql 后执行：

```sql
CREATE USER fangame WITH PASSWORD '你的数据库密码';
CREATE DATABASE fangame OWNER fangame;
\q
```

### 验证数据库连接

```bash
PGPASSWORD='你的数据库密码' psql -U fangame -d fangame -h 127.0.0.1 -c "SELECT 1;"
```

应该返回 `1`，如果报错检查密码和用户是否正确。

### 2GB 内存 PostgreSQL 优化

```bash
sudo -u postgres psql -c "ALTER SYSTEM SET shared_buffers = '256MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET effective_cache_size = '512MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET work_mem = '4MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET maintenance_work_mem = '64MB';"
sudo -u postgres psql -c "ALTER SYSTEM SET max_connections = '50';"
sudo systemctl restart postgresql
```

### 数据库迁移

在部署完代码后执行（见第四步），生产环境用 `migrate deploy`，**不要用 `migrate dev`**。

### DATABASE_URL 格式

```
postgresql://fangame:你的数据库密码@127.0.0.1:5432/fangame
```

> 注意：用 `127.0.0.1` 而不是 `localhost`，避免某些系统解析为 unix socket

---

## 第三步：克隆代码并配置环境变量

### 克隆代码

```bash
cd /opt
git clone https://github.com/SiOuTvT/fangame.git fangame
cd /opt/fangame
```

### 创建 .env 文件

```bash
cat > /opt/fangame/.env << 'EOF'
DATABASE_URL="postgresql://fangame:你的数据库密码@127.0.0.1:5432/fangame"
NEXTAUTH_SECRET="用下面的命令生成"
NEXTAUTH_URL="http://你的服务器公网IP"
EOF
```

**生成 NEXTAUTH_SECRET：**

```bash
openssl rand -base64 32
```

把输出的字符串替换到上面 NEXTAUTH_SECRET 的位置。

### 最终 .env 示例

```env
DATABASE_URL="postgresql://fangame:MyStr0ngPwd@127.0.0.1:5432/fangame"
NEXTAUTH_SECRET="xK8v2mNpQ7rT9wYz4bC6dF0gH1jL5nR3sU8xZ2aE4i="
NEXTAUTH_URL="http://111.228.7.36"
```

**重要：**
- `NEXTAUTH_URL` 必须和你实际用浏览器访问的地址完全一致（包括协议 http 和 IP）
- 没有域名就填 `http://你的IP`，**不要填 https**
- 有域名后改成 `http://你的域名` 或 `https://你的域名`

---

## 第四步：安装依赖、迁移数据库、构建

### 添加 Swap（2GB 内存必须做，否则 build 会 OOM）

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

验证 swap 已启用：

```bash
free -h
```

应该能看到 Swap 行有 2G。

### 安装依赖

```bash
cd /opt/fangame
npm install
```

### 生成 Prisma Client

```bash
npx prisma generate
```

### 数据库迁移

```bash
npx prisma migrate deploy
```

> **必须用 `deploy`，不要用 `dev`**。`dev` 会创建迁移记录表并可能导致冲突。

### 构建

```bash
npm run build
```

**2GB 内存构建注意事项：**
- 必须先加好 swap
- 如果还是 OOM，可以限制 Node.js 内存后重试：

```bash
NODE_OPTIONS="--max-old-space-size=1536" npm run build
```

- 构建大约需要 2-5 分钟，不要中断

### 确保 uploads 目录存在

```bash
mkdir -p /opt/fangame/public/uploads
chmod 755 /opt/fangame/public/uploads
```

---

## 第五步：PM2 启动项目

### 安装 PM2

```bash
npm install -g pm2
```

### 启动项目

```bash
cd /opt/fangame
pm2 start ecosystem.config.js
```

### 设置开机自启

```bash
pm2 startup
```

这条命令会输出一条类似 `sudo env PATH=... pm2 startup ...` 的命令，**复制那条命令再执行一次**。

然后保存当前进程列表：

```bash
pm2 save
```

### 验证项目启动

```bash
pm2 status
```

应该看到 `fangame` 的状态是 `online`。

```bash
curl -I http://127.0.0.1:3000
```

应该返回 `HTTP/1.1 200 OK`。

### PM2 常用命令

```bash
# 查看状态
pm2 status

# 查看日志（实时滚动）
pm2 logs fangame

# 查看最近 100 行日志
pm2 logs fangame --lines 100

# 重启
pm2 restart fangame

# 停止
pm2 stop fangame

# 删除
pm2 delete fangame

# 监控面板
pm2 monit
```

---

## 第六步：配置 OpenResty 反向代理

### 方法 A：1Panel 面板操作（推荐）

1. 进入 1Panel → 网站 → 网站列表
2. 点击「创建网站」→ 选择「反向代理」
3. 配置：
   - **主域名/公网IP**：填 `你的服务器公网IP`（如 `111.228.7.36`）
   - **代理地址**：`http://127.0.0.1:3000`
4. 点击确认

5. 创建完成后，点击该网站的「配置」或「编辑」
6. 找到 Nginx 配置，在 `server` 块内添加：

```nginx
large_client_header_buffers 4 128k;
client_max_body_size 10m;
```

7. 在 `location /` 块内确认有以下配置：

```nginx
proxy_http_version 1.1;
proxy_set_header Host $host;
proxy_set_header X-Real-IP $remote_addr;
proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
proxy_cache_bypass $http_upgrade;
```

8. 保存并重载

### 方法 B：手动创建配置文件

如果 1Panel 面板不方便编辑，SSH 登录服务器：

```bash
# 找到 OpenResty 的配置目录（1Panel 通常在这里）
cat > /opt/1panel/apps/openresty/openresty/conf/conf.d/fangame.conf << 'NGINX'
server {
    listen 80;
    server_name 111.228.7.36;

    large_client_header_buffers 4 128k;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
NGINX
```

> 把 `111.228.7.36` 换成你的实际服务器 IP。如果没有域名，就填 IP。

### 测试并重载 Nginx

```bash
# 测试配置语法
sudo nginx -t

# 重载配置
sudo systemctl reload nginx
```

> 1Panel 的 OpenResty 可能用的命令不同，如果上面不行试试：
> ```bash
> docker exec openresty nginx -t
> docker exec openresty nginx -s reload
> ```
> 或者直接在 1Panel 面板里点「重载」。

---

## 第七步：验证部署

### 1. 验证 PM2 进程运行

```bash
pm2 status
```

预期：`fangame` 状态 `online`，restarts 为 0。

### 2. 验证 Next.js 直接可访问

```bash
curl -I http://127.0.0.1:3000
```

预期：`HTTP/1.1 200 OK`

### 3. 验证反向代理可访问

```bash
curl -I http://你的服务器IP
```

预期：`HTTP/1.1 200 OK`

### 4. 浏览器访问

打开浏览器，输入 `http://你的服务器IP`（注意是 http 不是 https）。

### 5. 验证 CSS/JS 加载正常

打开浏览器 F12 → Network 标签页，刷新页面：
- 所有 CSS 文件状态应为 200
- 所有 JS 文件状态应为 200
- 不应有 ERR_SSL_PROTOCOL_ERROR

---

## 常见报错和解决方法

### ERR_SSL_PROTOCOL_ERROR

**原因**：浏览器输入了 `https://` 但服务器没有配置 SSL 证书。

**解决**：用 `http://你的IP` 访问，**不要加 s**。

### 页面有文字但没样式（CSS 不加载）

**原因**：Nginx 反向代理配置缺少必要的 header。

**解决**：按第六步配置完整的 proxy_set_header。

### 431 Request Header Fields Too Large

**原因**：Cookie 太大。

**解决**：Nginx 配置加 `large_client_header_buffers 4 128k;`，然后重载 Nginx。

### 502 Bad Gateway

**原因**：Next.js 进程没启动或挂了。

**解决**：
```bash
pm2 status
pm2 logs fangame --lines 50
```

查看日志找具体错误。

### 构建报 OOM (JavaScript heap out of memory)

**原因**：内存不够。

**解决**：添加 swap（见第四步），然后重试构建。

### 数据库连接失败

```bash
PGPASSWORD='密码' psql -U fangame -d fangame -h 127.0.0.1 -c "SELECT 1;"
```

检查：
- PostgreSQL 是否在运行：`systemctl status postgresql`
- 用户名密码是否正确
- `.env` 中 DATABASE_URL 是否正确

### 端口 3000 被占用

```bash
sudo lsof -i :3000
```

如果有其他进程占用，停止它或换端口。

### 图片上传后丢失/重启后消失

确保 uploads 目录在项目内（不在 .next 里）：

```bash
ls -la /opt/fangame/public/uploads
```

如果目录不存在：

```bash
mkdir -p /opt/fangame/public/uploads
chmod 755 /opt/fangame/public/uploads
```

### 修改 .env 后没生效

```bash
pm2 restart fangame
```

### Prisma 迁移失败

```bash
npx prisma migrate status
```

如果显示有未应用的迁移：

```bash
npx prisma migrate deploy
```

---

## 更新项目（git pull 之后）

每次更新代码后，执行以下完整流程：

```bash
cd /opt/fangame

# 拉取最新代码
git pull origin main

# 安装/更新依赖
npm install

# 重新生成 Prisma Client（schema 变化时必须）
npx prisma generate

# 应用数据库迁移（如果有新迁移）
npx prisma migrate deploy

# 重新构建
npm run build

# 重启服务
pm2 restart fangame

# 验证
pm2 status
curl -I http://127.0.0.1:3000
```

> **重要**：每次 git pull 后必须执行完整的 npm install → prisma generate → migrate deploy → build → restart 流程，不能跳步。

---

## 日志查看和排查

```bash
# 实时查看日志
pm2 logs fangame

# 查看最近 200 行
pm2 logs fangame --lines 200

# 只看错误日志
pm2 logs fangame --err --lines 100

# Nginx 访问日志
tail -f /var/log/nginx/access.log

# Nginx 错误日志
tail -f /var/log/nginx/error.log

# 如果是 1Panel 的 OpenResty
tail -f /opt/1panel/apps/openresty/openresty/log/error.log
```

---

## 安全提醒

- **不要**把 `.env` 文件提交到 git（已在 .gitignore 中排除）
- **不要**用 `prisma migrate dev`，只用 `prisma migrate deploy`
- 数据库密码要足够强
- 如果后续要加域名，配置 SSL 证书后把 NEXTAUTH_URL 改为 `https://域名`