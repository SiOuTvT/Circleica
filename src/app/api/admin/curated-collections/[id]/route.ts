import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import type { Prisma } from "@/generated/prisma/client"

// GET — 获取单个合集（含游戏列表）
export const GET = withHandler(async (req, ctx) => {
  await requireAdminRole("ADMIN")
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  const collection = await prisma.curatedCollection.findUnique({
    where: { id },
    include: {
      games: {
        orderBy: { sortOrder: "asc" },
        include: {
          game: {
            select: {
              id: true, serialId: true, title: true, coverImage: true, releaseDate: true,
              studios: { include: { studio: { select: { displayName: true } } } },
            },
          },
        },
      },
    },
  })

  if (!collection) throw new NotFoundError("合集")
  // 把每个游戏的 studios 关系拍平为展示名数组，供前端直接渲染
  const shaped = {
    ...collection,
    games: collection.games.map((cg) => ({
      ...cg,
      game: {
        ...cg.game,
        studios: cg.game.studios.map((s) => s.studio.displayName),
      },
    })),
  }
  return json(shaped)
})

// PUT — 更新合集
export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole("ADMIN")
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  const body = await safeParseJson(req)
  const { name, description, published, gameIds } = body

  if (!name?.trim()) throw new ValidationError("合集名称不能为空")

  // 预查 gameIds：外键报错会被翻成「先解除引用再删」，对保存合集对不上
  if (Array.isArray(gameIds) && gameIds.length > 0) {
    const ids = gameIds as string[]
    const found = await prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true } })
    if (found.length !== new Set(ids).size) {
      throw new ValidationError(`所选游戏里有 ${ids.length - found.length} 部不存在，请重新选择`)
    }
  }

  // 取原值用于审计 diff（顺带做存在性校验）
  const existing = await prisma.curatedCollection.findUnique({
    where: { id },
    select: {
      id: true, name: true, description: true, published: true,
      games: { select: { gameId: true } },
    },
  })
  if (!existing) throw new NotFoundError("合集")

  // 没传的字段不要动：description / published 仅在显式传入时写入
  const data: Prisma.CuratedCollectionUpdateInput = { name: name.trim() }
  if (description !== undefined) data.description = String(description).trim()
  if (published !== undefined) data.published = Boolean(published)

  await prisma.$transaction(async (tx) => {
    await tx.curatedCollection.update({ where: { id }, data })

    if (Array.isArray(gameIds)) {
      await tx.curatedCollectionGame.deleteMany({ where: { collectionId: id } })
      if (gameIds.length > 0) {
        await tx.curatedCollectionGame.createMany({
          data: gameIds.map((gid: string, i: number) => ({
            collectionId: id,
            gameId: gid,
            sortOrder: i,
          })),
        })
      }
    }
  })

  // 审计 detail：只列真正变化的字段
  const changed: string[] = []
  if (data.name !== existing.name) changed.push("name")
  if (data.description !== undefined && data.description !== existing.description) changed.push("description")
  if (data.published !== undefined && data.published !== existing.published) changed.push("published")

  const parts: string[] = []
  if (changed.length > 0) parts.push(`fields=${changed.join(",")}`)
  if (Array.isArray(gameIds)) {
    const prevIds = existing.games.map((g) => g.gameId)
    const prevSet = new Set(prevIds)
    const nextIds = gameIds as string[]
    const gamesChanged = prevIds.length !== nextIds.length || nextIds.some((gid) => !prevSet.has(gid))
    if (gamesChanged) parts.push(`games=${prevIds.length}→${nextIds.length}`)
  }
  const updateDetail = `《${String(data.name)}》${parts.length > 0 ? parts.join(" ") : "无字段变化"}`

  await logAudit({
    userId: "ADMIN",
    action: "collection.update",
    target: id,
    detail: updateDetail,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return json({ success: true })
})

// DELETE — 删除合集
export const DELETE = withHandler(async (req, ctx) => {
  await requireAdminRole("ADMIN")
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  // 先取名字与关联数，再删
  const existing = await prisma.curatedCollection.findUnique({
    where: { id },
    select: { id: true, name: true, _count: { select: { games: true } } },
  })
  if (!existing) throw new NotFoundError("合集")

  await prisma.curatedCollection.delete({ where: { id } })

  await logAudit({
    userId: "ADMIN",
    action: "collection.delete",
    target: id,
    detail: `删除合集《${existing.name}》（原含 ${existing._count.games} 部游戏，游戏本身不受影响）`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return json({ success: true })
})
