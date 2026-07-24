import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"

export const dynamic = "force-dynamic"

export const GET = withHandler(async (req: Request) => {
  const url = new URL(req.url)
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 1), 12)

  const total = await prisma.game
    .count({ where: { isPublished: true, isNsfw: false } })
    .catch(() => 0)
  if (!total) return json({ games: [] })

  // 避免 ORDER BY RANDOM() 全表扫描：随机偏移取连续块
  const offset = total > limit ? Math.floor(Math.random() * (total - limit)) : 0
  const games = await prisma.game
    .findMany({
      where: { isPublished: true, isNsfw: false },
      orderBy: { serialId: "asc" },
      skip: offset,
      take: limit,
      select: GAME_CARD_SELECT,
    })
    .catch(() => [] as unknown[])

  return json({ games: games.map((g) => mapGameToCard(g as never)) })
})
