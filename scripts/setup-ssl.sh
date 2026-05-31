#!/bin/bash
# ============================================================
# SSL 证书设置脚本（自签名证书 - 适用于纯 IP 地址）
# 用法: sudo bash scripts/setup-ssl.sh <IP地址>
# 例如: sudo bash scripts/setup-ssl.sh 111.228.7.36
# ============================================================

set -e

if [ -z "$1" ]; then
    echo "用法: sudo bash $0 <IP地址>"
    echo "例如: sudo bash $0 111.228.7.36"
    exit 1
fi

SERVER_IP="$1"
SSL_DIR="/etc/nginx/ssl"
CONF_DIR="/etc/nginx/conf.d"
CONF_FILE="$CONF_DIR/fangame.conf"

echo "=============================="
echo "  设置 SSL 证书 ($SERVER_IP)"
echo "=============================="

# 1. 安装 nginx 和 openssl（如果未安装）
echo "检查并安装 nginx..."
apt-get update -y
if ! command -v nginx &> /dev/null; then
    echo "安装 nginx..."
    apt-get install -y nginx
fi
if ! command -v openssl &> /dev/null; then
    echo "安装 openssl..."
    apt-get install -y openssl
fi

# 2. 创建 SSL 目录
mkdir -p "$SSL_DIR"

# 3. 生成自签名证书（有效期 10 年）
echo "生成自签名 SSL 证书..."
openssl req -x509 -nodes -days 3650 \
    -newkey rsa:2048 \
    -keyout "$SSL_DIR/fangame.key" \
    -out "$SSL_DIR/fangame.crt" \
    -subj "/CN=$SERVER_IP" \
    -addext "subjectAltName=IP:$SERVER_IP"

# 4. 生成 DH 参数（提高安全性）
echo "生成 DH 参数（可能需要 1-2 分钟）..."
openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048

# 5. 写入 Nginx 配置
echo "写入 Nginx 配置..."
cat > "$CONF_FILE" << EOF
# HTTP -> HTTPS 重定向
server {
    listen 80;
    server_name $SERVER_IP;
    return 301 https://\$host\$request_uri;
}

# HTTPS 配置
server {
    listen 443 ssl;
    server_name $SERVER_IP;

    # SSL 证书
    ssl_certificate     $SSL_DIR/fangame.crt;
    ssl_certificate_key $SSL_DIR/fangame.key;

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_dhparam $SSL_DIR/dhparam.pem;

    # 会话缓存
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # 缓冲区配置
    large_client_header_buffers 4 128k;
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# 6. 测试并重载 Nginx
echo "测试 Nginx 配置..."
nginx -t

echo "重载 Nginx..."
systemctl reload nginx

echo ""
echo "=============================="
echo "  SSL 设置完成！"
echo "=============================="
echo ""
echo "现在可以通过以下地址访问："
echo "  https://$SERVER_IP"
echo ""
echo "注意：自签名证书会导致浏览器显示安全警告，"
echo "点击「高级」->「继续前往」即可正常访问。"
echo ""
echo "如果需要去掉安全警告，请："
echo "  1. 购买域名"
echo "  2. 安装 certbot: apt install certbot python3-certbot-nginx"
echo "  3. 运行: certbot --nginx -d 你的域名"