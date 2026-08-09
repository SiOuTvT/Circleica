import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"

export const GET = withHandler(async (req) => {
  const auth = await requireAuth()
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 20))
  const skip = (page - 1) * pageSize

  const [total, rows] = await Promise.all([
    prisma.resourceDownloadLog.count({ where: { userId: auth.userId } }),
    prisma.resourceDownloadLog.findMany({
      where: { userId: auth.userId },
      orderBy: { downloadedAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        downloadedAt: true,
        resource: {
          select: {
            id: true,
            resourceName: true,
            gameId: true,
            user: { select: { id: true, username: true } },
          },
        },
        game: { select: { id: true, serialId: true, title: true, coverImage: true } },
      },
    }),
  ])

  return json({
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    downloads: rows,
  })
})
