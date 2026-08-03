import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
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

  const where = q ? {
    OR: [
      { name: { contains: q, mode: "insensitive" as const } },
      { nameJa: { contains: q, mode: "insensitive" as const } },
      { vndbId: { contains: q, mode: "insensitive" as const } },
    ]
  } : {}

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
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">创作者管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 位创作者，通过导入游戏自动收集
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索创作者…" aria-label="搜索创作者"
              className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-56" />
          </form>
        </div>
      </div>

      {/* ── 创作者列表 ── */}
      {mappedCreators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <PenTool className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">暂无创作者</p>
          <p className="text-xs text-muted-foreground/60">通过 VNDB 导入游戏时会自动收集创作者</p>
        </div>
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
