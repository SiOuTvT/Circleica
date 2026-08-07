import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma, Prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { EmptyState } from "@/components/ui/empty-state"
import { Tag } from "lucide-react"
import Link from "next/link"
import { TagCreateForm, TagRowActions, TagResetColorsButton } from "./tag-actions"

export const metadata = { title: "Galvelica 标签管理 · 管理后台" }

export default async function GalvelicaTagsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireSiteAdmin("galvelica")
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
      galvelica
      eyebrow="GALVELICA · TAGS"
      title="标签管理"
      description={`Galvelica 副站共 ${total} 个标签（source=galvelica）`}
      actions={
        <div className="flex items-center gap-2">
          <TagCreateForm />
          <TagResetColorsButton />
          <AdminSearch name="q" defaultValue={q} placeholder="搜索标签…" aria-label="搜索标签" />
        </div>
      }
    >
      {mappedTags.length === 0 ? (
        <EmptyState icon={Tag} title="暂无标签" description="Galvelica 副站尚无标签数据" bordered />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {mappedTags.map((t) => (
            <div
              key={t.id}
              className="flex flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-[color:var(--admin-accent,var(--primary))]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
                  style={{ background: t.color }}
                />
                <Link
                  href={`/admin/galvelica/tags/${t.id}`}
                  className="block min-w-0 flex-1 truncate font-medium text-foreground hover:text-primary hover:underline"
                  title={t.name}
                >
                  {t.name}
                </Link>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">关联作品 {t.workCount}</span>
                <TagRowActions tag={t} />
              </div>
            </div>
          ))}
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
