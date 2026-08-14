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
import { SpanStatusCode } from "@opentelemetry/api"
import * as Sentry from "@sentry/nextjs"
import { AppError, RateLimitError, NotFoundError, ConflictError, ValidationError } from "./errors"
import { logger } from "./logger"
import { withActiveSpan, recordRequest, recordError, getActiveTraceContext } from "./telemetry"
import { runWithRequestContext } from "./request-context"

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

/**
 * Route handler 签名。
 *
 * ⚠️ `ctx` 必须是**必填**参数：Next.js 会为每个 route 生成类型校验文件
 * （`.next/types/app/**\/route.ts`），要求第二个参数可赋给 `RouteContext`。
 * 写成 `ctx?:` 会让推导出的类型带上 `| undefined`，构建期直接 TS2344 失败。
 * 运行时 Next 总会传入 context 对象（无动态段时 params 解析为 {}），
 * 处理器内部按需声明 `(req)` 或 `(req, ctx)` 都不受影响。
 */
type RouteHandler = (req: NextRequest, ctx: { params: Promise<Record<string, string>> }) => Promise<NextResponse>

/**
 * 包装 API Route Handler，统一处理异常
 *
 * 捕获顺序：
 * 1. AppError → 对应 HTTP 状态码
 * 2. ZodError → 422 + 字段详情
 * 3. 其他 → 500 + 日志
 */
/**
 * 把服务端异常上报到 Sentry，并附带当前 Trace 上下文（错误 ↔ Trace 双向关联）。
 * 监控不可用 / DSN 未配置时 captureException 自动降级为空操作，不抛错。
 */
function captureToSentry(error: unknown, requestId: string, route: string, code: string) {
  try {
    const otel = getActiveTraceContext()
    const traceContext =
      otel.traceId && otel.spanId ? { trace_id: otel.traceId, span_id: otel.spanId } : undefined
    Sentry.captureException(error, {
      contexts: { trace: traceContext, request: { requestId, route } },
      tags: { code },
    } as never)
  } catch {
    /* 监控失败不影响业务 */
  }
}

export function withHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    // 请求级标识：优先用代理转发的 x-request-id，否则生成，贯穿日志 / Trace / Sentry
    const requestId = req.headers.get("x-request-id") || crypto.randomUUID()
    const route = req.nextUrl.pathname

    // SEC-G：写接口统一 body 大小限制（仅针对 JSON 请求体；multipart 文件上传由各路由自行限制）。
    const tooLarge = checkJsonBodySize(req)
    if (tooLarge) return tooLarge

    return runWithRequestContext({ requestId, route }, () =>
      withActiveSpan(
        "http.server.request",
        {
          "http.method": req.method,
          "http.route": route,
          "http.request_id": requestId,
        },
        async (span) => {
          const start = Date.now()
          const finish = (status: number, code?: string) => {
            span.setAttributes({ "http.status_code": status })
            if (status >= 500) {
              span.setStatus({ code: SpanStatusCode.ERROR, message: code || "server_error" })
            }
            recordRequest(req.method, status, Date.now() - start)
            if (code) recordError(code)
          }
          // B-23：统一回显 x-request-id 响应头 + 输出 access log（便于反向代理/日志关联排障）
          const emit = (res: NextResponse): NextResponse => {
            res.headers.set("x-request-id", requestId)
            logger.api.info("access", {
              requestId,
              method: req.method,
              route,
              status: res.status,
              durationMs: Date.now() - start,
            })
            return res
          }

          try {
            const res = await handler(req, ctx)
            finish(res.status)
            return emit(res)
          } catch (error) {
            // 业务异常
            if (error instanceof AppError) {
              if (error instanceof RateLimitError) {
                logger.api.warn("请求被限流", { path: req.nextUrl.pathname })
                // 携带异常中的 retryAfter，让客户端获得准确的重试时间（L2③）
                finish(429, "RATE_LIMITED")
                return emit(errorResponse(error.message, error.status, error.code, error.details, error.retryAfter))
              }
              if (error.status >= 500) {
                logger.api.error(`[${error.code}] ${error.message}`, error)
                captureToSentry(error, requestId, route, error.code)
              }
              finish(error.status, error.code)
              return emit(errorResponse(error.message, error.status, error.code, error.details))
            }

            // Zod 验证错误
            if (error instanceof ZodError) {
              const details: Record<string, string[]> = {}
              for (const issue of error.issues) {
                const path = issue.path.join(".")
                if (!details[path]) details[path] = []
                details[path].push(issue.message)
              }
              finish(422, "VALIDATION_ERROR")
              return emit(errorResponse("数据验证失败", 422, "VALIDATION_ERROR", details))
            }

            // Prisma 已知错误（数据库约束/记录不存在）→ 映射到标准业务异常
            // 集中在此处理，避免每个 Service/Repository 重复 try-catch Prisma。
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
              const mapped = mapPrismaError(error)
              logger.api.error(`[${mapped.code}] ${mapped.message}`, error)
              finish(mapped.status, mapped.code)
              return emit(errorResponse(mapped.message, mapped.status, mapped.code))
            }

            // 未知异常
            logger.api.error("未处理的 API 异常", error, { path: req.nextUrl.pathname })
            captureToSentry(error, requestId, route, "INTERNAL")
            finish(500, "INTERNAL")
            return emit(errorResponse("服务器内部错误，请稍后再试", 500, "INTERNAL"))
          }
        },
      ),
    )
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

// ── 请求体大小限制（SEC-G）────────────

/**
 * 写接口统一 body 大小限制（SEC-G）。
 * 仅对 JSON 请求体（content-type 含 application/json）做上限校验；
 * multipart/form-data（文件上传）由各自路由自行限制，此处放行。
 * 默认上限 1MB，可用环境变量 API_MAX_JSON_BODY_BYTES 覆盖。
 * 无 content-length 头（分块传输）的请求放行由具体路由解析时再兜底。
 */
const MAX_JSON_BODY_BYTES = (() => {
  const raw = Number(process.env.API_MAX_JSON_BODY_BYTES)
  return Number.isFinite(raw) && raw > 0 ? raw : 1 * 1024 * 1024
})()

export function checkJsonBodySize(req: NextRequest): NextResponse | null {
  const method = req.method
  if (method !== "POST" && method !== "PUT" && method !== "PATCH" && method !== "DELETE") {
    return null
  }
  const ct = req.headers.get("content-type") || ""
  if (ct.includes("multipart/form-data")) return null
  const cl = req.headers.get("content-length")
  if (cl && Number(cl) > MAX_JSON_BODY_BYTES) {
    return NextResponse.json(
      { success: false, error: "请求体过大", code: "PAYLOAD_TOO_LARGE" },
      { status: 413 },
    )
  }
  return null
}
