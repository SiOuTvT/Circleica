import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { getGameNsfwFilter } from "@/lib/filters"

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
        take: 10, // 首次只加载 10 条，其余通过分页 API 加载
        include: {
          user: { select: { id: true, username: true, avatar: true } },
        },
      },
    },
  })

  if (!game) return NextResponse.json({ error: "游戏不存在或已下架" }, { status: 404 })

  // 并行执行所有独立查询
  const tagIds = game.tags.map((t) => t.tag.name)

  const [favResult, psResult, reportCount, related] = await Promise.all([
    session?.user?.id
      ? prisma.favorite.findUnique({ where: { userId_gameId: { userId: session.user.id, gameId: id } } })
      : Promise.resolve(null),
    session?.user?.id
      ? prisma.playStatus.findUnique({ where: { userId_gameId: { userId: session.user.id, gameId: id } } })
      : Promise.resolve(null),
    prisma.gameReport.count({ where: { gameId: id } }),
    prisma.game.findMany({
      where: {
        id: { not: id },
        isPublished: true,
        ...getGameNsfwFilter(nsfw),
        tags: { some: { tag: { name: { in: tagIds } } } },
      },
      take: 4,
      select: { id: true, title: true, coverImage: true, isNsfw: true },
    }),
  ])

  return NextResponse.json({
    ...game,
    tags: game.tags.map((t) => t.tag),
    isFav: !!favResult,
    playStatus: psResult?.status ?? null,
    reportCount,
    related,
  })
}
