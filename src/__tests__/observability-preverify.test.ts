/**
 * 可观测性 / 健康检查 本地预验证
 *
 * 目标：把部署后只能在生产环境验证的 C 类项（health DB 探测、x-request-id 贯通）
 * 在本环境通过单元测试提前复刻验证，降低上线后「才发现」的风险。
 * @jest-environment node
 */
import { NextRequest } from "next/server"
import { withHandler, json } from "@/lib/api-handler"
import { AppError } from "@/lib/errors"

jest.mock("@/lib/prisma", () => ({
  realPrisma: { $queryRaw: jest.fn() },
  prisma: {},
}))
jest.mock("@/lib/storage", () => ({
  probeStorage: jest.fn().mockResolvedValue({ ok: true, backend: "local" }),
}))
jest.mock("@/lib/redis", () => ({
  isRedisAvailable: jest.fn().mockReturnValue(false),
  cache: { get: jest.fn() },
}))

import { GET } from "@/app/api/health/route"

describe("health route (realPrisma 直连 DB 探测)", () => {
  it("DB 可达时返回 healthy + checks.database.status=ok", async () => {
    const { realPrisma } = require("@/lib/prisma")
    realPrisma.$queryRaw.mockResolvedValue([{ "?column?": 1 }])
    const res = await GET(new NextRequest("http://localhost/api/health"))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.checks.database.status).toBe("ok")
    expect(body.status).toBe("healthy")
  })

  it("DB 不可达时如实上报 error 且不谎报 healthy（fail-loud）", async () => {
    const { realPrisma } = require("@/lib/prisma")
    realPrisma.$queryRaw.mockRejectedValue(new Error("connection refused"))
    const res = await GET(new NextRequest("http://localhost/api/health"))
    const body = await res.json()
    expect(body.checks.database.status).toBe("error")
    expect(body.status).not.toBe("healthy")
  })
})

describe("withHandler · x-request-id 贯通", () => {
  it("回显上游转发的 x-request-id", async () => {
    const handler = withHandler(async () => json({ ok: true }))
    const req = new NextRequest("http://localhost/api/x", { headers: { "x-request-id": "abc-123" } })
    const res = await handler(req, { params: Promise.resolve({}) })
    expect(res.headers.get("x-request-id")).toBe("abc-123")
  })

  it("缺失时自动生成 uuid v4 并回显", async () => {
    const handler = withHandler(async () => json({ ok: true }))
    const req = new NextRequest("http://localhost/api/x")
    const res = await handler(req, { params: Promise.resolve({}) })
    const rid = res.headers.get("x-request-id")
    expect(rid).toBeTruthy()
    expect(rid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
  })

  it("AppError 映射为标准状态码且不泄漏堆栈", async () => {
    const handler = withHandler(async () => {
      throw new AppError("找不到目标", "NOT_FOUND", 404)
    })
    const req = new NextRequest("http://localhost/api/x")
    const res = await handler(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.success).toBe(false)
    expect(body.code).toBe("NOT_FOUND")
    expect(JSON.stringify(body)).not.toMatch(/\bat \s/) // 不泄漏调用栈
  })
})
