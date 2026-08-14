/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    siteSetting: { findUnique: jest.fn() },
    $transaction: jest.fn(),
    user: { count: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

jest.mock("next/cache", () => ({ revalidateTag: jest.fn() }))

// 必须在 mock 之后导入被测路由
import { POST } from "@/app/api/setup/route"

describe("A-4 SEC-G setup 路由锁定", () => {
  it("已完成初始化的站点再次调用 setup 返回 403（硬锁定）", async () => {
    const { prisma } = await import("@/lib/prisma")
    ;(prisma.siteSetting.findUnique as jest.Mock).mockResolvedValue({ value: "true" })

    const req = new NextRequest("http://localhost:3000/api/setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        siteName: "x",
        admin: { username: "admin", password: "Password123!" },
      }),
    })
    const res = await POST(req, { params: Promise.resolve({}) })
    expect(res.status).toBe(403)
  })
})
