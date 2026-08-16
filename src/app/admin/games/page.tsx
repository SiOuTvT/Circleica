import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { Download, Plus } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

interface AdminGameRow {
  id: string
  title: string
  status: string
  isNsfw: boolean
  isPublished: boolean
  viewCount: number
  favoriteCount: number
  createdAt: Date
  tags: { tag: { name: string; color: string } }[]
}

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
  let cachedGames: { games: AdminGameRow[]; total: number; published: number; draft: number } | null = null
  try {
    cachedGames = await cache.get<typeof cachedGames>(cacheKeyGames)
  } catch (e) {
    logger.db.error("[AdminGames] Cache get failed", e)
  }

  let games: AdminGameRow[]
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
    <AdminPageContainer
      eyebrow="GAMES"
      title="游戏管理"
      description={`共 ${total} 个游戏，${published} 已发布，${draft} 草稿`}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AdminSearch name="q" defaultValue={q} placeholder="搜索游戏…" />
          <Button asChild variant="secondary" size="sm">
            <Link href="/admin/games/import">
              <Download className="h-4 w-4 shrink-0" strokeWidth={2} />
              VNDB 导入
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/admin/games/new">
              <Plus className="h-4 w-4 shrink-0" strokeWidth={2} />
              新增游戏
            </Link>
          </Button>
        </div>
      }
    >

      <AdminGamesTable games={games} />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/games"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
