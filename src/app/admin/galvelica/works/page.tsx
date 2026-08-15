
import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { Layers } from "lucide-react"
import { AdminSearch } from "@/components/admin/admin-search"
import { WorksTableClient } from "./works-table-client"

export const metadata = { title: "Galvelica 作品管理 · 管理后台" }

export default async function GalvelicaWorksPage({
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

  // 同人馆不变式：商业系列（isCommercial）一律不进入作品管理列表
  const where = {
    isCommercial: false,
    ...(q ? { title: { contains: q, mode: "insensitive" as const } } : {}),
  }

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
      galvelica
      eyebrow="GALVELICA · WORKS"
      title="作品管理"
      description={`共 ${total} 部同人作品（Galvelica 资料馆，商业系列已排除）`}
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索作品标题…" aria-label="搜索作品" />}
    >
      {works.length === 0 ? (
        <EmptyState icon={Layers} title="暂无作品" description="Galvelica 资料馆还没有作品数据" bordered />
      ) : (
        <WorksTableClient
          works={works.map((w) => ({
            id: w.id,
            title: w.title,
            studioName: w.studioName,
            releaseDate: w.releaseDate ? new Date(w.releaseDate).toISOString() : null,
            status: w.status,
            isNsfw: w.isNsfw,
            gameId: w.gameId,
            viewCount: w.viewCount ?? 0,
            slug: w.slug,
          }))}
        />
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
