#!/bin/sh
set -e

# 颜色定义
CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BOLD='\033[1m'
RESET='\033[0m'

# Logo
echo ""
echo -e "${CYAN}${BOLD}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║                                            ║"
echo "  ║     🎮  同人游戏站  ·  Fangame            ║"
echo "  ║     Galgame/Visual Novel Community         ║"
echo "  ║                                            ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${RESET}"
echo ""

# 数据库迁移
echo -e "${CYAN}[1/2]${RESET} ${BOLD}数据库迁移${RESET}"
echo -e "  ${YELLOW}⏳${RESET} 正在执行 Prisma 迁移..."
if npx prisma migrate deploy --schema=./prisma/schema.prisma 2>&1 | sed 's/^/  /'; then
  echo -e "  ${GREEN}✓${RESET} 数据库迁移完成"
else
  echo -e "  ${RED}✗${RESET} 数据库迁移失败！"
  echo -e "  ${YELLOW}!${RESET} 请检查数据库连接和迁移文件"
  exit 1
fi
echo ""

# 启动应用
echo -e "${CYAN}[2/2]${RESET} ${BOLD}启动应用${RESET}"
echo -e "  ${YELLOW}⏳${RESET} 正在启动 Next.js 服务器..."
echo ""
echo -e "  ${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo -e "  ${GREEN}${BOLD}  ✓ 服务已启动${RESET}"
echo -e "  ${GREEN}${BOLD}════════════════════════════════════════${RESET}"
echo ""

exec node server.js
