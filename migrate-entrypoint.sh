#!/bin/sh
set -e

G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
B='\033[1m'
N='\033[0m'

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
  printf "  ⏳ 等待数据库连接 (${DB_HOST}:${DB_PORT})...\n"
  MAX_RETRIES=30
  RETRY=0
  while [ $RETRY -lt $MAX_RETRIES ]; do
    if bash -c "echo > /dev/tcp/${DB_HOST}/${DB_PORT}" 2>/dev/null; then
      printf "  ${G}✓${N} 数据库已连接\n"
      break
    fi
    RETRY=$((RETRY + 1))
    if [ $RETRY -ge $MAX_RETRIES ]; then
      printf "  ${R}✗${N} 无法连接数据库 ${DB_HOST}:${DB_PORT}\n"
      exit 1
    fi
    sleep 2
  done
fi

# ── 执行迁移 ───────────────────────
PRISMA="./node_modules/prisma/build/index.js"
printf "  ⏳ 执行数据库迁移...\n"

if node "$PRISMA" migrate deploy --schema=./prisma/schema.prisma; then
  printf "  ${G}✓${N} 数据库迁移完成\n"
else
  printf "  ${R}✗${N} 数据库迁移失败\n"
  exit 1
fi
