import Link from "next/link"
import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { EmptyState } from "@/components/ui/empty-state"
import { Building2 } from "lucide-react"

export const metadata = { title: "Galvelica 商业作品归档 · 管理后台" }
export const dynamic = "force-dynamic"

/**
 * 商业作品归档（只读审计入口）。
 * 同人馆不变式：商业系列（Work.isCommercial=true，VNDB developers[].type 含 co）一律从副站展示与后台常规列表排除，
 * 但保留此归档页供管理员审计/核对（数据仍存库，仅不可见）。本页不提供删除等写操作。
 */
export default async function GalvelicaCommercialPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireSiteAdmin("galvelica")
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const where = {
    isCommercial: true,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  }

  const cacheKeyWorks = cacheKey("admin:galvelica:commercial", String(page), q, String(limit))
  let cached: { works: any[]; total: number } | null = null
  try {
    cached = await cache.get<typeof cached>(cacheKeyWorks)
  } catch (e) {
    logger.db.error("[GalvelicaCommercial] Cache get failed", e)
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
          coverSexual: true,
          gameId: true,
          game: { select: { serialId: true } },
        },
      }),
      prisma.work.count({ where }),
    ])
    works = rows
    total = totalResult
    try {
      await cache.set(cacheKeyWorks, { works, total }, 120)
    } catch (e) {
      logger.db.error("[GalvelicaCommercial] Cache set failed", e)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const coverLabel = (s: number | null) => {
    if (s === 2) return <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">NSFW</span>
    if (s === 0) return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600">SFW</span>
    return <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">未定级</span>
  }

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA · COMMERCIAL ARCHIVE"
      title="商业作品归档"
      description={`共 ${total} 部商业系列作品（同人馆不变式：仅归档审计，不参与副站展示与收录；数据仍存库，可用作核对/重新判定）。`}
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索商业作品标题…" aria-label="搜索商业作品" />}
    >
      {works.length === 0 ? (
        <EmptyState icon={Building2} title="无商业作品" description="当前没有 isCommercial=true 的作品" bordered />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">标题</th>
                <th className="px-4 py-3 font-medium">社团 / 厂商</th>
                <th className="px-4 py-3 font-medium">发售日期</th>
                <th className="px-4 py-3 font-medium">封面分级</th>
                <th className="px-4 py-3 font-medium">R18</th>
                <th className="px-4 py-3 font-medium">收录状态</th>
              </tr>
            </thead>
            <tbody>
              {works.map((w) => {
                const href = w.game?.serialId ? `/galvelica/works/${w.game.serialId}` : w.slug ? `/galvelica/works/${w.slug}` : null
                return (
                  <tr key={w.id} className="border-b border-border/60 last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      {href ? (
                        <Link href={href} className="font-medium text-foreground hover:text-primary hover:underline">
                          {w.title}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">{w.title}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{w.studioName || "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">
                      {w.releaseDate ? new Date(w.releaseDate).toISOString().slice(0, 10) : "—"}
                    </td>
                    <td className="px-4 py-3">{coverLabel(w.coverSexual)}</td>
                    <td className="px-4 py-3">
                      {w.isNsfw ? (
                        <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">是</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">否</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{w.gameId ? "已收录" : "未收录"}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/galvelica/commercial"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
