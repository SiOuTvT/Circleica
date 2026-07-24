import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"

export const dynamic = "force-dynamic"

export const GET = withHandler(async (req: Request) => {
  const url = new URL(req.url)
  const id = url.searchParams.get("id")
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "8", 10) || 8, 1), 12)

  if (!id) return json({ games: [] })

  const base = await prisma.game
    .findUnique({ where: { id }, select: { tags: { select: { tagId: true } } } })
    .catch(() => null)
  if (!base) return json({ games: [] })

  const tagIds = base.tags.map((t) => t.tagId)
  if (!tagIds.length) return json({ games: [] })

  const games = await prisma.game
    .findMany({
      where: {
        isPublished: true,
        isNsfw: false,
        NOT: { id },
        tags: { some: { tagId: { in: tagIds } } },
      },
      orderBy: { favoriteCount: "desc" },
      take: limit,
      select: GAME_CARD_SELECT,
    })
    .catch(() => [] as unknown[])

  return json({ games: games.map((g) => mapGameToCard(g as never)) })
})
