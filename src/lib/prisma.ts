import { PrismaClient, Prisma } from "@prisma/client"

/**
 * Prisma Client 单例
 *
 * - 开发环境：globalThis 缓存，避免 HMR 创建多个连接
 * - 生产环境：单实例，连接池通过 connection_limit 控制
 * - Serverless：每次冷启动创建新实例，pool=1
 */

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createPrismaClient(): PrismaClient {
  const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
  const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || (isServerless ? "1" : "10"))

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    datasources: {
      db: {
        url: addConnectionParams(process.env.DATABASE_URL!, {
          connection_limit: poolSize,
          pool_timeout: 20,
          connect_timeout: 10,
        }),
      },
    },
  })
}

/**
 * 给数据库 URL 添加连接参数
 * 正确处理已有的 query string
 */
function addConnectionParams(url: string, params: Record<string, string | number>): string {
  try {
    const u = new URL(url)
    for (const [k, v] of Object.entries(params)) {
      if (!u.searchParams.has(k)) {
        u.searchParams.set(k, String(v))
      }
    }
    return u.toString()
  } catch {
    // URL 解析失败时返回原值（build 阶段 placeholder URL）
    return url
  }
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// 开发环境缓存到 globalThis
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}

// 优雅关闭
if (typeof process !== "undefined") {
  const shutdown = () => {
    prisma.$disconnect().catch(() => {})
  }
  process.on("beforeExit", shutdown)
  process.on("SIGTERM", shutdown)
  process.on("SIGINT", shutdown)
}

export { Prisma }
