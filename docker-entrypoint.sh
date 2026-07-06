#!/bin/sh
set -e

C='\033[0;36m'
G='\033[0;32m'
Y='\033[1;33m'
R='\033[0;31m'
B='\033[1m'
D='\033[2m'
N='\033[0m'

# ── 密钥管理 ─────────────────────────
SECRET_FILE="/app/.secret"

if [ -z "$NEXTAUTH_SECRET" ]; then
  if [ -f "$SECRET_FILE" ]; then
    export NEXTAUTH_SECRET=$(cat "$SECRET_FILE")
  else
    NEW_SECRET=$(openssl rand -base64 48)
    echo "$NEW_SECRET" > "$SECRET_FILE"
    chmod 600 "$SECRET_FILE" 2>/dev/null || true
    export NEXTAUTH_SECRET="$NEW_SECRET"
    printf "  ${Y}!${N} NEXTAUTH_SECRET 已自动生成，容器重建后用户需重新登录\n"
  fi
fi

# ── 数据库连通性检查 ─────────────────
DB_HOST=""
DB_PORT="5432"

if echo "$DATABASE_URL" | grep -qE '@[^:]+:[0-9]+/'; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
  DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*@[^:]+:([0-9]+).*|\1|')
elif echo "$DATABASE_URL" | grep -qE '@[^/?]+/'; then
  DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^/?]+)/.*|\1|')
fi

if [ -n "$DB_HOST" ]; then
  MAX_RETRIES=15
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    if bash -c "echo > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
      break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
      printf "  ${R}✗${N} 无法连接数据库 ${DB_HOST}:${DB_PORT}\n"
      printf "  ${Y}!${N} 请检查: PostgreSQL 是否已启动 | DATABASE_URL 是否正确\n"
      exit 1
    fi
    printf "  ${Y}⏳${N} 等待数据库就绪... (${RETRY}/${MAX_RETRIES})\n"
    sleep 2
  done
else
  printf "  ${G}✓${N} 跳过数据库连通性检查\n"
fi

PRISMA="./node_modules/prisma/build/index.js"

# ── 数据库迁移 ───────────────────────
if ! node "$PRISMA" migrate deploy --schema=./prisma/schema.prisma >/dev/null 2>&1; then
  printf "  ${R}✗${N} 数据库迁移失败，正在输出详细错误信息...\n"
  echo ""
  node "$PRISMA" migrate deploy --schema=./prisma/schema.prisma 2>&1
  exit 1
fi

# ── 状态面板 ─────────────────────────
APP_URL="${NEXTAUTH_URL:-http://localhost:3000}"

echo ""
printf "${C}${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
printf "${C}${B} Fangame 已启动成功！${N}\n"
printf "${C}${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
echo ""
printf "  ${B}访问地址:${N}\n"
printf "  ${G}${APP_URL}${N}\n"
echo ""
printf "  ${B}管理员:${N}\n"
printf "  首次注册账号将自动成为 ${G}SUPER_ADMIN${N}\n"
echo ""
printf "  ${B}数据库:${N}\n"
printf "  ${G}✓ PostgreSQL 已连接${N}\n"

# Redis
printf "  ${B}Redis:${N}\n"
if [ -n "$UPSTASH_REDIS_REST_URL" ] && [ -n "$UPSTASH_REDIS_REST_TOKEN" ]; then
  printf "  ${G}✓ 已连接${N}\n"
else
  printf "  ${Y}⚠ 未配置，已自动降级为内存模式${N}\n"
fi

# 对象存储
printf "  ${B}对象存储:${N}\n"
if [ -n "$R2_BUCKET_NAME" ] && [ -n "$R2_ACCOUNT_ID" ]; then
  printf "  ${G}✓ Cloudflare R2${N}\n"
else
  printf "  ${Y}⚠ 未配置，使用本地存储${N}\n"
fi

# 邮件
printf "  ${B}邮件:${N}\n"
if [ -n "$RESEND_API_KEY" ]; then
  printf "  ${G}✓ Resend 已配置${N}\n"
else
  printf "  ${Y}⚠ 未配置，邮件功能不可用${N}\n"
fi

echo ""
printf "${C}${B}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${N}\n"
echo ""

export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512 --max-http-header-size=1048576"

exec node server.js
