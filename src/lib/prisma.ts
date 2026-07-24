import { PrismaClient, Prisma } from "@prisma/client"
import { logger } from "@/lib/logger"
import { ServiceUnavailableError } from "@/lib/errors"

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
 * 数据库不可达时的离线回退（空结果，不编造任何内容）。
 *
 * 机制：模块加载时发起一次轻量探测（$queryRaw SELECT 1）。
 * - 探测成功 → 全程使用真实 Prisma（生产/本机有库时，行为不变）。
 * - 探测失败（沙箱/离线）→ 所有「读查询」返回空结果（findMany→[]、count→0、
 *   findUnique→null 等），页面照常渲染自身已有的空状态/骨架框，不再整页报错，
 *   也绝不注入假数据。写操作在离线回退下会被阻止并抛错，避免静默假成功。
 */
const enabled = { mock: false }
let probePromise: Promise<boolean> | null = null

function ensureProbe(): Promise<boolean> {
  if (!probePromise) {
    probePromise = realPrisma
      .$queryRaw`SELECT 1`
      .then(() => true)
      .catch(() => {
        enabled.mock = true
        return false
      })
  }
  return probePromise!
}

/**
 * 离线回退时各读操作的空结果。写操作/未知方法直接抛错，避免静默假成功。
 */
function getEmptyResult(modelName: string, method: string): unknown {
  switch (method) {
    case "findMany":
    case "findRaw":
    case "deleteMany":
      return []
    case "count":
      return 0
    case "aggregate":
    case "groupBy":
      return { _count: { _all: 0 }, _sum: {}, _avg: {}, _min: {}, _max: {} }
    case "findUnique":
    case "findFirst":
    case "findUniqueOrThrow":
    case "findFirstOrThrow":
      return null
    default:
      throw new ServiceUnavailableError("数据库未连接，服务暂时不可用，写操作已阻止")
  }
}

function buildModelProxy(realModel: unknown, modelName: string, forceMock = false) {
  return new Proxy(realModel as object, {
    get(target, methodName) {
      const fn = (target as Record<string, unknown>)[methodName as string]
      if (typeof fn !== "function") return fn
      return (...callArgs: unknown[]) =>
        ensureProbe().then((ok) => {
          if (ok && !enabled.mock && !forceMock) {
            return (fn as (...a: unknown[]) => Promise<unknown>)(...callArgs).catch((err: unknown) => {
              enabled.mock = true
              logger.db.warn(`[db-offline] ${modelName}.${String(methodName)} 失败，回退空结果`, { error: (err as Error)?.message })
              return getEmptyResult(modelName, String(methodName))
            })
          }
          return getEmptyResult(modelName, String(methodName))
        })
    },
  })
}

function buildPrismaProxy(real: unknown, forceMock = false) {
  const modelCache = new Map<string, unknown>()
  const getModelProxy = (modelName: string) => {
    if (!modelCache.has(modelName)) {
      modelCache.set(modelName, buildModelProxy((real as Record<string, unknown>)[modelName], modelName, forceMock))
    }
    return modelCache.get(modelName)
  }

  return new Proxy(real as object, {
    get(target, prop) {
      if (prop === "$queryRaw" || prop === "$executeRaw") {
        const fn = (target as Record<string, unknown>)[prop]
        const isWrite = prop === "$executeRaw"
        return (...callArgs: unknown[]) =>
          ensureProbe().then((ok) => {
            if (ok && !enabled.mock && !forceMock) {
              return (fn as (...a: unknown[]) => Promise<unknown>)(...callArgs).catch((err: unknown) => {
                // 读查询失败回退空数组；写操作（executeRaw）失败必须暴露原始错误
                if (isWrite) throw err
                return []
              })
            }
            // 离线：写操作无法执行，明确抛 503（而非静默返回空）
            if (isWrite) throw new ServiceUnavailableError("数据库未连接，无法执行写操作")
            return []
          })
      }
      if (prop === "$transaction") {
        const fn = (target as Record<string, unknown>)[prop]
        return (arg: unknown) =>
          ensureProbe().then((ok) => {
            if (ok && !enabled.mock && !forceMock) {
              try {
                return (fn as (a: unknown) => unknown)(arg)
              } catch (err) {
                // 真实事务失败要暴露错误，不要静默返回空（否则上层 result.xxx → TypeError → 500）
                logger.db.error("[db] $transaction 失败", (err as Error)?.message)
                throw err
              }
            }
            // 离线：事务无法执行（初始化引导依赖事务写库），明确抛 503 而非返回空
            throw new ServiceUnavailableError("数据库未连接，无法执行事务（初始化需要数据库）")
          })
      }
      if (typeof prop === "string" && prop.startsWith("$")) {
        // $connect / $disconnect / $use / $extends / $on / $metrics ...
        return (target as Record<string, unknown>)[prop]
      }
      const val = (target as Record<string, unknown>)[prop as string]
      if (val && typeof val === "object") {
        return getModelProxy(String(prop))
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
