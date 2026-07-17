/**
 * 速率限制器测试（内存后端）
 * @jest-environment node
 */

// 需要 mock service-config 以避免 Redis 检查
jest.mock("@/lib/service-config", () => ({
  getRedisConfig: () => null, // 强制使用内存后端
}))

import { getRateLimit, getClientIP, rateLimits } from "@/lib/rate-limit"

describe("getRateLimit (memory backend)", () => {
  it("allows requests within limit", async () => {
    const config = { windowMs: 60_000, maxRequests: 5 }
    const result = await getRateLimit("test:allow", config)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(4)
  })

  it("blocks requests exceeding limit", async () => {
    const config = { windowMs: 60_000, maxRequests: 2 }
    const key = `test:block:${Date.now()}`
    await getRateLimit(key, config)
    await getRateLimit(key, config)
    const result = await getRateLimit(key, config)
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it("resets after window expires", async () => {
    const config = { windowMs: 1, maxRequests: 1 } // 1ms window
    const key = `test:reset:${Date.now()}`
    await getRateLimit(key, config)
    const blocked = await getRateLimit(key, config)
    expect(blocked.allowed).toBe(false)

    // Wait for window to expire
    await new Promise(r => setTimeout(r, 10))
    const allowed = await getRateLimit(key, config)
    expect(allowed.allowed).toBe(true)
  })
})

describe("getClientIP", () => {
  it("extracts IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    })
    expect(getClientIP(req)).toBe("1.2.3.4")
  })

  it("extracts IP from x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: { "x-real-ip": "10.0.0.1" },
    })
    expect(getClientIP(req)).toBe("10.0.0.1")
  })

  it("returns unknown when no headers", () => {
    const req = new Request("http://localhost")
    expect(getClientIP(req)).toBe("unknown")
  })

  it("x-forwarded-for takes priority over x-real-ip", () => {
    const req = new Request("http://localhost", {
      headers: {
        "x-forwarded-for": "1.1.1.1",
        "x-real-ip": "2.2.2.2",
      },
    })
    expect(getClientIP(req)).toBe("1.1.1.1")
  })
})

describe("rateLimits configs", () => {
  it("has all expected presets", () => {
    expect(rateLimits.api.maxRequests).toBe(60)
    expect(rateLimits.auth.maxRequests).toBe(5)
    expect(rateLimits.register.maxRequests).toBe(3)
    expect(rateLimits.comment.maxRequests).toBe(10)
    expect(rateLimits.upload.maxRequests).toBe(20)
    expect(rateLimits.search.maxRequests).toBe(30)
    expect(rateLimits.passwordReset.maxRequests).toBe(3)
  })
})
