/**
 * 统一业务异常类
 *
 * 所有 Service/Repository 抛出业务异常，
 * API handler 统一捕获并转为标准响应。
 *
 * 禁止在 Route handler 中直接 try-catch Prisma。
 */

export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly status: number = 500,
    public readonly details?: Record<string, string[]>,
  ) {
    super(message)
    this.name = "AppError"
  }
}

export class NotFoundError extends AppError {
  constructor(resource = "资源") {
    super(`${resource}不存在`, "NOT_FOUND", 404)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends AppError {
  constructor(message = "数据验证失败", details?: Record<string, string[]>) {
    super(message, "VALIDATION_ERROR", 422, details)
    this.name = "ValidationError"
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "请先登录") {
    super(message, "UNAUTHORIZED", 401)
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "没有权限执行此操作") {
    super(message, "FORBIDDEN", 403)
    this.name = "ForbiddenError"
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, "CONFLICT", 409)
    this.name = "ConflictError"
  }
}

export class RateLimitError extends AppError {
  constructor(message = "请求过于频繁，请稍后再试", public retryAfter?: number) {
    super(message, "RATE_LIMITED", 429)
    this.name = "RateLimitError"
  }
}

// ── 错误码类型 ──────────────────────

export type ErrorCode =
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
