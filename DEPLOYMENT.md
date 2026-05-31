# 部署指南

## 服务器要求

推荐配置：4 核 CPU / 8 GB 内存 / 80 GB SSD

推荐系统：Ubuntu 22.04 LTS / Debian 12

## 环境依赖

- Node.js >= 18.x
- PostgreSQL >= 14.x
- Nginx 或 OpenResty
- Git >= 2.x

## 开始部署

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

其余可选变量见 `.env.example` 注释

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

> 没有域名时 server_name 填公网 IP，确保防火墙开放 80 端口

### 8 配置 HTTPS（推荐）

纯 IP 部署无法使用免费的 Let's Encrypt 证书（需要域名），需要使用自签名证书。

**方法一：使用自动脚本（推荐）**

```bash
sudo bash scripts/setup-ssl.sh 你的服务器IP
```

脚本会自动完成：生成自签名证书、配置 Nginx HTTPS、HTTP 自动跳转 HTTPS。

**方法二：手动配置**

```bash
# 生成自签名证书（有效期 10 年）
sudo mkdir -p /etc/nginx/ssl
sudo openssl req -x509 -nodes -days 3650 \
    -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/fangame.key \
    -out /etc/nginx/ssl/fangame.crt \
    -subj "/CN=你的服务器IP" \
    -addext "subjectAltName=IP:你的服务器IP"
```

然后修改 Nginx 配置 `/etc/nginx/conf.d/fangame.conf`：

```nginx
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name 你的服务器IP;
    return 301 https://$host$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl;
    server_name 你的服务器IP;

    ssl_certificate     /etc/nginx/ssl/fangame.crt;
    ssl_certificate_key /etc/nginx/ssl/fangame.key;
    ssl_protocols TLSv1.2 TLSv1.3;

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

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**HTTPS 配置后需要更新 .env：**

```env
NEXTAUTH_URL="https://你的服务器IP"
```

> 自签名证书会导致浏览器显示「连接不安全」警告，点击「高级」→「继续前往」即可正常访问。
> 如果有域名，建议使用 Let's Encrypt 免费证书：`sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d 你的域名`

### 8 防火墙放行端口

```bash
# 放行 HTTP 和 HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

---

## 常见问题

**构建报 OOM**

→ 添加 swap

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**431 Request Header Fields Too Large**

→ Nginx 配置加入 `large_client_header_buffers 4 128k;`

**502 Bad Gateway**

→ 检查日志

```bash
pm2 status
pm2 logs fangame
```

**数据库连接失败**

```bash
PGPASSWORD='密码' psql -U fangame -d fangame -h localhost -c "SELECT 1;"
```

**端口 3000 被占用**

```bash
sudo lsof -i :3000
```

**图片上传后丢失**

```bash
mkdir -p /opt/fangame/public/uploads && chmod 755 /opt/fangame/public/uploads
```

**修改 .env 后没生效**

```bash
pm2 restart fangame
```

**Prisma 迁移失败**

```bash
npx prisma migrate status
```

---

## 更新项目

```bash
cd /opt/fangame
git pull origin main
npm install
npx prisma generate
npx prisma migrate deploy
npm run build
pm2 restart fangame