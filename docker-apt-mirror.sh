#!/bin/sh
# ═══════════════════════════════════════════
# APT 镜像源切换脚本
# 国内源优先，超时自动切回官方源
# 用法: RUN ./docker-apt-mirror.sh && apt-get update
# ═══════════════════════════════════════════
set -e

MIRROR_URL="https://mirrors.aliyun.com/debian"
OFFICIAL_URL="https://deb.debian.org/debian"
TIMEOUT=5
CODENAME=$(. /etc/os-release && echo "$VERSION_CODENAME")

try_mirror() {
  local url="$1"
  local label="$2"

  # 测试镜像是否可达
  if curl -sf --connect-timeout "$TIMEOUT" --max-time "$TIMEOUT" "${url}/dists/${CODENAME}/Release" > /dev/null 2>&1; then
    echo "deb ${url} ${CODENAME} main contrib non-free non-free-firmware" > /etc/apt/sources.list.d/docker-mirror.list
    echo "deb ${url} ${CODENAME}-updates main contrib non-free non-free-firmware" >> /etc/apt/sources.list.d/docker-mirror.list
    echo "deb ${url}-security ${CODENAME}-security main contrib non-free non-free-firmware" >> /etc/apt/sources.list.d/docker-mirror.list
    echo "[apt] using ${label}: ${url}"
    return 0
  fi

  echo "[apt] ${label} unreachable, skipping"
  return 1
}

# 清理旧配置
rm -f /etc/apt/sources.list.d/docker-mirror.list

# 优先尝试国内源，失败则静默使用官方默认源
if ! try_mirror "$MIRROR_URL" "aliyun"; then
  echo "[apt] falling back to official debian sources"
fi
