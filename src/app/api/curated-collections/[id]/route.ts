import { withHandler, json } from "@/lib/api-handler"
import { prisma } from "@/lib/prisma"
import { NotFoundError, ValidationError } from "@/lib/errors"

// GET — 公开：单个合集详情（含全部游戏）
export const GET = withHandler(async (req, ctx) => {
  const id = (await ctx?.params)?.id
  if (!id) throw new ValidationError("缺少合集 ID")

  const collection = await prisma.curatedCollection.findUnique({
    where: { id, published: true },
    include: {
      games: {
        orderBy: { sortOrder: "asc" },
        include: {
          game: {
            select: {
              id: true, serialId: true, title: true, coverImage: true,
              releaseDate: true, description: true,
              studios: { include: { studio: { select: { displayName: true } } } },
            },
          },
        },
      },
      _count: { select: { games: true } },
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
