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
