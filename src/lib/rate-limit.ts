/**
 * 简单的基于内存的速率限制器
 * 生产环境建议使用 Redis 实现分布式限流
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// 内存存储 - 生产环境应替换为 Redis
const store = new Map<string, RateLimitEntry>()
const MAX_STORE_SIZE = 10000 // 最大存储条目数，防止内存溢出

// 清理过期记录（每10分钟执行一次）
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of store.entries()) {
    if (entry.resetTime < now) {
      store.delete(key)
    }
  }
}, 600000)

export interface RateLimitConfig {
  windowMs: number // 时间窗口（毫秒）
  maxRequests: number // 最大请求数
  message?: string // 超限时的错误消息
}

export function getRateLimit(key: string, config: RateLimitConfig): {
  allowed: boolean
  remaining: number
  resetTime: number
} {
  const now = Date.now()
  const entry = store.get(key)

  // 如果记录不存在或已过期，创建新记录
  if (!entry || entry.resetTime < now) {
    store.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    }
  }

  // 检查是否超过限制
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    }
  }

  // 增加计数
  entry.count++
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.resetTime,
  }
}

export function getClientIP(req: Request): string {
  // 尝试从多个 header 获取真实 IP
  const forwarded = req.headers.get("x-forwarded-for")
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }

  const realIP = req.headers.get("x-real-ip")
  if (realIP) {
    return realIP
  }

  // 降级到 URL（在 Next.js middleware 中可能不可用）
  return "unknown"
}

// 预定义的速率限制配置
export const rateLimits = {
  // API 通用限制：每分钟 60 次请求
  api: {
    windowMs: 60000,
    maxRequests: 60,
    message: "请求过于频繁，请稍后再试",
  },
  // 登录限制：每分钟 5 次尝试
  auth: {
    windowMs: 60000,
    maxRequests: 5,
    message: "登录尝试次数过多，请 1 分钟后再试",
  },
  // 注册限制：每小时 3 次
  register: {
    windowMs: 3600000,
    maxRequests: 3,
    message: "注册次数过多，请 1 小时后再试",
  },
  // 评论限制：每分钟 10 次
  comment: {
    windowMs: 60000,
    maxRequests: 10,
    message: "评论发布过于频繁，请稍后再试",
  },
  // 文件上传限制：每小时 20 次
  upload: {
    windowMs: 3600000,
    maxRequests: 20,
    message: "上传次数过多，请 1 小时后再试",
  },
  // 搜索限制：每分钟 30 次
  search: {
    windowMs: 60000,
    maxRequests: 30,
    message: "搜索过于频繁，请稍后再试",
  },
} as const

import { headers } from "next/headers"

interface RateLimitConfig {
  maxRequests: number  // 最大请求数
  windowMs: number     // 时间窗口（毫秒）
}

// 简单的内存存储（生产环境建议使用 Redis）
const rateLimitStore = new Map<string, { count: number; resetTime: number }>()

// 清理过期记录（每5分钟）
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 5 * 60 * 1000)

export async function checkRateLimit(config: RateLimitConfig): Promise<{
  success: boolean
  limit: number
  remaining: number
  reset: number
}> {
  const headersList = await headers()
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? 
             headersList.get("x-real-ip") ?? 
             "unknown"
  
  const key = `rate-limit:${ip}`
  const now = Date.now()
  const record = rateLimitStore.get(key)

  if (!record || now > record.resetTime) {
    // 新窗口
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      success: true,
      limit: config.maxRequests,
      remaining: config.maxRequests - 1,
      reset: Math.ceil((now + config.windowMs) / 1000),
    }
  }

  record.count++

  if (record.count > config.maxRequests) {
    return {
      success: false,
      limit: config.maxRequests,
      remaining: 0,
      reset: Math.ceil(record.resetTime / 1000),
    }
  }

  rateLimitStore.set(key, record)
  return {
    success: true,
    limit: config.maxRequests,
    remaining: config.maxRequests - record.count,
    reset: Math.ceil(record.resetTime / 1000),
  }
}

// 预设的速率限制配置
export const RATE_LIMITS = {
  // API 通用限制：每分钟 60 次
  api: { maxRequests: 60, windowMs: 60 * 1000 },
  // 登录/注册：每分钟 5 次（防止暴力破解）
  auth: { maxRequests: 5, windowMs: 60 * 1000 },
  // 密码重置：每小时 3 次
  passwordReset: { maxRequests: 3, windowMs: 60 * 60 * 1000 },
  // 评论/发帖：每分钟 10 次
  comment: { maxRequests: 10, windowMs: 60 * 1000 },
  // 文件上传：每小时 20 次
  upload: { maxRequests: 20, windowMs: 60 * 60 * 1000 },
} as const
