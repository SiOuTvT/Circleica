/**
 * 速率限制器 - 支持 Redis（分布式）和内存（单实例）两种后端
 * 自动根据环境配置选择后端
 */

import { cache, isRedisAvailable } from "./redis"

interface RateLimitEntry {
  count: number
  resetTime: number
}

export interface RateLimitConfig {
  windowMs: number // 时间窗口（毫秒）
  maxRequests: number // 最大请求数
  message?: string // 超限时的错误消息
}

// ============ 内存后端 ============
const memoryStore = new Map<string, RateLimitEntry>()
const MAX_STORE_SIZE = 10000

// 清理过期记录（每10分钟执行一次）
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of memoryStore.entries()) {
      if (entry.resetTime < now) {
        memoryStore.delete(key)
      }
    }
  }, 600000)
}

function memoryRateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const entry = memoryStore.get(key)

  if (!entry || entry.resetTime < now) {
    // 防止内存溢出
    if (memoryStore.size >= MAX_STORE_SIZE) {
      const oldestKey = memoryStore.keys().next().value
      if (oldestKey) memoryStore.delete(oldestKey)
    }
    memoryStore.set(key, { count: 1, resetTime: now + config.windowMs })
    return { allowed: true, remaining: config.maxRequests - 1, resetTime: now + config.windowMs }
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetTime: entry.resetTime }
  }

  entry.count++
  return { allowed: true, remaining: config.maxRequests - entry.count, resetTime: entry.resetTime }
}

// ============ Redis 后端 ============
async function redisRateLimit(key: string, config: RateLimitConfig): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  const redisKey = `rl:${key}`
  const now = Date.now()
  const windowSec = Math.ceil(config.windowMs / 1000)

  try {
    // 使用原子 INCR 操作，避免竞态条件
    const newCount = await cache.incr(redisKey, windowSec)

    if (newCount > config.maxRequests) {
      return { allowed: false, remaining: 0, resetTime: now + config.windowMs }
    }

    return {
      allowed: true,
      remaining: Math.max(0, config.maxRequests - newCount),
      resetTime: now + config.windowMs,
    }
  } catch {
    // Redis 失败时降级到内存限流
    return memoryRateLimit(key, config)
  }
}

// ============ 统一接口 ============
export async function getRateLimit(key: string, config: RateLimitConfig): Promise<{
  allowed: boolean
  remaining: number
  resetTime: number
}> {
  if (isRedisAvailable()) {
    return redisRateLimit(key, config)
  }
  return memoryRateLimit(key, config)
}

/**
 * 获取客户端 IP 地址
 * 注意：x-forwarded-for 在无反向代理时可被客户端伪造。
 * 生产环境应确保有反向代理（nginx/Cloudflare）设置此头。
 * 仅用于速率限制等临时场景，不用于永久存储。
 */
export function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  const realIP = req.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }
  return "unknown"
}

// 预定义的速率限制配置
export const rateLimits = {
  /** API 通用限制：每分钟 60 次请求 */
  api: { windowMs: 60_000, maxRequests: 60, message: "请求过于频繁，请稍后再试" },
  /** 登录限制：每分钟 5 次尝试 */
  auth: { windowMs: 60_000, maxRequests: 5, message: "登录尝试次数过多，请 1 分钟后再试" },
  /** 注册限制：每小时 3 次 */
  register: { windowMs: 3_600_000, maxRequests: 3, message: "注册次数过多，请 1 小时后再试" },
  /** 评论限制：每分钟 10 次 */
  comment: { windowMs: 60_000, maxRequests: 10, message: "评论发布过于频繁，请稍后再试" },
  /** 文件上传限制：每小时 20 次 */
  upload: { windowMs: 3_600_000, maxRequests: 20, message: "上传次数过多，请 1 小时后再试" },
  /** 搜索限制：每分钟 30 次 */
  search: { windowMs: 60_000, maxRequests: 30, message: "搜索过于频繁，请稍后再试" },
  /** 密码重置：每小时 3 次 */
  passwordReset: { windowMs: 3_600_000, maxRequests: 3, message: "密码重置请求过多，请 1 小时后再试" },
} as const

/**
 * 便捷的速率限制检查函数（用于 API 路由）
 * @example
 * ```ts
 * const result = await checkRateLimit(rateLimits.auth)
 * if (!result.success) {
 *   return NextResponse.json({ error: "请求过于频繁" }, { status: 429 })
 * }
 * ```
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const { headers } = await import("next/headers")
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ??
             headersList.get("x-real-ip") ??
             "unknown"

  const key = `ip:${ip}`
  const result = await getRateLimit(key, config)

  return {
    success: result.allowed,
    limit: config.maxRequests,
    remaining: result.remaining,
    reset: Math.ceil(result.resetTime / 1000),
  }
}