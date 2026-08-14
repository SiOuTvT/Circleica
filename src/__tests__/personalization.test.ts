/**
 * @jest-environment node
 */
import { NextRequest } from "next/server"

jest.mock("@/lib/prisma", () => ({
  prisma: { favorite: { findUnique: jest.fn() } },
}))
jest.mock("@/lib/auth-context", () => ({
  getOptionalAuth: jest.fn(),
}))

import { GET } from "@/app/api/games/[id]/personalization/route"
import { getOptionalAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

describe("A-8 游戏详情个性化 API", () => {
  it("未登录返回 isFav=false", async () => {
    ;(getOptionalAuth as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost:3000/api/games/1/personalization")
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })
    const body = await res.json()
    expect(body.data.isFav).toBe(false)
  })

  it("已登录且已收藏返回 isFav=true", async () => {
    ;(getOptionalAuth as jest.Mock).mockResolvedValue({ userId: "u1" })
    ;(prisma.favorite.findUnique as jest.Mock).mockResolvedValue({ id: "f1" })
    const req = new NextRequest("http://localhost:3000/api/games/1/personalization")
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })
    const body = await res.json()
    expect(body.data.isFav).toBe(true)
  })

  it("已登录但未收藏返回 isFav=false", async () => {
    ;(getOptionalAuth as jest.Mock).mockResolvedValue({ userId: "u1" })
    ;(prisma.favorite.findUnique as jest.Mock).mockResolvedValue(null)
    const req = new NextRequest("http://localhost:3000/api/games/1/personalization")
    const res = await GET(req, { params: Promise.resolve({ id: "g1" }) })
    const body = await res.json()
    expect(body.data.isFav).toBe(false)
  })
})
