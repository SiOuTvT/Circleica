import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

/**
 * 后台评分数据：按游戏聚合，列出平均分/人数/各分档。
 * GET /api/admin/ratings?page=&q=
 */
export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const grouped = await prisma.gameRating.groupBy({
    by: ["gameId"],
    _avg: { score: true },
    _count: { score: true },
  })

  const games = await prisma.game.findMany({
    where: { id: { in: grouped.map((g) => g.gameId) } },
    select: { id: true, title: true, coverImage: true },
  })
  const titleMap = new Map(games.map((g) => [g.id, g]))

  let list = grouped
    .map((g) => ({
      gameId: g.gameId,
      title: titleMap.get(g.gameId)?.title ?? "已删除游戏",
      coverImage: titleMap.get(g.gameId)?.coverImage ?? null,
      avg: Number((g._avg.score ?? 0).toFixed(2)),
      count: g._count.score ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  if (q) {
    const kw = q.toLowerCase()
    list = list.filter((r) => r.title.toLowerCase().includes(kw))
  }

  const total = list.length
  const pageList = list.slice(skip, skip + limit)

  return json({ ratings: pageList, total, page, limit })
})
