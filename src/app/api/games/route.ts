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
          serialId: true,
          title: true,
          coverImage: true,
          status: true,
          isNsfw: true,
          favoriteCount: true,
          viewCount: true,
          downloadCount: true,
          downloadLinks: true,
          updatedAt: true,
          createdAt: true,
          description: true,
          tags: { select: { tag: { select: { name: true, color: true } } } },
          resources: { select: { language: true, runType: true, resourceContent: true } },
        },
      }),
      prisma.game.count({ where }),
    ])

    const data = games.map((g) => {
      let downloadLinks: { label?: string; url: string; tags?: string[] }[] = []
      try {
        const parsed = JSON.parse(g.downloadLinks || "[]")
        if (Array.isArray(parsed)) downloadLinks = parsed
      } catch { /* ignore */ }

      // 从所有资源中收集去重的 resourceTags（仅语言、运行方式、资源内容，不含平台）
      const resourceTags: string[] = [...new Set(
        g.resources.flatMap((r) => {
          const tags: string[] = []
          try { tags.push(...JSON.parse(r.language)) } catch { console.warn("[GamesAPI] Failed to parse resource language") }
          try { tags.push(...JSON.parse(r.runType)) } catch { console.warn("[GamesAPI] failed to parse resource runType") }
          try { tags.push(...JSON.parse(r.resourceContent)) } catch { console.warn("[GamesAPI] failed to parse resourceContent") }
          return tags
        })
      )]

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { resources: _ignored, ...rest } = g
      return {
        ...rest,
        tags: rest.tags.map((t) => t.tag),
        downloadLinks,
        resourceTags,
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
