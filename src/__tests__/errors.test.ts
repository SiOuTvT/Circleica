/**
 * AppError 层级测试
 */
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, ConflictError, RateLimitError } from "@/lib/errors"

describe("AppError", () => {
  it("base class has correct properties", () => {
    const err = new AppError("test message", "INTERNAL", 500)
    expect(err.message).toBe("test message")
    expect(err.status).toBe(500)
    expect(err.code).toBe("INTERNAL")
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(AppError)
  })

  it("preserves details", () => {
    const err = new AppError("field error", "VALIDATION_ERROR", 422, { email: ["格式不正确"] })
    expect(err.details).toEqual({ email: ["格式不正确"] })
  })
})

describe("Error subclasses", () => {
  it("NotFoundError → 404", () => {
    const err = new NotFoundError("用户")
    expect(err.status).toBe(404)
    expect(err.message).toContain("用户")
    expect(err).toBeInstanceOf(AppError)
  })

  it("ValidationError → 422", () => {
    const err = new ValidationError("无效输入")
    expect(err.status).toBe(422)
  })

  it("UnauthorizedError → 401", () => {
    const err = new UnauthorizedError()
    expect(err.status).toBe(401)
  })

  it("ForbiddenError → 403", () => {
    const err = new ForbiddenError()
    expect(err.status).toBe(403)
  })

  it("ConflictError → 409", () => {
    const err = new ConflictError("已存在")
    expect(err.status).toBe(409)
  })

  it("RateLimitError → 429", () => {
    const err = new RateLimitError("请求过多")
    expect(err.status).toBe(429)
  })
})
