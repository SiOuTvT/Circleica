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
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const body = await req.json()
  const { title, originalWork, description, coverImage, screenshots, downloadLinks, status, isNsfw, vndbId, isPublished, tagIds, gameCreators, platform, language, fileSize, releaseDate, gameDuration, studioName, englishName, aliases } = body

  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })

  const game = await prisma.game.create({
    data: {
      title: title.trim(),
      originalWork: originalWork?.trim() ?? "",
      description: description?.trim() ?? "",
      coverImage: coverImage ?? "",
      screenshots: JSON.stringify(screenshots ?? []),
      downloadLinks: JSON.stringify(downloadLinks ?? []),
      status: status ?? "完结",
      isNsfw: !!isNsfw,
      vndbId: vndbId ?? "",
      isPublished: isPublished !== false,
      releaseDate: releaseDate ? new Date(releaseDate) : null,
      gameDuration: gameDuration ?? "",
      studioName: studioName ?? "",
      englishName: englishName ?? "",
      aliases: aliases ?? "",
      platform: platform ?? "",
      language: language ?? "",
      fileSize: fileSize ?? "",
      tags: tagIds?.length
        ? { create: tagIds.map((tagId: string) => ({ tag: { connect: { id: tagId } } })) }
        : undefined,
      creators: gameCreators?.length
        ? { create: gameCreators.map((gc: { creatorId: string; role: string }) => ({ creatorId: gc.creatorId, role: gc.role })) }
        : undefined,
    },
    include: { tags: { select: { tag: true } } },
  })

  return NextResponse.json({ ...game, tags: game.tags.map((t) => t.tag) }, { status: 201 })
}
