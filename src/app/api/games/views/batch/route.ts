import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { NextResponse } from "next/server"

/**
 * 浏览量批量计数器 — 接收客户端批量上报的浏览记录
 * 使用 Redis 缓冲 + 定期批量写入 DB
 */

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { views } = body as { views: { gameId: string; ts: number }[] }

    if (!views || !Array.isArray(views) || views.length === 0) {
      return NextResponse.json({ error: "无效的浏览记录" }, { status: 400 })
    }

    // 按游戏 ID 分组统计
    const viewCountMap = new Map<string, number>()
    for (const view of views) {
      if (!view.gameId) continue
      viewCountMap.set(view.gameId, (viewCountMap.get(view.gameId) || 0) + 1)
    }

    // 批量写入 Redis 缓冲
    const promises: Promise<void>[] = []
    for (const [gameId, count] of viewCountMap.entries()) {
      const viewKey = `view:${gameId}`
      promises.push(
        cache.incr(viewKey, 300).then(total => {
          // 每 100 次批量写入 DB
          if (total >= 100) {
            return prisma.game.update({
              where: { id: gameId },
              data: { viewCount: { increment: 100 } },
            }).then(() => cache.del(viewKey))
          }
        }).catch(() => {}) // 静默失败，不影响其他记录
      )
    }

    await Promise.all(promises)

    return NextResponse.json({ counted: views.length })
  } catch (error) {
    logger.game.error("[Game Views Batch]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}