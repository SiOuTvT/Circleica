import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { ValidationError } from "@/lib/errors"

// GET — 列表（管理后台）
export const GET = withHandler(async () => {
  await requireAdminRole("ADMIN")
  const collections = await prisma.curatedCollection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { games: true } } },
  })
  return json(collections)
})

// POST — 创建合集
export const POST = withHandler(async (req) => {
  await requireAdminRole("ADMIN")
  const body = await safeParseJson(req)
  const { name, description, published, gameIds } = body

  if (!name?.trim()) throw new ValidationError("合集名称不能为空")

  const collection = await prisma.$transaction(async (tx) => {
    const maxSort = await tx.curatedCollection.aggregate({ _max: { sortOrder: true } })
    const c = await tx.curatedCollection.create({
      data: {
        name: name.trim(),
        description: description?.trim() || "",
        sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
        published: published !== false,
      },
    })

    if (Array.isArray(gameIds) && gameIds.length > 0) {
      await tx.curatedCollectionGame.createMany({
        data: gameIds.map((gid: string, i: number) => ({
          collectionId: c.id,
          gameId: gid,
          sortOrder: i,
        })),
      })
    }

    return c
  })

  return created(collection)
})
