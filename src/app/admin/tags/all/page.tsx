import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AllTagsClient } from "./client"

export default async function AllTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1") || 1)
  const q = sp.q?.trim() ?? ""
  const limit = 50
  const skip = (page - 1) * limit

  const where = q ? { name: { contains: q, mode: "insensitive" as const } } : {}

  // 列表 + 计数走 redis 缓存（key 含 page/q），避免每次导航全表拉取（二期：服务端分页）
  const key = cacheKey("admin:tags:all", String(page), q, String(limit))
  let data: { tags: any[]; total: number } | null = null
  try {
    data = await cache.get<{ tags: any[]; total: number }>(key)
  } catch (e) {
    logger.db.error("[AdminTagsAll] Cache get failed", e)
  }

  let rawTags: any[]
  let total: number
  if (data) {
    rawTags = data.tags
    total = data.total
  } else {
    ;[rawTags, total] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          color: true,
          isVisible: true,
          groupId: true,
          group: { select: { id: true, name: true, color: true } },
          _count: { select: { games: true } },
        },
      }),
      prisma.tag.count({ where }),
    ])
    try {
      await cache.set(key, { tags: rawTags, total }, 120)
    } catch (e) {
      logger.db.error("[AdminTagsAll] Cache set failed", e)
    }
  }

  const groups = await prisma.tagGroup.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, color: true },
  })

  const tags = rawTags.map((t) => ({
    id: t.id,
    name: t.name,
    color: t.color,
    gameCount: t._count.games,
    isVisible: t.isVisible,
    groupId: t.groupId,
    groupName: t.group?.name ?? null,
    groupColor: t.group?.color ?? null,
  }))

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AllTagsClient
      tags={tags}
      groups={groups}
      currentPage={page}
      totalPages={totalPages}
      q={q}
      total={total}
    />
  )
}
