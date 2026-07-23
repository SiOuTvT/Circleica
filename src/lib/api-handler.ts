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
import { Prisma } from "@prisma/client"
import { AppError, RateLimitError, NotFoundError, ConflictError, ValidationError } from "./errors"
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

/**
 * 客户端解析 API 响应
 * 统一处理 { success, data } 包装格式，兼容直接返回数组/对象的旧 API
 */
export function parseApiResponse<T>(json: unknown): T {
  if (json && typeof json === "object" && "data" in json) {
    return (json as { data: T }).data
  }
  return json as T
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

function errorResponse(message: string, status: number, code?: string, details?: Record<string, string[]>, retryAfter?: number): NextResponse {
  const headers: Record<string, string> = {}
  if (code === "RATE_LIMITED") {
    // 优先使用异常中携带的 retryAfter；未携带时回退到默认 60s
    headers["Retry-After"] = retryAfter ? String(retryAfter) : "60"
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
          // 携带异常中的 retryAfter，让客户端获得准确的重试时间（L2③）
          return errorResponse(error.message, error.status, error.code, error.details, error.retryAfter)
        }
        if (error.status >= 500) {
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

      // Prisma 已知错误（数据库约束/记录不存在）→ 映射到标准业务异常
      // 集中在此处理，避免每个 Service/Repository 重复 try-catch Prisma。
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        const mapped = mapPrismaError(error)
        logger.api.error(`[${mapped.code}] ${mapped.message}`, error)
        return errorResponse(mapped.message, mapped.status, mapped.code)
      }

      // 未知异常
      logger.api.error("未处理的 API 异常", error, { path: req.nextUrl.pathname })
      return errorResponse("服务器内部错误，请稍后再试", 500, "INTERNAL")
    }
  }
}

// ── Prisma 错误映射 ────────────────

/**
 * 将 Prisma 已知错误统一映射为 AppError。
 * 在 withHandler 中集中捕获，避免每个 Service 重复处理数据库错误。
 */
function mapPrismaError(error: Prisma.PrismaClientKnownRequestError): AppError {
  switch (error.code) {
      case "P2002":
        return new ConflictError("数据冲突：违反唯一约束，请检查是否重复提交")
    case "P2025":
      return new NotFoundError("目标记录")
    case "P2003":
      return new ValidationError("外键约束失败：关联记录不存在或不可删除")
    case "P2014":
    case "P2016":
      return new NotFoundError("关联数据")
      default:
        return new AppError("数据库错误，请稍后再试", "INTERNAL", 500)
  }
}

// ── 请求解析工具 ────────────────────

/**
 * 安全解析 JSON 请求体：非法/空 JSON 统一抛 422（ValidationError），
 * 而非让 withHandler 当作未知异常返回 500。
 */
export async function safeParseJson<T = any>(
  req: NextRequest,
  options?: { allowEmpty?: boolean },
): Promise<T> {
  try {
    return (await req.json()) as T
  } catch {
    if (options?.allowEmpty) return {} as T
    throw new ValidationError("请求体格式错误，请提供合法的 JSON")
  }
}
