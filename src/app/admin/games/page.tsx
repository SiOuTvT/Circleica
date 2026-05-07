import { AdminGameDeleteBtn } from "@/components/admin-game-delete-btn"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Download, Pencil, Plus, Search } from "lucide-react"
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
    <div className="space-y-4">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">游戏管理</h1>
          <p className="text-xs text-zinc-500 mt-0.5">共 {total} 个游戏</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form method="get" className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索游戏…"
              className="rounded-xl bg-zinc-800 pl-9 pr-3 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 ring-1 ring-white/[0.06] outline-none focus:ring-zinc-600 w-full sm:w-48" />
          </form>
          <Link
            href="/admin/games/import"
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 ring-1 ring-white/[0.06] transition-all hover:bg-zinc-700 hover:text-white"
          >
            <Download className="h-5 w-5" strokeWidth={2} />
            <span className="hidden sm:inline">VNDB 导入</span>
            <span className="sm:hidden">导入</span>
          </Link>
          <Link
            href="/admin/games/new"
            className="flex items-center gap-2 rounded-xl bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 ring-1 ring-white/[0.06] transition-all hover:bg-zinc-700 hover:text-white"
          >
            <Plus className="h-5 w-5" strokeWidth={2} />
            新增
          </Link>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/[0.06]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs text-zinc-500">
              <th className="px-4 py-3 font-medium">游戏名称</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">标签</th>
              <th className="px-4 py-3 font-medium">状态</th>
              <th className="hidden px-4 py-3 font-medium md:table-cell">浏览</th>
              <th className="px-4 py-3 font-medium text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {games.map((g) => (
              <tr key={g.id} className="group transition-colors hover:bg-zinc-800/50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-200 line-clamp-1">{g.title}</span>
                    {g.isNsfw && (
                      <span className="shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold bg-red-500/10 text-red-400 ring-1 ring-red-500/20">R18</span>
                    )}
                  </div>
                </td>
                <td className="hidden px-4 py-3 sm:table-cell">
                  <div className="flex flex-wrap gap-1">
                    {g.tags.slice(0, 3).map(({ tag }) => (
                      <span key={tag.name} className="rounded-full px-1.5 py-0.5 text-[9px]"
                        style={{ color: tag.color, background: `${tag.color}18`, outline: `1px solid ${tag.color}30` }}>
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${g.isPublished ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 text-zinc-500"}`}>
                    {g.isPublished ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="hidden px-4 py-3 text-xs text-zinc-500 md:table-cell">{g.viewCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/admin/games/${g.id}`}
                      className="flex items-center gap-1.5 rounded-lg bg-zinc-800 px-3 py-2 text-sm text-zinc-400 ring-1 ring-white/[0.06] transition-all hover:text-zinc-200"
                    >
                      <Pencil className="h-4 w-4" strokeWidth={2} />编辑
                    </Link>
                    <AdminGameDeleteBtn id={g.id} title={g.title} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/games?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                p === page
                  ? "bg-zinc-700 text-zinc-100"
                  : "bg-zinc-900 text-zinc-500 ring-1 ring-white/[0.06] hover:bg-zinc-800 hover:text-zinc-300"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
