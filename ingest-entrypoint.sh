#!/bin/sh
# ═══════════════════════════════════════════
# Galvelica 资料馆填充入口（一次性，可选）
#
# 通过 `docker compose run --rm ingest` 触发（复用 builder 构建阶段）。
# 所有步骤均幂等 + 断点续跑；单源失败不中止整体，结尾汇总提示。
# 数据库连通性检查逻辑与 migrate-entrypoint.sh 保持一致。
# ═══════════════════════════════════════════
set -e

G='\033[0;32m'
R='\033[0;31m'
Y='\033[1;33m'
N='\033[0m'

# tsx 解析 @/ 别名需要 tsconfig
export TSX_TSCONFIG_PATH="${TSX_TSCONFIG_PATH:-/app/tsconfig.json}"
# 抓取任务较重，默认给足堆内存
: "${NODE_OPTIONS:=--max-old-space-size=2048}"

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

# ── 运行填充流程（幂等 + 断点续跑）──
printf "  ⏳ 开始填充 Galvelica 资料馆（幂等，可重跑续接）...\n"

FAILED=""
run_step() {
  name="$1"; shift
  printf "  ${Y}▶${N} $name ...\n"
  if "$@"; then
    printf "  ${G}✓${N} $name 完成\n"
  else
    printf "  ${R}✗${N} $name 失败（可重跑续接）\n"
    FAILED="$FAILED $name"
  fi
}

run_step "回填本站已发布游戏（空库则为空操作）" npm run galvelica:backfill
run_step "VNDB 同人抓取（核心）" npm run galvelica:ingest-vndb
# CnGal 已按用户铁律排除（2026-07-27）；闸门挡，不再抓。
run_step "Steam 发现层（补漏网新同人）" npm run galvelica:ingest-discovery

# ErogameScape（日本权威 galge 库）默认关：需服务器出口代理/可达性（中国大陆大概率被墙）。
# 设 GALVELICA_ENABLE_EGS=1 才抓；摄入时统一按 DERIVATIVE 兜底，默认仅补强已匹配作品。
if [ "${GALVELICA_ENABLE_EGS:-0}" = "1" ]; then
  run_step "ErogameScape 抓取（需服务器出口代理）" npm run galvelica:ingest-egs
else
  printf "  ${Y}⚠${N} 跳过 ErogameScape（默认关；设 GALVELICA_ENABLE_EGS=1 启用，需出口代理）\n"
fi

# 月幕 YmGal / CnGal / KunMoe 已被用户铁律排除（2026-07-27）：不接 API、不批量爬、不依赖，
# 以保持站点独立中立、不卷入国内圈人际关系。CnGal 也已从 DOUJIN_CURATED 移除，故此处不再抓取。

if [ -n "$FAILED" ]; then
  printf "  ${R}⚠${N} 以下源填充失败:$FAILED\n"
  printf "  ${Y}提示${N}: 失败多因网络/限流，重跑 \`docker compose run --rm ingest\` 会从上次断点续接，已写入数据不丢失。\n"
  exit 1
fi

printf "  ${G}✓${N} Galvelica 资料馆填充完成\n"
