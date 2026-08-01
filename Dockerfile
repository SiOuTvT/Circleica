# ═══════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# ── APT 镜像源：国内网络链路，全 HTTP 优先（避开弱服务器 HTTPS 握手延迟）──
RUN sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|https://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    echo 'Acquire::Retries "5"; Acquire::http::Timeout "30"; Acquire::https::Timeout "60";' > /etc/apt/apt.conf.d/99retry && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json package-lock.json ./

# Install all dependencies (--legacy-peer-deps for React 19 compat)
# npm 镜像加速（国内网络环境）
RUN npm config set registry https://registry.npmmirror.com && \
    npm ci --no-audit --no-fund --legacy-peer-deps

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# ═══════════════════════════════════════════
# Stage 2: Build
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# ── APT 国内镜像 ──
RUN sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|https://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    echo 'Acquire::Retries "5"; Acquire::http::Timeout "30";' > /etc/apt/apt.conf.d/99retry && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates openssl && \
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
ARG NEXT_PUBLIC_TURNSTILE_SITE_KEY=""
ARG VERSION="unknown"
# Sentry：NEXT_PUBLIC_SENTRY_DSN 必须在构建期存在才会被内联进浏览器 bundle，
# 运行时再注入对客户端无效。SENTRY_ORG/PROJECT/AUTH_TOKEN 供构建期上传 sourcemap，
# 留空则 withSentryConfig 静默跳过上传（不阻断构建）。
# 以上仅存在于 builder 阶段，不会进入 runner 镜像层。
ARG NEXT_PUBLIC_SENTRY_DSN=""
ARG SENTRY_ORG=""
ARG SENTRY_PROJECT=""
ARG SENTRY_AUTH_TOKEN=""
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV NEXT_PUBLIC_TURNSTILE_SITE_KEY=${NEXT_PUBLIC_TURNSTILE_SITE_KEY}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
ENV SENTRY_ORG=${SENTRY_ORG}
ENV SENTRY_PROJECT=${SENTRY_PROJECT}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV APP_VERSION=${VERSION}

# Build the application（webpack 生产构建，132 页面）
# 内存默认 4096 = 项目真实需求（标准配置下构建更快更稳）。弱机器不要改这里——
# 经 Coolify Build Arguments / docker build --build-arg 传 NEXT_BUILD_MEMORY 覆盖即可（2GB 机器传 2048）。
# ⚠️ 必须带 --webpack 退出 Turbopack：项目有自定义 webpack 配置（isomorphic-dompurify→dompurify 别名），
# Turbopack 会忽略它导致构建挂起直至超时（Coolify 部署曾因此失败：裸 npx next build 默认走 Turbopack）。
ARG NEXT_BUILD_MEMORY=4096
RUN NODE_OPTIONS="--max-old-space-size=${NEXT_BUILD_MEMORY}" npx next build --webpack

# 可选 `ingest` 服务入口（复用本构建阶段，含全量源码与 tsx，无需改动运行镜像）
COPY ingest-entrypoint.sh /ingest-entrypoint.sh
RUN chmod +x /ingest-entrypoint.sh

# ═══════════════════════════════════════════
# Stage 3: Production Runtime
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# ── APT 国内镜像 ──
RUN sed -i 's|http://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    sed -i 's|https://deb.debian.org|http://mirrors.aliyun.com|g' /etc/apt/sources.list.d/debian.sources && \
    echo 'Acquire::Retries "5"; Acquire::http::Timeout "30";' > /etc/apt/apt.conf.d/99retry && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates openssl curl && \
    rm -rf /var/lib/apt/lists/*

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
COPY ingest-entrypoint.sh /ingest-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh /migrate-entrypoint.sh /ingest-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

# Run as non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ARG VERSION="unknown"
ENV APP_VERSION=${VERSION}
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-http-header-size=1048576"
# Prisma 引擎类型与构建阶段保持一致，确保 migrate / 运行时查询引擎可用
ENV PRISMA_QUERY_ENGINE_TYPE=library

# Health check
# start-period 放宽到 120s：弱机器上「迁移 + 冷启动」可能超过 30s，
# 否则新容器尚未监听 3000 端口就被判 unhealthy 并回滚，部署永远过不了。
HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=5 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
