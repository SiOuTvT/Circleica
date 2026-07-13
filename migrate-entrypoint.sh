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

# ── 修复历史失败迁移 ────────────────
fix_failed_migrations() {
  FAILED=$(
    node -e "
      const { PrismaClient } = require('@prisma/client');
      const p = new PrismaClient();
      (async () => {
        try {
          const rows = await p.\$queryRaw\`
            SELECT migration_name, rolled_back_count
            FROM _prisma_migrations
            WHERE rolled_back_count > 0
            ORDER BY started_at
          \`;
          console.log(JSON.stringify(rows));
        } catch(e) {
          console.log('[]');
        }
        await p.\$disconnect();
      })();
    " 2>/dev/null
  )

  if [ -z "$FAILED" ] || [ "$FAILED" = "[]" ]; then
    return 0
  fi

  printf "  ${Y}⚠${N} 检测到失败的迁移记录，正在修复...\n"

  NAMES=$(echo "$FAILED" | node -e "
    const raw = require('fs').readFileSync('/dev/stdin', 'utf8').trim();
    if (!raw || raw === '[]') { process.exit(0); }
    const arr = JSON.parse(raw);
    for (const r of arr) { console.log(r.migration_name); }
  " 2>/dev/null)

  if [ -z "$NAMES" ]; then
    return 0
  fi

  for NAME in $NAMES; do
    printf "    ↪ resolve: ${NAME}\n"
    npx prisma migrate resolve --rolled-back "$NAME" --schema=./prisma/schema.prisma 2>&1 || true
  done

  printf "  ${G}✓${N} 失败迁移已修复\n"
}

fix_failed_migrations

# ── 执行迁移 ───────────────────────
printf "  ⏳ 执行数据库迁移...\n"

if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
  printf "  ${G}✓${N} 数据库迁移完成\n"
else
  printf "  ${R}✗${N} 数据库迁移失败\n"
  exit 1
fi