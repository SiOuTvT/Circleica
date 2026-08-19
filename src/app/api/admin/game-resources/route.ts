import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import type { NextRequest } from "next/server"

/**
 * 后台游戏资源管理：列出全部用户提交的资源（含游戏标题/提交人/下载统计/举报数）。
 * GET /api/admin/game-resources?page=&q=
 */
export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const where = q
    ? {
        OR: [
          { resourceName: { contains: q, mode: "insensitive" as const } },
          { game: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {}

  const [resources, total] = await Promise.all([
    prisma.gameResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        game: { select: { id: true, title: true, coverImage: true } },
        user: { select: { username: true } },
        entries: { select: { downloadCount: true } },
        _count: { select: { reports: true, downloadLogs: true } },
      },
    }),
    prisma.gameResource.count({ where }),
  ])

  const list = resources.map((r) => ({
    id: r.id,
    resourceName: r.resourceName,
    resourceNote: r.resourceNote,
    platform: r.platform,
    language: r.language,
    isReported: r.isReported,
    createdAt: r.createdAt.toISOString(),
    game: r.game,
    username: r.user.username,
    entryCount: r.entries.length,
    downloadCount: r.entries.reduce((s, e) => s + e.downloadCount, 0),
    logCount: r._count.downloadLogs,
    reportCount: r._count.reports,
  }))

  const totalPages = Math.max(1, Math.ceil(total / limit))
  return json({ resources: list, total, page, limit, totalPages })
})
