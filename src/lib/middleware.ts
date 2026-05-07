import { NextRequest, NextResponse } from "next/server"
import { getRateLimit, getClientIP, RateLimitConfig } from "./rate-limit"

/**
 * 为 API 路由添加速率限制
 * @param handler 原始请求处理函数
 * @param config 速率限制配置
 * @param keyPrefix 限流键前缀（用于区分不同 API）
 */
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config: RateLimitConfig,
  keyPrefix: string = "api"
) {
  return async (req: NextRequest) => {
    const ip = getClientIP(req)
    const key = `${keyPrefix}:${ip}`

    const limit = getRateLimit(key, config)

    if (!limit.allowed) {
      return NextResponse.json(
        { error: config.message || "请求过于频繁" },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": config.maxRequests.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(limit.resetTime).toISOString(),
            "Retry-After": Math.ceil((limit.resetTime - Date.now()) / 1000).toString(),
          },
        }
      )
    }

    // 执行原始处理函数
    const response = await handler(req)

    // 添加速率限制响应头
    response.headers.set("X-RateLimit-Limit", config.maxRequests.toString())
    response.headers.set("X-RateLimit-Remaining", limit.remaining.toString())
    response.headers.set("X-RateLimit-Reset", new Date(limit.resetTime).toISOString())

    return response
  }
}
