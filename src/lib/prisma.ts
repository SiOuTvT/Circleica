import { PrismaClient, Prisma } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

// 连接池配置：根据部署环境动态调整
// - Vercel/Serverless: 1 (无连接池)
// - 单实例部署：可用连接的 80%
// - 多实例部署：可用连接 / 实例数
const isServerless = !!process.env.VERCEL || !!process.env.AWS_LAMBDA_FUNCTION_NAME
const poolSize = parseInt(process.env.DATABASE_POOL_SIZE || "10")

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: {
      db: {
        url: isServerless
          ? process.env.DATABASE_URL
          : `${process.env.DATABASE_URL}${process.env.DATABASE_URL?.includes("?") ? "&" : "?"}connection_limit=${poolSize}&pool_timeout=20`,
      },
    },
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

export { Prisma }
