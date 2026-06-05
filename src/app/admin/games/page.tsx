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

  const [games, total] = await Promise.all([
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
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">游戏管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">共 {total} 个游戏</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索游戏…" aria-label="搜索游戏"
              className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-48" />
          </form>
          <Link
            href="/admin/games/import"
            className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground"
          >
            <Download className="h-5 w-5" strokeWidth={2} />
            <span className="hidden sm:inline">VNDB 导入</span>
            <span className="sm:hidden">导入</span>
          </Link>
          <Link
            href="/admin/games/new"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-border transition-all hover:opacity-90"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
            新增
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
