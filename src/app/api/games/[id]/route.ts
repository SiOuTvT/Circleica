import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getGameNsfwFilter } from "@/lib/filters"
import { logger } from "@/lib/logger"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  const nsfw = req.nextUrl.searchParams.get("nsfw") === "1"

  const game = await prisma.game.findFirst({
    where: {
      id,
      isPublished: true,
      ...getGameNsfwFilter(nsfw),
    },
    include: {
      tags: { select: { tag: { select: { name: true, color: true } } } },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 50, // 限制评论数量
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
    },
  })

  if (!game) return NextResponse.json({ error: "游戏不存在或已下架" }, { status: 404 })

  // 增加浏览量（使用 logger 记录错误）
  prisma.game
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch((err) => {
      logger.game.error('Failed to increment view count', err, { gameId: id })
    })

  let isFav = false
  let playStatus: string | null = null

  if (session?.user?.id) {
    const [fav, ps] = await Promise.all([
      prisma.favorite.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId: id } },
      }),
      prisma.playStatus.findUnique({
        where: { userId_gameId: { userId: session.user.id, gameId: id } },
      }),
    ])
    isFav = !!fav
    playStatus = ps?.status ?? null
  }

  const reportCount = await prisma.gameReport.count({ where: { gameId: id } })

  // 相关游戏
  const tagIds = game.tags.map((t) => t.tag.name)
  const related = await prisma.game.findMany({
    where: {
      id: { not: id },
      isPublished: true,
      ...getGameNsfwFilter(nsfw),
      tags: { some: { tag: { name: { in: tagIds } } } },
    },
    take: 4,
    select: { id: true, title: true, coverImage: true, isNsfw: true },
  })

  return NextResponse.json({
    ...game,
    tags: game.tags.map((t) => t.tag),
    isFav,
    playStatus,
    reportCount,
    related,
  })
}
