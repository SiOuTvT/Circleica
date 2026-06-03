# ═══════════════════════════════════════════
# Stage 1: Dependencies
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS deps

WORKDIR /app

# Install system dependencies for sharp and prisma
RUN apt-get update -qq && \
    apt-get install -y --no-install-recommends openssl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY package.json package-lock.json ./

# Install production + dev dependencies (dev needed for build)
RUN npm ci --no-audit --no-fund

# Generate Prisma client
COPY prisma ./prisma/
RUN npx prisma generate

# ═══════════════════════════════════════════
# Stage 2: Build
# ═══════════════════════════════════════════
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Copy dependencies from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy source code
COPY . .

# Set build-time environment
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

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

# Create non-root user
RUN groupadd --gid 1001 nodejs && \
    useradd --uid 1001 --gid nodejs --shell /bin/bash --create-home nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
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

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NODE_OPTIONS="--max-http-header-size=1048576"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

# Start application via entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]
