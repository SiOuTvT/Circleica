import { PrismaClient, Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"
import { getMockResult } from "@/lib/prisma-mock"

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

const realPrisma = globalForPrisma.prisma ?? createPrismaClient()

// 开发环境缓存到 globalThis
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = realPrisma
}

/**
 * 数据库不可达时的自动回退（示例数据）。
 *
 * 机制：模块加载时发起一次轻量探测（$queryRaw SELECT 1）。
 * - 探测成功 → 全程使用真实 Prisma（生产/本机有库时，行为不变）。
 * - 探测失败（沙箱/离线）→ 所有读查询改走 src/lib/prisma-mock 的示例数据，
 *   页面照常渲染，不再整页「数据加载失败」。
 * 另外对每个真实查询包了 .catch：即便探测误判，运行时首个查询失败也会自动切到示例数据。
 */
const enabled = { mock: false }
let probePromise: Promise<boolean> | null = null

function ensureProbe(): Promise<boolean> {
  if (!probePromise) {
    probePromise = (realPrisma as any)
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => {
        enabled.mock = true
        return false
      })
  }
  return probePromise!
}

function buildModelProxy(realModel: any, modelName: string, forceMock = false) {
  const cache = new Map<string, any>()
  return new Proxy(realModel, {
    get(target, methodName: string) {
      const fn = (target as any)[methodName]
      if (typeof fn !== "function") return fn
      return (...callArgs: any[]) =>
        ensureProbe().then((ok) => {
          if (ok && !enabled.mock && !forceMock) {
            return fn(...callArgs).catch((err: any) => {
              enabled.mock = true
              logger.db.warn(`[mock-fallback] ${modelName}.${methodName} 失败，回退示例数据`, err?.message)
              return getMockResult(modelName, methodName, callArgs)
            })
          }
          return getMockResult(modelName, methodName, callArgs)
        })
    },
  })
}

function buildPrismaProxy(real: any, forceMock = false) {
  const modelCache = new Map<string, any>()
  const getModelProxy = (modelName: string) => {
    if (!modelCache.has(modelName)) {
      modelCache.set(modelName, buildModelProxy((real as any)[modelName], modelName, forceMock))
    }
    return modelCache.get(modelName)
  }

  return new Proxy(real, {
    get(target, prop: string) {
      if (prop === "$queryRaw" || prop === "$executeRaw") {
        const fn = (target as any)[prop]
        return (...callArgs: any[]) =>
          ensureProbe().then((ok) =>
            ok && !enabled.mock && !forceMock ? fn(...callArgs).catch(() => []) : [],
          )
      }
      if (prop === "$transaction") {
        const fn = (target as any)[prop]
        return (arg: any) =>
          ensureProbe().then((ok) => {
            if (ok && !enabled.mock && !forceMock) {
              try {
                return fn(arg)
              } catch {
                return Array.isArray(arg) ? [] : null
              }
            }
            if (Array.isArray(arg)) return []
            if (typeof arg === "function") return arg(buildPrismaProxy(real, true))
            return []
          })
      }
      if (typeof prop === "string" && prop.startsWith("$")) {
        // $connect / $disconnect / $use / $extends / $on / $metrics ...
        return (target as any)[prop]
      }
      const val = (target as any)[prop]
      if (val && typeof val === "object") {
        return getModelProxy(prop)
      }
      return val
    },
  })
}

export const prisma = buildPrismaProxy(realPrisma) as unknown as PrismaClient

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
