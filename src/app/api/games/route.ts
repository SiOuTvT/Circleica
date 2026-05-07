import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { buildGameSearchFilter } from "@/lib/filters"
import { withRateLimit } from "@/lib/middleware"
import { rateLimits } from "@/lib/rate-limit"

async function handleGamesList(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const q = searchParams.get("q")?.trim() || ""
  const tag = searchParams.get("tag")?.trim() || ""
  const nsfw = searchParams.get("nsfw") === "1"
  const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
  const limit = Math.min(60, parseInt(searchParams.get("limit") || "24"))
  const skip = (page - 1) * limit

  // 限制搜索词长度，避免性能问题
  if (q.length > 100) {
    return NextResponse.json({ error: "搜索词过长" }, { status: 400 })
  }

  const where = buildGameSearchFilter({ q, tag, nsfw })

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
        createdAt: true,
        description: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
      },
    }),
    prisma.game.count({ where }),
  ])

  const data = games.map((g) => ({
    ...g,
    tags: g.tags.map((t) => t.tag),
  }))

  return NextResponse.json({ games: data, total, page, limit })
}

export const GET = (req: NextRequest) =>
  withRateLimit(handleGamesList, rateLimits.search, "games-list")(req)
