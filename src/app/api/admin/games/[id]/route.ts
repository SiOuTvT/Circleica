import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache } from "@/lib/redis"
import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

// 清除 admin games 列表缓存
async function invalidateAdminGamesCache() {
  const pattern = "fangame:admin:games:*"
  // MemoryCache 不支持通配符，Redis 也没有简单方式
  // 简单处理：清除所有以 admin:games 开头的 key（需要知道 page 范围）
  for (let i = 1; i <= 10; i++) {
    await cache.del(`fangame:admin:games:${i}`)
  }
}

export async function GET(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const game = await prisma.game.findUnique({
    where: { id },
    include: {
      tags: { select: { tag: true } },
      creators: { select: { creatorId: true, role: true, creator: { select: { id: true, vndbId: true, name: true, nameJa: true } } } },
    },
  })
  if (!game) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json({
    ...game,
    tags: game.tags.map((t) => t.tag),
    creators: game.creators.map((c) => ({ vndbId: c.creator.vndbId, name: c.creator.name, nameJa: c.creator.nameJa, role: c.role })),
  })
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

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

  // 先删旧标签和创作者关联，再重建
  await prisma.gameTag.deleteMany({ where: { gameId: id } })
  await prisma.gameCreator.deleteMany({ where: { gameId: id } })

  // 处理创作者：支持 VNDB 拉取的 creators 和手动选择的 gameCreators
  const creatorConnect: Array<{ creatorId: string; role: string }> = gameCreators || []

  if (creators?.length) {
    for (const c of creators) {
      if (!c.name) continue
      let creator = c.vndbId
        ? await prisma.creator.findFirst({ where: { vndbId: c.vndbId } })
        : null
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

  // 如果游戏还没有 publisherId，设置为当前编辑的管理员
  const existingGame = await prisma.game.findUnique({
    where: { id },
    select: { publisherId: true },
  })

  const game = await prisma.game.update({
    where: { id },
    data: {
      title: title.trim(),
      ...(existingGame && !existingGame.publisherId ? { publisherId: session.user.id } : {}),
      originalWork: originalWork?.trim() ?? "",
      description: description?.trim() ?? "",
      coverImage: coverImage ?? "",
      screenshots: (screenshots ?? []) as Prisma.InputJsonValue,
      downloadLinks: (downloadLinks ?? []) as Prisma.InputJsonValue,
      status: status ?? "完结",
      isNsfw: !!isNsfw,
      vndbId: vndbId ?? "",
      isPublished: isPublished !== false,
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
    include: { tags: { select: { tag: true } }, creators: true },
  })

  // 清除缓存
  await invalidateAdminGamesCache()

  return NextResponse.json({ ...game, tags: game.tags.map((t) => t.tag) })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.game.delete({ where: { id } })
  // 清除缓存
  await invalidateAdminGamesCache()
  return NextResponse.json({ ok: true })
}
