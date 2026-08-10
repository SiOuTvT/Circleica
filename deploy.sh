#!/usr/bin/env bash
# Circleica 一键部署脚本（纯 SSH / 无 Coolify）
# 用法：
#   ./deploy.sh            # 默认拉 main 并重构建部署
#   ./deploy.sh staging    # 如需指定分支，传参即可（默认 main）
#
# 前置：
#   1) 服务器已装 docker + docker compose v2
#   2) 项目目录已 git clone，且 .env 已按 .env.example 填好真实值
#      （DATABASE_URL / NEXTAUTH_SECRET / R2_* / NEXTAUTH_URL 等）
#   3) .env 里 POSTGRES_PASSWORD 必须是强口令（非默认的 circleica）
#
# 设计：
#   - git pull -> docker compose build -> migrate(best-effort) -> up -d
#   - 部署后轮询 /api/health 直到 200
#   - 最后清理悬空镜像，避免磁盘被旧层占满

set -euo pipefail

BRANCH="${1:-main}"
COMPOSE="docker compose"
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cd "$PROJECT_DIR"

echo "==> [1/6] 拉取最新代码 (branch=$BRANCH)"
git fetch origin
git reset --hard "origin/$BRANCH"
git clean -fd

# 取版本号（用于镜像 tag / 健康检查展示）
VERSION="$(git describe --tags --always 2>/dev/null || echo unknown)"
echo "    当前版本: $VERSION"

echo "==> [2/6] 校验 .env 存在"
if [ ! -f .env ]; then
  echo "ERROR: 找不到 .env，请先 cp .env.example .env 并填好真实值" >&2
  exit 1
fi

echo "==> [3/6] 构建镜像（已强制 --webpack，不会卡）"
# 注入 VERSION 让镜像带上版本标识
$COMPOSE build --build-arg VERSION="$VERSION"

echo "==> [4/6] 数据库迁移（best-effort，失败不中断部署但会告警）"
if $COMPOSE run --rm migrate; then
  echo "    迁移完成"
else
  echo "WARNING: 迁移返回非零，请检查日志；若确无新迁移可忽略" >&2
fi

echo "==> [5/6] 启动全部服务"
$COMPOSE up -d

echo "==> [6/6] 等待健康检查通过"
HEALTH_URL="http://localhost:3000/api/health"
for i in $(seq 1 40); do
  if curl -fs "$HEALTH_URL" >/dev/null 2>&1; then
    echo "    /api/health -> 200 OK（第 ${i} 次探测）"
    break
  fi
  if [ "$i" -eq 40 ]; then
    echo "ERROR: 40 次探测仍未就绪，请 docker compose logs app 排查" >&2
    exit 1
  fi
  sleep 5
done

echo "==> 清理悬空镜像（释放磁盘）"
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo "✅ 部署完成。版本=$VERSION"
echo "   应用容器: $($COMPOSE ps --format '{{.Name}} {{.Status}}' | grep app || true)"
echo "   外部访问经 Cloudflare 代理 -> 服务器IP:3000"
echo ""
echo "   冒烟建议："
echo "     1) GET /api/health -> 200"
echo "     2) 首次访问 /setup 创建首位 SUPER_ADMIN（若未初始化）"
echo "     3) 登录 -> 收藏/评分/签到 -> 检查通知与成就"
