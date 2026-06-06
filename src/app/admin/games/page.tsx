import { AdminGamesTable } from "@/components/admin-games-table"
import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Download, Plus, Search } from "lucide-react"
import Link from "next/link"

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

  const [games, total, published, draft] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, title: true, status: true, isNsfw: true,
        isPublished: true, viewCount: true, favoriteCount: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
      },
    }),
    prisma.game.count({ where }),
    prisma.game.count({ where: { ...where, isPublished: true } }),
    prisma.game.count({ where: { ...where, isPublished: false } }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      {/* ── 页面标题 ── */}
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">游戏管理</h1>
          <p className="text-sm text-muted-foreground mt-1">
            共 {total} 个游戏，{published} 已发布，{draft} 草稿
          </p>
        </div>
        <div className="flex items-center gap-2">
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索游戏…" aria-label="搜索游戏"
              className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-56" />
          </form>
          <Link
            href="/admin/games/import"
            className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:ring-primary/40"
          >
            <Download className="h-4 w-4" strokeWidth={2} />
            VNDB 导入
          </Link>
          <Link
            href="/admin/games/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={2} />
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
