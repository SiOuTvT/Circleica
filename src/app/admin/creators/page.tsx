import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { PenTool, Plus, Search } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <PenTool className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">创作者管理</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {total} 位创作者
          </span>
        </div>
        <Link
          href="/admin/creators/new"
          className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground ring-1 ring-border transition-all hover:opacity-90"
        >
          <Plus className="h-5 w-5" strokeWidth={2} />
          新增
        </Link>
      </div>

      <form method="get" className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder="搜索创作者…" aria-label="搜索创作者"
          className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full sm:w-48"
        />
      </form>

      {creators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <PenTool className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无创作者</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                {creator.avatar ? (
                  <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                    {creator.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {creator.name}
                  {creator.nameJa && (
                    <span className="ml-2 text-xs text-muted-foreground">{creator.nameJa}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {creator.gender && <span>{creator.gender} · </span>}
                  {creator.vndbId && <span>VNDB: {creator.vndbId} · </span>}
                  {creator._count.games} 个游戏 · {new Date(creator.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <CreatorDeleteBtn id={creator.id} />
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