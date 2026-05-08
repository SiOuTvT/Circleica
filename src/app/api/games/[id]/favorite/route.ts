import { ok, serverError, tooManyRequests, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getClientIP, getRateLimit, rateLimits } from "@/lib/rate-limit"
import { NextRequest } from "next/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  // 速率限制检查
  const ip = getClientIP(req)
  const key = `favorite:${ip}`
  const limit = await getRateLimit(key, rateLimits.api)
  if (!limit.allowed) {
    return tooManyRequests(rateLimits.api.message)
  }

  const { id: gameId } = await params
  const userId = session.user.id

  try {
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

    return ok(result)
  } catch (error) {
    console.error("[Favorite API] Failed:", error)
    return serverError("收藏操作失败")
  }
}
