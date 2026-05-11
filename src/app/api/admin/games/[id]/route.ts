import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      tags: { select: { tag: true } },
      creators: { select: { creatorId: true, role: true } },
    },
  })
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({ ...game, tags: game.tags.map((t) => t.tag) })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const body = await req.json()
  const { title, originalWork, description, coverImage, screenshots, downloadLinks, status, isNsfw, vndbId, isPublished, tagIds, gameCreators, platform, language, fileSize } = body

  if (!title?.trim()) return NextResponse.json({ error: "标题不能为空" }, { status: 400 })

  // 先删旧标签和创作者关联，再重建
  await prisma.gameTag.deleteMany({ where: { gameId: id } })
  await prisma.gameCreator.deleteMany({ where: { gameId: id } })

  const game = await prisma.game.update({
    where: { id },
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
    include: { tags: { select: { tag: true } }, creators: true },
  })

  return NextResponse.json({ ...game, tags: game.tags.map((t) => t.tag) })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.game.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
