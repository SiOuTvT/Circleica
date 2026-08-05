import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { adminSearchInput } from "@/lib/admin-styles"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { EmptyState } from "@/components/ui/empty-state"
import { PenTool, Search } from "lucide-react"
import { CreatorsList } from "./creators-list"

export const metadata = { title: "创作者管理 · 管理后台" }

export default async function AdminCreatorsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  // 主站隔离：仅列出关联「主站已发布游戏」的创作者，杜绝串入副站(VNDB 摄入)数据。
  const publishedGameFilter = { games: { some: { game: { isPublished: true } } }, source: "circleica" }
  const where = q ? {
    AND: [
      {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { nameJa: { contains: q, mode: "insensitive" as const } },
          { vndbId: { contains: q, mode: "insensitive" as const } },
        ],
      },
      publishedGameFilter,
    ]
  } : publishedGameFilter

  // 缓存列表 + 计数，避免每次导航都打 2 次 prisma
  const cacheKeyCreators = cacheKey("admin:creators", String(page), q, String(limit))
  let cachedCreators: { creators: any[]; total: number } | null = null
  try {
    cachedCreators = await cache.get<typeof cachedCreators>(cacheKeyCreators)
  } catch (e) {
    logger.db.error("[AdminCreators] Cache get failed", e)
  }

  let mappedCreators: any[]
  let total: number

  if (cachedCreators) {
    ({ creators: mappedCreators, total } = cachedCreators)
  } else {
    const [creators, totalResult] = await Promise.all([
      prisma.creator.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, name: true, nameJa: true, avatar: true,
          gender: true, vndbId: true,
          games: { select: { gameId: true } },
        },
      }),
      prisma.creator.count({ where }),
    ])
    total = totalResult
    mappedCreators = creators.map(c => ({
      id: c.id,
      name: c.name,
      nameJa: c.nameJa,
      avatar: c.avatar,
      gender: c.gender,
      vndbId: c.vndbId,
      gameCount: new Set(c.games.map(g => g.gameId)).size,
    }))
    try {
      await cache.set(cacheKeyCreators, { creators: mappedCreators, total }, 120)
    } catch (e) {
      logger.db.error("[AdminCreators] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* ── 页面标题 ── */}
      <AdminPageHeader
        eyebrow="CREATORS"
        title="创作者管理"
        description={`共 ${total} 位创作者，通过导入游戏自动收集`}
        action={
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索创作者…" aria-label="搜索创作者" className={adminSearchInput} />
          </form>
        }
      />

      {/* ── 创作者列表 ── */}
      {mappedCreators.length === 0 ? (
        <EmptyState icon={PenTool} title="暂无创作者" description="通过 VNDB 导入游戏时会自动收集创作者" bordered />
      ) : (
        <CreatorsList creators={mappedCreators} />
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/creators"
        extraParams={q ? { q } : undefined}
      />
    </div>
  )
}
