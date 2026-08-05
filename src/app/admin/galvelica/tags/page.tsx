import { Pagination } from "@/components/ui/pagination"
import { requireAdmin } from "@/lib/admin"
import { prisma, Prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { adminSearchInput } from "@/lib/admin-styles"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { Tag, Search } from "lucide-react"

export const metadata = { title: "Galvelica 标签管理 · 管理后台" }

export default async function GalvelicaTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 30
  const skip = (page - 1) * limit

  const baseFilter = { source: "galvelica" as const }
  const where = q
    ? { AND: [baseFilter, { name: { contains: q, mode: "insensitive" as const } }] }
    : baseFilter

  const cacheKeyTags = cacheKey("admin:galvelica:tags", String(page), q)
  let cached: { tags: any[]; total: number } | null = null
  try {
    cached = await cache.get<typeof cached>(cacheKeyTags)
  } catch (e) {
    logger.db.error("[GalvelicaTags] Cache get failed", e)
  }

  let mappedTags: { id: string; name: string; color: string; workCount: number }[]
  let total: number

  if (cached) {
    ({ tags: mappedTags, total } = cached)
  } else {
    const [tags, totalResult] = await Promise.all([
      prisma.tag.findMany({
        where,
        orderBy: { sortOrder: "asc" },
        skip,
        take: limit,
        select: { id: true, name: true, color: true },
      }),
      prisma.tag.count({ where }),
    ])

    const tagIds = tags.map(t => t.id)
    const workTagCounts = tagIds.length > 0
      ? await prisma.$queryRaw<Array<{ tagId: string; _count: number }>>`
          SELECT "tagId", COUNT(*)::int as "_count"
          FROM "WorkTag"
          WHERE "tagId" IN (${Prisma.join(tagIds)})
          GROUP BY "tagId"
        `
      : []
    const countMap = new Map(workTagCounts.map(r => [r.tagId, r._count]))

    mappedTags = tags.map(t => ({
      ...t,
      workCount: countMap.get(t.id) ?? 0,
    }))
    total = totalResult

    try {
      await cache.set(cacheKeyTags, { tags: mappedTags, total }, 120)
    } catch (e) {
      logger.db.error("[GalvelicaTags] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · TAGS"
      title="标签管理"
      description={`Galvelica 副站共 ${total} 个标签（source=galvelica）`}
      actions={
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <input name="q" defaultValue={q} placeholder="搜索标签…" aria-label="搜索标签" className={adminSearchInput} />
        </form>
      }
    >
      {mappedTags.length === 0 ? (
        <EmptyState icon={Tag} title="暂无标签" description="Galvelica 副站尚无标签数据" bordered />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">名称</th>
                <th className="px-4 py-3 text-left font-medium">颜色</th>
                <th className="px-4 py-3 text-right font-medium">关联作品</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mappedTags.map((t) => (
                <tr key={t.id} className="transition-colors hover:bg-accent/30">
                  <td className="px-4 py-3 font-medium text-foreground">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full mr-2 ring-1 ring-border"
                      style={{ background: t.color }}
                    />
                    {t.name}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{t.color}</td>
                  <td className="px-4 py-3 text-right text-muted-foreground">{t.workCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/galvelica/tags"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
