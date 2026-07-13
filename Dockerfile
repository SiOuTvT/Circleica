# ═══════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# ── APT 镜像源：bootstrap(HTTP) → 正式(HTTPS) ──
# Phase 1: HTTP 引导 — 仅安装 ca-certificates，解决 TLS 证书链缺失
# Phase 2: 切换 HTTPS 镜像 — ca-certificates 已就绪，正式安装业务依赖
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
      > /etc/apt/apt.conf.d/99retry && \
    echo "deb http://mirrors.aliyun.com/debian bookworm main" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
    update-ca-certificates 2>/dev/null || true && \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm-updates main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json package-lock.json ./

# Install all dependencies (--legacy-peer-deps for React 19 compat)
RUN npm ci --no-audit --no-fund --legacy-peer-deps

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# ═══════════════════════════════════════════
# Stage 2: Build
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# ── APT 镜像源：bootstrap(HTTP) → 正式(HTTPS) ──
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
      > /etc/apt/apt.conf.d/99retry && \
    echo "deb http://mirrors.aliyun.com/debian bookworm main" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
    update-ca-certificates 2>/dev/null || true && \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm-updates main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set build-time environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-http-header-size=1048576"
ENV PRISMA_CLI_QUERY_ENGINE_TYPE=library
ENV PRISMA_QUERY_ENGINE_TYPE=library

# 构建时环境变量占位符（真实值在运行时注入，避免密钥泄漏到镜像层）
ARG DATABASE_URL="postgresql://build:placeholder@localhost:5432/build"
ARG NEXTAUTH_SECRET="build-placeholder-secret-not-used-at-runtime-32chars"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG VERSION="unknown"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV APP_VERSION=${VERSION}

# Build the application（TypeScript 检查需要较多内存）
RUN NODE_OPTIONS="--max-old-space-size=2048" npx next build

# ═══════════════════════════════════════════
# Stage 3: Production Runtime
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# ── APT 镜像源：bootstrap(HTTP) → 正式(HTTPS) ──
RUN printf 'Acquire::Retries "5";\nAcquire::http::Timeout "30";\nAcquire::https::Timeout "30";\n' \
      > /etc/apt/apt.conf.d/99retry && \
    echo "deb http://mirrors.aliyun.com/debian bookworm main" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
    update-ca-certificates 2>/dev/null || true && \
    rm -rf /var/lib/apt/lists/* /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian bookworm-updates main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    echo "deb https://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      openssl \
      curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy built application (standalone)
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (uploads, favicon, etc.)
COPY --from=builder /app/public ./public
# Copy Prisma schema + generated client + engines（迁移和运行时需要）
COPY --from=builder /app/prisma ./prisma
# Copy 完整 node_modules（确保 prisma CLI 及其所有传递依赖完整可用）
# .dockerignore 已排除本地 node_modules，此处来自 builder 阶段的干净构建
COPY --from=builder /app/node_modules ./node_modules

# Create uploads directory with proper permissions
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public/uploads

# Copy entrypoint scripts
COPY docker-entrypoint.sh /docker-entrypoint.sh
COPY migrate-entrypoint.sh /migrate-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh /migrate-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

# Expose port
EXPOSE 80

# Environment variables
ARG VERSION="unknown"
ENV APP_VERSION=${VERSION}
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-http-header-size=1048576"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
