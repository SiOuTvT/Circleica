import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { Download, Plus, Search } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const AdminGamesTable = dynamic(() => import("@/components/admin-games-table").then(m => ({ default: m.AdminGamesTable })), {
  loading: () => <div className="animate-pulse space-y-3">{Array.from({length:8}).map((_,i) => <div key={i} className="h-12 rounded bg-muted" />)}</div>,
})

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q    = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const where = q ? {
    OR: [
      { title:       { contains: q, mode: "insensitive" as const } },
      { originalWork:{ contains: q, mode: "insensitive" as const } },
    ]
  } : {}

  // 缓存列表 + 计数，避免每次导航都打 4 次 prisma（含 3 次全表 count）
  const cacheKeyGames = cacheKey("admin:games", String(page), q, String(limit))
  let cachedGames: { games: any[]; total: number; published: number; draft: number } | null = null
  try {
    cachedGames = await cache.get<typeof cachedGames>(cacheKeyGames)
  } catch (e) {
    logger.db.error("[AdminGames] Cache get failed", e)
  }

  let games: any[]
  let total: number
  let published: number
  let draft: number

  if (cachedGames) {
    ({ games, total, published, draft } = cachedGames)
  } else {
    [games, total, published, draft] = await Promise.all([
      // 使用 take 限制 tags 返回数量（表格只显示前 3 个标签）
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, title: true, status: true, isNsfw: true,
          isPublished: true, viewCount: true, favoriteCount: true, createdAt: true,
          tags: { take: 3, select: { tag: { select: { name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
      prisma.game.count({ where: { ...where, isPublished: true } }),
      prisma.game.count({ where: { ...where, isPublished: false } }),
    ])
    try {
      await cache.set(cacheKeyGames, { games, total, published, draft }, 120)
    } catch (e) {
      logger.db.error("[AdminGames] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* ── 页面标题 ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">游戏管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 个游戏，{published} 已发布，{draft} 草稿
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="relative w-full sm:w-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索游戏…" aria-label="搜索游戏"
              className="rounded-xl border border-input bg-transparent pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-ring w-full sm:w-56" />
          </form>
          <Link
            href="/admin/games/import"
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:ring-foreground/10"
          >
            <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
            VNDB 导入
          </Link>
          <Link
            href="/admin/games/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
            新增游戏
          </Link>
        </div>
      </div>

      <AdminGamesTable games={games} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/games"
        extraParams={q ? { q } : undefined}
      />
    </div>
  )
}
