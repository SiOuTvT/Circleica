import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { slugify } from "@/lib/slug"
import { ValidationError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"

// GET — 列表（管理后台，服务端分页 + 搜索）
export const GET = withHandler(async (req) => {
  await requireAdminRole("ADMIN")
  const url = new URL(req.url)
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1)
  const pageSize = Math.min(Math.max(1, Number(url.searchParams.get("pageSize")) || 20), 100)
  const search = (url.searchParams.get("search") || "").trim()
  const where = search ? { name: { contains: search, mode: "insensitive" as const } } : {}
  const [collections, total] = await Promise.all([
    prisma.curatedCollection.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { games: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.curatedCollection.count({ where }),
  ])
  return json({ items: collections, total, page, pageSize, totalPages: Math.ceil(total / pageSize) })
})

// POST — 创建合集
export const POST = withHandler(async (req) => {
  await requireAdminRole("ADMIN")
  const body = await safeParseJson(req)
  const { name, description, published, gameIds } = body

  if (!name?.trim()) throw new ValidationError("合集名称不能为空")

  // 预查 gameIds：createMany 的外键报错会被 mapPrismaError 翻成「先解除引用再删」，
  // 对「保存合集」完全对不上，所以这里先给准确文案（createMany 保留作第二道防线）
  if (Array.isArray(gameIds) && gameIds.length > 0) {
    const ids = gameIds as string[]
    const found = await prisma.game.findMany({ where: { id: { in: ids } }, select: { id: true } })
    if (found.length !== new Set(ids).size) {
      throw new ValidationError(`所选游戏里有 ${ids.length - found.length} 部不存在，请重新选择`)
    }
  }

  // 生成稳定 slug（CJK 直出，保留中文可读）；库内同名冲突则追加 -2/-3
  const baseSlug = slugify(name.trim())
  let slug = baseSlug
  let n = 2
  while (await prisma.curatedCollection.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${n}`
    n++
  }

  const collection = await prisma.$transaction(async (tx) => {
    const maxSort = await tx.curatedCollection.aggregate({ _max: { sortOrder: true } })
    const c = await tx.curatedCollection.create({
      data: {
        name: name.trim(),
        slug,
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

  await logAudit({
    userId: "ADMIN",
    action: "collection.create",
    target: collection.id,
    detail: `新建合集《${collection.name}》（slug=${collection.slug}，${Array.isArray(gameIds) ? gameIds.length : 0} 部游戏，${collection.published ? "已发布" : "草稿"}）`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))

  return created(collection)
})
