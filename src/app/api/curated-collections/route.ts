import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"

// GET — 公开：已发布的合集列表
export const GET = withHandler(async () => {
  const collections = await prisma.curatedCollection.findMany({
    where: { published: true },
    orderBy: { sortOrder: "asc" },
    take: 100,
    include: {
      games: {
        orderBy: { sortOrder: "asc" },
        take: 4,
        include: {
          game: { select: { id: true, serialId: true, title: true, coverImage: true } },
        },
      },
      _count: { select: { games: true } },
    },
  })
  return json(collections)
})
