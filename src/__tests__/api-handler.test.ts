/**
 * API Handler 错误映射测试
 * @jest-environment node
 */
import { AppError, NotFoundError, ValidationError, UnauthorizedError, ForbiddenError, RateLimitError } from "@/lib/errors"

// 测试错误类到 HTTP 状态码的映射关系
// (withHandler 内部通过 catch 块映射，这里验证错误类属性)

describe("API error → HTTP status mapping", () => {
  const cases: Array<[() => AppError, number, string]> = [
    [() => new NotFoundError("资源"), 404, "NotFoundError"],
    [() => new ValidationError("输入无效"), 422, "ValidationError"],
    [() => new UnauthorizedError(), 401, "UnauthorizedError"],
    [() => new ForbiddenError(), 403, "ForbiddenError"],
    [() => new RateLimitError("太多请求"), 429, "RateLimitError"],
    [() => new AppError("内部错误", "INTERNAL", 500), 500, "AppError"],
  ]

  it.each(cases)("%s → status %i", (createErr, expectedStatus, name) => {
    const err = createErr()
    expect(err.status).toBe(expectedStatus)
    expect(err).toBeInstanceOf(AppError)
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBeTruthy()
  })

  it("AppError preserves details", () => {
    const err = new ValidationError("字段错误", { email: ["格式不正确"] })
    expect(err.status).toBe(422)
    expect(err.details).toBeDefined()
  })
})
