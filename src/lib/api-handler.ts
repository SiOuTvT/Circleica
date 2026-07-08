/**
 * API Route Handler 包装器
 *
 * 统一错误处理 + 响应格式。
 * Route handler 只做：解析请求 → 调用 Service → 返回结果
 *
 * 使用方式：
 *   // src/app/api/announcements/route.ts
 *   import { withHandler, json } from "@/lib/api-handler"
 *   import { announcementService } from "@/services/announcement"
 *
 *   export const GET = withHandler(async (req) => {
 *     const data = await announcementService.getLatest()
 *     return json(data)
 *   })
 */

import { NextRequest, NextResponse } from "next/server"
import { ZodError } from "zod"
import { AppError, RateLimitError } from "./errors"
import { logger } from "./logger"

// ── 响应类型 ────────────────────────

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  code?: string
  details?: Record<string, string[]>
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ── 成功响应 ────────────────────────

export function json<T>(data: T, status = 200): NextResponse {
  return NextResponse.json<ApiResponse<T>>({ success: true, data }, { status })
}

export function created<T>(data: T): NextResponse {
  return json(data, 201)
}

export function paginated<T>(
  data: T,
  pagination: { page: number; pageSize: number; total: number },
): NextResponse {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
    },
  })
}

export function noContent(): NextResponse {
  return new NextResponse(null, { status: 204 })
}

// ── 错误响应（内部用）──────────────

function errorResponse(message: string, status: number, code?: string, details?: Record<string, string[]>): NextResponse {
  const headers: Record<string, string> = {}
  if (code === "RATE_LIMITED") {
    headers["Retry-After"] = "60"
  }
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, code, details },
    { status, headers },
  )
}

// ── Handler 包装 ────────────────────

type RouteHandler = (req: NextRequest, ctx?: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

/**
 * 包装 API Route Handler，统一处理异常
 *
 * 捕获顺序：
 * 1. AppError → 对应 HTTP 状态码
 * 2. ZodError → 422 + 字段详情
 * 3. 其他 → 500 + 日志
 */
export function withHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx)
    } catch (error) {
      // 业务异常
      if (error instanceof AppError) {
        if (error instanceof RateLimitError) {
          logger.api.warn("请求被限流", { path: req.nextUrl.pathname })
        } else if (error.status >= 500) {
          logger.api.error(`[${error.code}] ${error.message}`, error)
        }
        return errorResponse(error.message, error.status, error.code, error.details)
      }

      // Zod 验证错误
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {}
        for (const issue of error.issues) {
          const path = issue.path.join(".")
          if (!details[path]) details[path] = []
          details[path].push(issue.message)
        }
        return errorResponse("数据验证失败", 422, "VALIDATION_ERROR", details)
      }

      // 未知异常
      logger.api.error("未处理的 API 异常", error, { path: req.nextUrl.pathname })
      return errorResponse("服务器内部错误，请稍后再试", 500, "INTERNAL")
    }
  }
}

// ── 请求解析工具 ────────────────────

import { z } from "zod"

/**
 * 安全解析 JSON 请求体
 */
export async function parseBody<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): Promise<z.infer<T>> {
  const body = await req.json()
  return schema.parse(body) // 失败时抛 ZodError，由 withHandler 捕获
}

/**
 * 解析查询参数
 */
export function parseSearchParams<T extends z.ZodType>(
  req: NextRequest,
  schema: T,
): z.infer<T> {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries())
  return schema.parse(params)
}
