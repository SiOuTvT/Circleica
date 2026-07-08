import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (req) => {
  const searchParams = req.nextUrl.searchParams
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit
  const role = searchParams.get("role") || ""
  const search = searchParams.get("search")?.trim() || ""

  // 构建查询条件
  const where: Record<string, unknown> = { isPublished: true }

  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { creators: { some: { creator: { name: { contains: search, mode: "insensitive" } } } } },
    ]
  }

  if (role && role !== "all") {
    where.creators = { some: { role } }
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        serialId: true,
        title: true,
        coverImage: true,
        createdAt: true,
        creators: {
          select: {
            role: true,
            creator: {
              select: {
                id: true,
                vndbId: true,
                name: true,
                nameJa: true,
                avatar: true,
              },
            },
          },
        },
      },
    }),
    prisma.game.count({ where }),
  ])

  const formatted = games
    .filter(g => g.creators.length > 0)
    .map(g => ({
      id: g.id,
      serialId: g.serialId,
      title: g.title,
      coverImage: g.coverImage,
      createdAt: g.createdAt.toISOString(),
      creators: g.creators.map(c => ({
        id: c.creator.vndbId ? `s${c.creator.vndbId}` : c.creator.id,
        name: c.creator.name,
        nameJa: c.creator.nameJa,
        avatar: c.creator.avatar,
        role: c.role,
      })),
    }))

  return json({
    games: formatted,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  })
})
