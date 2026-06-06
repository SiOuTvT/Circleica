import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { PenTool, Search } from "lucide-react"
import dynamic from "next/dynamic"

const CreatorDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CreatorDeleteBtn })), {
  loading: () => <div className="h-8 w-8 animate-pulse rounded-lg bg-muted" />,
})

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

  const [creators, total] = await Promise.all([
    prisma.creator.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, name: true, nameJa: true, avatar: true,
        gender: true, vndbId: true, createdAt: true,
        _count: { select: { games: true } },
      },
    }),
    prisma.creator.count({ where }),
  ])

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
      {creators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <PenTool className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">暂无创作者</p>
          <p className="text-xs text-muted-foreground/60">通过 VNDB 导入游戏时会自动收集创作者</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="group relative flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-border transition-all duration-200 hover:ring-primary/40 hover:shadow-md"
            >
              {/* 头像 */}
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                {creator.avatar ? (
                  <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-400 text-xs font-bold text-white">
                    {creator.name.charAt(0)}
                  </div>
                )}
              </div>

              {/* 信息 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{creator.name}</span>
                  {creator.nameJa && (
                    <span className="text-[11px] text-muted-foreground truncate">({creator.nameJa})</span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {creator.gender && (
                    <span className="text-[10px] text-muted-foreground">{creator.gender}</span>
                  )}
                  {creator.vndbId && (
                    <span className="text-[10px] text-muted-foreground">VNDB:{creator.vndbId}</span>
                  )}
                </div>
              </div>

              {/* 游戏数 */}
              <div className="text-right shrink-0">
                <span className="text-lg font-bold text-foreground">{creator._count.games}</span>
                <p className="text-[10px] text-muted-foreground">个游戏</p>
              </div>

              {/* 删除按钮 */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <CreatorDeleteBtn id={creator.id} />
              </div>
            </div>
          ))}
        </div>
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
