import Link from "next/link"
import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { adminSearchInput } from "@/lib/admin-styles"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { Layers, Search } from "lucide-react"

export const metadata = { title: "Galvelica 作品管理 · 管理后台" }

export default async function GalvelicaWorksPage({
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

  const where = q ? { title: { contains: q, mode: "insensitive" as const } } : {}

  const cacheKeyWorks = cacheKey("admin:galvelica:works", String(page), q, String(limit))
  let cached: { works: any[]; total: number } | null = null
  try {
    cached = await cache.get<typeof cached>(cacheKeyWorks)
  } catch (e) {
    logger.db.error("[GalvelicaWorks] Cache get failed", e)
  }

  let works: any[]
  let total: number

  if (cached) {
    ({ works, total } = cached)
  } else {
    const [rows, totalResult] = await Promise.all([
      prisma.work.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          slug: true,
          title: true,
          studioName: true,
          releaseDate: true,
          status: true,
          isNsfw: true,
          viewCount: true,
          favoriteCount: true,
          gameId: true,
        },
      }),
      prisma.work.count({ where }),
    ])
    works = rows
    total = totalResult
    try {
      await cache.set(cacheKeyWorks, { works, total }, 120)
    } catch (e) {
      logger.db.error("[GalvelicaWorks] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · WORKS"
      title="作品管理"
      description={`共 ${total} 部同人作品（Galvelica 资料馆）`}
      actions={
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <input name="q" defaultValue={q} placeholder="搜索作品标题…" aria-label="搜索作品" className={adminSearchInput} />
        </form>
      }
    >
      {works.length === 0 ? (
        <EmptyState icon={Layers} title="暂无作品" description="Galvelica 资料馆还没有作品数据" bordered />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">标题</th>
                <th className="px-4 py-3 text-left font-medium">制作组</th>
                <th className="px-4 py-3 text-left font-medium">发售日</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-right font-medium">浏览</th>
                <th className="px-4 py-3 text-center font-medium">收录</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {works.map((w) => (
                <tr key={w.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3">
                    <Link href={`/galvelica/works/${w.slug}`} className="font-medium text-foreground hover:text-primary">
                      {w.title}
                    </Link>
                    {w.isNsfw && (
                      <span className="ml-2 rounded bg-destructive/10 px-1.5 py-0.5 text-micro font-medium text-destructive">NSFW</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.studioName || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {w.releaseDate ? new Date(w.releaseDate).toLocaleDateString("zh-CN") : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{w.status || "—"}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{w.viewCount ?? 0}</td>
                  <td className="px-4 py-3 text-center">
                    {w.gameId ? (
                      <span className="rounded bg-primary/10 px-1.5 py-0.5 text-micro font-medium text-primary">已收录</span>
                    ) : (
                      <span className="text-muted-foreground/60">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/galvelica/works"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
