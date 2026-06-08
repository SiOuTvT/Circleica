/**
 * 标准化 API 响应工具
 * 统一所有 API 路由的响应格式
 */

import { NextResponse } from "next/server"
import { ZodError } from "zod"

// ============ 响应类型 ============

interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  details?: Record<string, string[]>
  pagination?: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

// ============ 成功响应 ============

/** 200 成功 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true, data },
    { status }
  )
}

/** 200 成功（别名） */
export const ok = success

/** 201 创建成功 */
export function created<T>(data: T) {
  return success(data, 201)
}

/** 200 带分页 */
export function paginated<T>(
  data: T,
  pagination: { page: number; pageSize: number; total: number }
) {
  return NextResponse.json<ApiResponse<T>>({
    success: true,
    data,
    pagination: {
      ...pagination,
      totalPages: Math.ceil(pagination.total / pagination.pageSize),
    },
  })
}

/** 204 无内容 */
export function noContent() {
  return new NextResponse(null, { status: 204 })
}

// ============ 错误响应 ============

/** 400 请求参数错误 */
export function badRequest(message: string, details?: Record<string, string[]>) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, details },
    { status: 400 }
  )
}

/** 401 未认证 */
export function unauthorized(message = "请先登录") {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 401 }
  )
}

/** 403 无权限 */
export function forbidden(message = "没有权限执行此操作") {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 403 }
  )
}

/** 404 资源不存在 */
export function notFound(message = "资源不存在") {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 404 }
  )
}

/** 409 冲突 */
export function conflict(message: string, data?: unknown) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, data },
    { status: 409 }
  )
}

/** 422 验证失败 */
export function validationError(message: string, details?: Record<string, string[]>) {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message, details },
    { status: 422 }
  )
}

/** 429 请求过于频繁 */
export function tooManyRequests(message = "请求过于频繁，请稍后再试", retryAfter?: number) {
  const headers: Record<string, string> = {}
  if (retryAfter) {
    headers["Retry-After"] = String(retryAfter)
  }
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 429, headers }
  )
}

/** 500 服务器内部错误 */
export function serverError(message = "服务器内部错误，请稍后再试") {
  return NextResponse.json<ApiResponse>(
    { success: false, error: message },
    { status: 500 }
  )
}

// ============ 工具函数 ============

/**
 * 处理 Zod 验证错误，返回标准化的错误响应
 */
export function handleZodError(error: ZodError) {
  const details: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const path = issue.path.join(".")
    if (!details[path]) details[path] = []
    details[path].push(issue.message)
  }
  return validationError("数据验证失败", details)
}

/**
 * API 路由错误处理包装器
 * 自动捕获未处理的错误并返回标准化响应
 */
export function withErrorHandler<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T
): T {
  return (async (...args: unknown[]) => {
    try {
      return await handler(...args)
    } catch (error) {
      if (error instanceof ZodError) {
        return handleZodError(error)
      }
      console.error("[API Error]", error)
      return serverError()
    }
  }) as T
}