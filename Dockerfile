# ═══════════════════════════════════════════
# 🎮 Fangame - Galgame/Visual Novel Community
# ═══════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Install system dependencies for sharp and prisma
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# 使用国内 npm 镜像加速下载
RUN npm config set registry https://registry.npmmirror.com

# Copy dependency files
COPY package.json package-lock.json ./

# Install all dependencies (--legacy-peer-deps 解决 @uploadthing/react 与 React 19 的冲突)
RUN npm ci --no-audit --no-fund --legacy-peer-deps

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# ═══════════════════════════════════════════
# Stage 2: Build
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Install openssl for Prisma engine detection
RUN apt-get update -qq && \
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

# 构建时需要的环境变量（用于 Next.js 环境验证）
ARG DATABASE_URL
ARG NEXTAUTH_SECRET
ARG NEXTAUTH_URL
ENV DATABASE_URL=${DATABASE_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
ENV NEXTAUTH_URL=${NEXTAUTH_URL}

# Build the application
RUN npm run build

# ═══════════════════════════════════════════
# Stage 3: Production Runtime
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS runner

WORKDIR /app

# Install runtime dependencies
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends \
      openssl \
      curl \
    && rm -rf /var/lib/apt/lists/*

# 使用国内 npm 镜像
RUN npm config set registry https://registry.npmmirror.com

# 安装 prisma CLI（用于 migrate deploy）
RUN npm install -g prisma@6

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy built application (standalone)
COPY --from=builder /app/.next/standalone ./
# Copy static assets
COPY --from=builder /app/.next/static ./.next/static
# Copy public directory (uploads, favicon, etc.)
COPY --from=builder /app/public ./public
# Copy Prisma schema and engine
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Create uploads directory with proper permissions
RUN mkdir -p /app/public/uploads && \
    chown -R nextjs:nodejs /app/public/uploads

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

# Expose port
EXPOSE 3000

# Labels
LABEL org.opencontainers.image.title="Fangame"
LABEL org.opencontainers.image.description="Galgame/Visual Novel Community Platform"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.source="https://github.com/your-repo/fangame"

# Environment variables
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-http-header-size=1048576"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
