# ═══════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# ── 阿里云镜像源（HTTPS） ──
# 第一步：HTTP 引导安装 ca-certificates（解决 TLS 证书链缺失）
# 第二步：切换 HTTPS 镜像，正式安装依赖
RUN echo "deb http://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
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

# ── 阿里云镜像源（HTTPS） ──
RUN echo "deb http://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
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

# 构建时环境变量占位符（真实值在运行时注入，避免密钥泄漏到镜像层）
ARG DATABASE_URL="postgresql://build:placeholder@localhost:5432/build"
ARG NEXTAUTH_SECRET="build-placeholder-secret-not-used-at-runtime-32chars"
ARG NEXTAUTH_URL="http://localhost:3000"
ARG VERSION="unknown"
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}
ENV APP_VERSION=${VERSION}

# Build the application
RUN npm run build

# ═══════════════════════════════════════════
# Stage 3: Production Runtime
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# ── 阿里云镜像源（HTTPS） ──
RUN echo "deb http://mirrors.aliyun.com/debian bookworm main contrib non-free non-free-firmware" \
      > /etc/apt/sources.list.d/mirror-bootstrap.list && \
    echo "deb http://mirrors.aliyun.com/debian-security bookworm-security main contrib non-free non-free-firmware" \
      >> /etc/apt/sources.list.d/mirror-bootstrap.list && \
    apt-get update -qq && \
    apt-get install -y --no-install-recommends ca-certificates && \
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
# Copy Prisma CLI + engine + generated client + schema
COPY --from=builder /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma

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
