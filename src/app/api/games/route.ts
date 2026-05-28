import { handleZodError, serverError, success } from "@/lib/api-response"
import { buildGameSearchFilter } from "@/lib/filters"
import { withRateLimit } from "@/lib/middleware"
import { prisma } from "@/lib/prisma"
import { rateLimits } from "@/lib/rate-limit"
import { gameSearchSchema } from "@/lib/validations"
import { NextRequest } from "next/server"

async function handleGamesList(req: NextRequest) {
  const { searchParams } = req.nextUrl

  // 使用 Zod 验证查询参数
  const parsed = gameSearchSchema.safeParse({
    q: searchParams.get("q") || undefined,
    tag: searchParams.get("tag") || undefined,
    page: searchParams.get("page") || undefined,
    limit: searchParams.get("limit") || undefined,
    sort: searchParams.get("sort") || undefined,
    engine: searchParams.get("engine") || undefined,
  })

  if (!parsed.success) {
    return handleZodError(parsed.error)
  }

  const { q, tag, page, limit } = parsed.data
  const nsfw = searchParams.get("nsfw") === "1"
  const skip = (page - 1) * limit

  const where = buildGameSearchFilter({ q: q || "", tag: tag || "", nsfw })

  try {
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          coverImage: true,
          status: true,
          isNsfw: true,
          favoriteCount: true,
          viewCount: true,
          downloadCount: true,
          platform: true,
          language: true,
          fileSize: true,
          downloadLinks: true,
          updatedAt: true,
          createdAt: true,
          description: true,
          tags: { select: { tag: { select: { name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
    ])

    const data = games.map((g) => {
      let downloadLinks: { label?: string; url: string; platform?: string }[] = []
      try {
        const parsed = JSON.parse(g.downloadLinks || "[]")
        if (Array.isArray(parsed)) downloadLinks = parsed
      } catch { /* ignore */ }
      return {
        ...g,
        tags: g.tags.map((t) => t.tag),
        downloadLinks,
      }
    })

    return success({ games: data, total, page, limit })
  } catch (error) {
    console.error("[Games API] 查询失败:", error)
    return serverError("获取游戏列表失败")
  }
}

export const GET = (req: NextRequest) =>
  withRateLimit(handleGamesList, rateLimits.search, "games-list")(req)
