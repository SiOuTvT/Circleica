import { PrismaClient } from "@/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
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

  // 与 env.ts 保持一致：DATABASE_URL 缺失时用占位串，确保 PrismaClient 构造不抛错
  // （缺失库环境下由下方离线回退机制处理连接失败，而非在模块加载时直接崩溃）。
  // 生产/本地有真实连接串时该值不变，行为不受影响。
  const dbUrl =
    process.env.DATABASE_URL || "postgresql://placeholder:placeholder@localhost:5432/placeholder"

  // 连接参数：语义与原先 datasources 的 connection_limit/pool_timeout/connect_timeout 一致
  const connectionParams = {
    connection_limit: poolSize,
    pool_timeout: 20,
    connect_timeout: 10,
  }

  // Prisma 7 强制驱动适配器：连接池交 pg 管理，故将同样的参数映射到 pg Pool 选项，
  // 保持「连接池大小 / 连接超时 / 空闲回收」生命周期行为不变。
  // 同时保留 addConnectionParams 对 URL 的改造（兼容日志/可能读取 query 的工具）。
  const adapter = new PrismaPg({
    connectionString: addConnectionParams(dbUrl, connectionParams),
    max: connectionParams.connection_limit,
    connectionTimeoutMillis: connectionParams.connect_timeout * 1000,
    idleTimeoutMillis: connectionParams.pool_timeout * 1000,
    ...buildSslConfig(),
  })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  })
}

/**
 * 生产 SSL 配置：仅由环境变量驱动，禁止硬编码证书/密码/连接参数。
 * - DATABASE_SSL=true  → 跳过证书校验（自签/内网常用）
 * - DATABASE_SSL_CA    → 使用指定 CA 并强制校验
 * 未设置时返回空对象，由连接串自身的 sslmode 决定。
 */
function buildSslConfig(): { ssl?: object } {
  if (process.env.DATABASE_SSL === "true") {
    return { ssl: { rejectUnauthorized: false } }
  }
  if (process.env.DATABASE_SSL_CA) {
    return { ssl: { ca: process.env.DATABASE_SSL_CA, rejectUnauthorized: true } }
  }
  return {}
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

export const realPrisma = globalForPrisma.prisma ?? createPrismaClient()

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
 *
 * 【自愈】离线标志带时间窗，不再是一次抖动就永久降级：
 * 进入离线后仅在 OFFLINE_RETRY_MS 窗口内直接返回空结果；窗口过期即"半开"，
 * 放行一次真实查询探活——成功则自动恢复在线，失败则重新计时。
 * 生产环境下首次转为离线会上报 Sentry，避免"整站空数据但无人知情"。
 */
const OFFLINE_RETRY_MS = 30_000

/** 离线起始时间戳；0 表示在线 */
const offlineState = { since: 0 }
let probePromise: Promise<boolean> | null = null

function markOffline(context: string, message: string): void {
  const wasOnline = offlineState.since === 0
  offlineState.since = Date.now()
  // 让下一次半开探活重新发起探测，而不是复用已 resolve 的旧结果
  probePromise = null

  if (!wasOnline) return

  logger.db.error(
    `[db-offline] 数据库连接失败，进入离线降级（${OFFLINE_RETRY_MS / 1000}s 后自动半开重试）`,
    `${context}: ${message}`,
  )

  // 生产环境显式告警：离线降级返回的是空结果而非报错，页面看起来"正常"，
  // 不上报就会变成静默故障。
  if (process.env.NODE_ENV === "production") {
    import("@sentry/nextjs")
      .then((Sentry) => {
        Sentry.captureMessage(`[db-offline] ${context}: ${message}`, "error")
      })
      .catch(() => {})
  }
}

function markOnline(): void {
  if (offlineState.since === 0) return
  offlineState.since = 0
  logger.db.info("[db-online] 数据库连接已恢复，离线降级解除")
}

/**
 * 是否处于离线降级窗口内。
 * 副作用：窗口过期时自动转入"半开"（清除离线标志），让下一次调用真实探活。
 */
function isOfflineWindowActive(): boolean {
  if (offlineState.since === 0) return false
  if (Date.now() - offlineState.since >= OFFLINE_RETRY_MS) {
    offlineState.since = 0
    probePromise = null
    logger.db.warn("[db-halfopen] 离线窗口到期，放行一次探活请求")
    return false
  }
  return true
}

function ensureProbe(): Promise<boolean> {
  if (isOfflineWindowActive()) return Promise.resolve(false)

  if (!probePromise) {
    probePromise = realPrisma
      .$queryRaw`SELECT 1`
      .then(() => {
        markOnline()
        return true
      })
      .catch((err: unknown) => {
        markOffline("probe", (err as Error)?.message ?? "unknown")
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

/**
 * 挂载在代理包装上的原始 PrismaPromise（惰性 getter）。
 * 关键：不在创建代理包装时立即调用 fn.call()——PrismaPromise 一旦被 .then 消费就会
 * 脱离 $transaction 的原子性控制（提前独立执行）。因此必须延迟到「真正 await」或
 * 「进入 $transaction」时才创建并消费。
 */
const ORIGINAL_PROMISE = Symbol("prismaOriginalPromise")

function buildModelProxy(realModel: unknown, modelName: string, forceMock = false) {
  return new Proxy(realModel as object, {
    get(target, methodName) {
      const fn = (target as Record<string, unknown>)[methodName as string]
      if (typeof fn !== "function") return fn
      return (...callArgs: unknown[]) => {
        // 延迟创建的原始 PrismaPromise：避免被提前消费而脱离事务
        let rawPromise: Promise<unknown> | null = null
        const ensureRaw = () => {
          if (!rawPromise) {
            rawPromise = (fn as (...a: unknown[]) => Promise<unknown>).call(target, ...callArgs)
          }
          return rawPromise
        }

        // thenable 包装：await/Promise.all 走这里（此时才真正消费 rawPromise）
        const wrapped = {
          then(resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) {
            return ensureProbe()
              .then((ok) => {
                if (ok && !isOfflineWindowActive() && !forceMock) {
                  return ensureRaw()
                    .then((result: unknown) => {
                      // 真实查询成功即视为链路健康（覆盖半开探活成功的场景）
                      markOnline()
                      return result
                    })
                    .catch((err: unknown) => {
                      // 只在连接级错误时标记离线，数据约束冲突等不应触发离线回退
                      const msg = (err as Error)?.message ?? ""
                      const isConnectionError = /ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Can't reach database|Server has closed/i.test(msg)
                      if (isConnectionError) {
                        markOffline(`${modelName}.${String(methodName)}`, msg)
                      } else {
                        logger.db.warn(`[db-error] ${modelName}.${String(methodName)} 失败（非连接问题）`, { error: msg })
                      }
                      return getEmptyResult(modelName, String(methodName))
                    })
                }
                return getEmptyResult(modelName, String(methodName))
              })
              .then(resolve, reject)
          },
          catch(reject: (e: unknown) => unknown) {
            return this.then(() => undefined, reject)
          },
          finally(callback: () => unknown) {
            return this.then(
              (v: unknown) => { callback(); return v },
              (e: unknown) => { callback(); throw e },
            )
          },
        }
        // 惰性 getter：$transaction 数组还原时读取（此时才创建，未消费）
        Object.defineProperty(wrapped, ORIGINAL_PROMISE, {
          get: () => ensureRaw(),
        })
        return wrapped as unknown as Promise<unknown>
      }
    },
  })
}

/** 从代理包装还原原始 PrismaPromise（触发惰性创建，未消费）；非代理值原样返回 */
function unwrapPrismaPromise<T>(p: T): T {
  if (p && typeof p === "object" && ORIGINAL_PROMISE in (p as object)) {
    return (p as unknown as Record<symbol, unknown>)[ORIGINAL_PROMISE] as T
  }
  return p
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
            if (ok && !isOfflineWindowActive() && !forceMock) {
              return (fn as (...a: unknown[]) => Promise<unknown>).call(target, ...callArgs).catch((err: unknown) => {
                // 连接级失败要登记离线，否则 $queryRaw 抛错后状态机无感知
                const msg = (err as Error)?.message ?? ""
                if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT|ECONNRESET|Can't reach database|Server has closed/i.test(msg)) {
                  markOffline(String(prop), msg)
                }
                // 写操作失败暴露原始错误；读查询失败抛异常让上层感知
                throw err
              })
            }
            // 离线：写操作无法执行，明确抛 503（而非静默返回空）
            if (isWrite) throw new ServiceUnavailableError("数据库未连接，无法执行写操作")
            throw new ServiceUnavailableError("数据库未连接，无法执行读查询")
          })
      }
      if (prop === "$transaction") {
        const fn = (target as Record<string, unknown>)[prop] as (...a: unknown[]) => unknown
        return (arg: unknown) =>
          ensureProbe().then((ok) => {
            if (ok && !isOfflineWindowActive() && !forceMock) {
              try {
                // 数组形式的交互事务：把代理 Promise 还原为原始 PrismaPromise，
                // 否则原生 $transaction 会因「非 PrismaPromise 元素」抛错（P0：收藏/签到/发帖全受影响）。
                if (Array.isArray(arg)) {
                  const restored = arg.map((el) => unwrapPrismaPromise(el))
                  return fn.call(target, restored)
                }
                return fn.call(target, arg)
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

// Prisma 7 的运行时辅助函数（join / sql / raw 等）通过命名空间暴露，下游既要「值」
// （Prisma.join() / Prisma.sql``）也要「类型」（Prisma.InputJsonValue 等）。这里必须用
// 显式 re-export 同时导出二者：若写成「import { Prisma } 后再 export { Prisma }」两步，
// Next 的 swc 在 isolatedModules 下会把本文件未作值使用的 Prisma 误判为仅类型而擦除，
// 导致页面 Prisma.join() 运行时崩溃（Build 预渲染 admin 页面直接挂掉）。
export { Prisma } from "@/generated/prisma/client"
