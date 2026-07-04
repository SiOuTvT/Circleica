import { prisma } from "@/lib/prisma"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const rateLimit = await checkRateLimit(rateLimits.search)
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: "搜索过于频繁，请稍后再试" },
      { status: 429, headers: { "Retry-After": String(rateLimit.reset) } }
    )
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (!q || q.length < 1) return NextResponse.json([])

  const games = await prisma.game.findMany({
    where: {
      isPublished: true,
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { originalWork: { contains: q, mode: "insensitive" } },
        { englishName: { contains: q, mode: "insensitive" } },
        { aliases: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    select: {
      id: true,
      serialId: true,
      title: true,
      coverImage: true,
      originalWork: true,
    },
  })

  return NextResponse.json(games)
}