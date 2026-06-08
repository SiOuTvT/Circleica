import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, title: true, status: true, isNsfw: true,
        isPublished: true, viewCount: true, favoriteCount: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
      },
    }),
    prisma.game.count(),
  ])

  return NextResponse.json({
    games: games.map((g) => ({ ...g, tags: g.tags.map((t) => t.tag) })),
    total, page, limit,
  })
}

export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const title = body.title as string | undefined
  const originalWork = body.originalWork as string | undefined
  const description = body.description as string | undefined
  const coverImage = body.coverImage as string | undefined
  const screenshots = body.screenshots as string[] | undefined
  const downloadLinks = body.downloadLinks as unknown[] | undefined
  const status = body.status as string | undefined
  const isNsfw = body.isNsfw as boolean | undefined
  const vndbId = body.vndbId as string | undefined
  const isPublished = body.isPublished as boolean | undefined
  const tagIds = body.tagIds as string[] | undefined
  const gameCreators = body.gameCreators as Array<{ creatorId: string; role: string }> | undefined
  const creators = body.creators as Array<{ name: string; vndbId?: string; nameJa?: string; role?: string }> | undefined
  const releaseDate = body.releaseDate as string | undefined
  const gameDuration = body.gameDuration as string | undefined
  const studioName = body.studioName as string | undefined
  const englishName = body.englishName as string | undefined
  const aliases = body.aliases as string | undefined

  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })

  // 处理创作者：支持 VNDB 拉取的 creators 和手动选择的 gameCreators
  const creatorConnect: Array<{ creatorId: string; role: string }> = gameCreators || []

  if (creators?.length) {
    // VNDB 拉取的创作者：自动创建或查找已有的 Creator 记录
    for (const c of creators) {
      if (!c.name) continue
      // 通过 vndbId 查找已有创作者
      let creator = c.vndbId
        ? await prisma.creator.findFirst({ where: { vndbId: c.vndbId } })
        : null
      // 没有则创建
      if (!creator) {
        creator = await prisma.creator.create({
          data: {
            vndbId: c.vndbId || "",
            name: c.name,
            nameJa: c.nameJa || "",
          },
        })
      }
      creatorConnect.push({ creatorId: creator.id, role: c.role || "other" })
    }
  }

  const game = await prisma.game.create({
    data: {
      title: title.trim(),
      originalWork: originalWork?.trim() ?? "",
      description: description?.trim() ?? "",
      coverImage: coverImage ?? "",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      screenshots: (screenshots ?? []) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      downloadLinks: (downloadLinks ?? []) as any,
      status: status ?? "完结",
      isNsfw: !!isNsfw,
      vndbId: vndbId ?? "",
      isPublished: isPublished !== false,
      publisherId: session.user.id,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      gameDuration: gameDuration ?? "",
      studioName: studioName ?? "",
      englishName: englishName ?? "",
      aliases: aliases ?? "",
      tags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tag: { connect: { id: tagId } } })) }
        : undefined,
      creators: creatorConnect.length
        ? { create: creatorConnect.map(gc => ({ creatorId: gc.creatorId, role: gc.role })) }
        : undefined,
    },
    include: { tags: { select: { tag: true } } },
  })

  return NextResponse.json({ ...game, tags: game.tags.map((t) => t.tag) }, { status: 201 })
}
