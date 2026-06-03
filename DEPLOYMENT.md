# 部署指南

## 方式一：Docker 一键部署（推荐）

### 服务器要求

推荐配置：4 核 CPU / 8 GB 内存 / 80 GB SSD

推荐系统：Ubuntu 22.04 LTS / Debian 12

### 环境依赖

- Docker >= 20.10
- Docker Compose >= 2.0

安装 Docker（如果没有）

```bash
# Ubuntu / Debian
curl -fsSL https://get.docker.com | sh
sudo systemctl enable docker
sudo systemctl start docker
```

### 1 克隆代码

```bash
git clone https://github.com/SiOuTvT/fangame.git /opt/fangame
cd /opt/fangame
```

### 2 配置环境变量

```bash
cp .env.example .env
vi .env
```

必填项

```env
DATABASE_URL=postgresql://用户名:密码@host.docker.internal:5432/数据库名
NEXTAUTH_SECRET=用 openssl rand -base64 32 生成
NEXTAUTH_URL=http://你的服务器IP
```

> DATABASE_URL 中的 `host.docker.internal` 是 Docker 内部访问宿主机的地址，无需修改
> NEXTAUTH_URL 必须和实际访问地址完全一致，包括协议和端口

### 3 一键启动

```bash
docker compose up -d
```

首次启动会自动：
- 构建 Next.js 应用镜像
- 运行数据库迁移
- 启动应用（连接宿主机已有的 PostgreSQL）

等待构建完成（约 3-5 分钟），访问 `http://你的服务器IP`

### 4 查看日志

```bash
# 查看所有服务日志
docker compose logs -f

# 只看应用日志
docker compose logs -f app

# 只看数据库日志
docker compose logs -f db
```

### 5 更新项目

```bash
cd /opt/fangame
git pull origin main
docker compose up -d --build
```

> 数据库数据和上传文件会自动保留，不会丢失

### 6 停止 / 重启

```bash
# 停止
docker compose down

# 重启
docker compose restart

# 重建并重启（代码更新后）
docker compose up -d --build
```

### 低内存服务器优化

如果服务器只有 2GB 内存，在 `docker-compose.yml` 中调整内存限制

```yaml
services:
  db:
    deploy:
      resources:
        limits:
          memory: 192M
  app:
    build:
      args:
        NODE_OPTIONS: "--max-old-space-size=512"
    deploy:
      resources:
        limits:
          memory: 384M
```

并添加 swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 数据持久化

Docker 会自动创建两个持久化卷

| 卷名 | 用途 | 位置 |
|------|------|------|
| `fangame-postgres_data` | PostgreSQL 数据 | Docker 管理 |
| `fangame-uploads_data` | 用户上传文件 | Docker 管理 |

查看卷

```bash
docker volume ls | grep fangame
```

备份数据库

```bash
docker exec fangame-db pg_dump -U fangame fangame > backup_$(date +%Y%m%d).sql
```

恢复数据库

```bash
cat backup.sql | docker exec -i fangame-db psql -U fangame fangame
```

### 配置 HTTPS（推荐）

使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name 你的域名;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name 你的域名;

    ssl_certificate     /etc/nginx/ssl/fangame.crt;
    ssl_certificate_key /etc/nginx/ssl/fangame.key;

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
    }
}
```

HTTPS 配置后更新 .env

```env
NEXTAUTH_URL=https://你的域名
```

然后重启应用

```bash
docker compose restart app
```

### 防火墙放行端口

```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

---

## 方式二：手动部署（传统方式）

### 服务器要求

推荐配置：4 核 CPU / 8 GB 内存 / 80 GB SSD

推荐系统：Ubuntu 22.04 LTS / Debian 12

### 环境依赖

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Nginx 或 OpenResty
- Git >= 2.x

### 1 克隆代码

```bash
git clone https://github.com/SiOuTvT/fangame.git /opt/fangame
cd /opt/fangame
```

### 2 配置环境变量

```bash
cp .env.example .env
vi .env
```

以下为必填项

```env
DATABASE_URL="postgresql://用户名:密码@localhost:5432/fangame"
NEXTAUTH_SECRET="用 openssl rand -base64 32 生成"
NEXTAUTH_URL="http://你的服务器IP"
```

> NEXTAUTH_URL 必须和实际访问地址完全一致，包括协议和端口，否则登录会失败

### 3 安装依赖

```bash
npm install
npx prisma generate
```

### 4 数据库初始化

```bash
sudo -u postgres psql
```

进入 psql 后执行

```sql
CREATE USER fangame WITH PASSWORD '你的密码';
CREATE DATABASE fangame OWNER fangame;
\q
```

回到终端执行迁移

```bash
npx prisma migrate deploy
```

> 生产环境用 migrate deploy，不要用 migrate dev

### 5 构建项目

```bash
npm run build
```

### 6 启动项目

```bash
npm install -g pm2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

> pm2 startup 会输出一条 sudo env PATH=... 命令，复制执行后再 pm2 save

验证

```bash
curl -I http://localhost:3000
```

### 7 Nginx 反向代理

```bash
vi /etc/nginx/conf.d/fangame.conf
```

写入以下内容

```nginx
server {
    listen 80;
    server_name 你的服务器IP;

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
```

测试并重载

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### 8 更新项目

```bash
cd /opt/fangame
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart fangame
```

---

## 常见问题

**431 Request Header Fields Too Large**

→ Nginx 配置加入 `large_client_header_buffers 4 128k;`

**502 Bad Gateway**

Docker 方式

```bash
docker compose logs app
```

手动方式

```bash
pm2 status
pm2 logs fangame
```

**数据库连接失败**

Docker 方式

```bash
docker compose logs db
```

手动方式

```bash
PGPASSWORD='密码' psql -U fangame -d fangame -h localhost -c "SELECT 1;"
```

**图片上传后丢失**

Docker 方式：检查 volume 是否正常

```bash
docker volume inspect fangame-uploads_data
```

手动方式

```bash
mkdir -p /opt/fangame/public/uploads && chmod 755 /opt/fangame/public/uploads
```

**修改 .env 后没生效**

Docker 方式

```bash
docker compose restart app
```

手动方式

```bash
pm2 restart fangame
```

**Prisma 迁移失败**

```bash
# Docker 方式
docker compose exec app npx prisma migrate status

# 手动方式
npx prisma migrate status
```

**构建 OOM（内存不足）**

添加 swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```
