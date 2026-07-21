import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"

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
            select: { id: true, serialId: true, title: true, coverImage: true, studioName: true, releaseDate: true },
          },
        },
      },
    },
  })

  if (!collection) throw new NotFoundError("合集")
  return json(collection)
})

// PUT — 更新合集
export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole("ADMIN")
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  const body = await safeParseJson(req)
  const { name, description, published, gameIds } = body

  if (!name?.trim()) throw new ValidationError("合集名称不能为空")

  await prisma.$transaction(async (tx) => {
    await tx.curatedCollection.update({
      where: { id },
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        published: published !== false,
      },
    })

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

  return json({ success: true })
})

// DELETE — 删除合集
export const DELETE = withHandler(async (req, ctx) => {
  await requireAdminRole("ADMIN")
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  await prisma.curatedCollection.delete({ where: { id } })
  return json({ success: true })
})
