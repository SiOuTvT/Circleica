import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getRateLimit, getClientIP, rateLimits } from "@/lib/rate-limit"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  
  // 速率限制检查
  const ip = getClientIP(req)
  const key = `favorite:${ip}`
  const limit = getRateLimit(key, rateLimits.api)
  
  if (!limit.allowed) {
    return NextResponse.json(
      { error: rateLimits.api.message || "请求过于频繁" },
      { status: 429 }
    )
  }
  
  const { id: gameId } = await params
  const userId = session.user.id

  // 使用事务确保原子性，避免竞态条件
  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.favorite.findUnique({
      where: { userId_gameId: { userId, gameId } },
    })

    if (existing) {
      // 取消收藏
      await tx.favorite.delete({
        where: { userId_gameId: { userId, gameId } },
      })
      const game = await tx.game.update({
        where: { id: gameId },
        data: { favoriteCount: { decrement: 1 } },
        select: { favoriteCount: true },
      })
      return { isFav: false, count: Math.max(0, game.favoriteCount) }
    } else {
      // 添加收藏
      await tx.favorite.create({
        data: { userId, gameId },
      })
      const game = await tx.game.update({
        where: { id: gameId },
        data: { favoriteCount: { increment: 1 } },
        select: { favoriteCount: true },
      })
      return { isFav: true, count: game.favoriteCount }
    }
  })

  return NextResponse.json(result)
}
