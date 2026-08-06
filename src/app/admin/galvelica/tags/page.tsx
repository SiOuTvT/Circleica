import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma, Prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminTable } from "@/components/admin/admin-table"
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
        <AdminTable
          rows={mappedTags}
          getRowKey={(t) => t.id}
          columns={[
            {
              key: "name",
              header: "名称",
              cell: (t) => (
                <Link href={`/admin/galvelica/tags/${t.id}`} className="group flex items-center gap-2">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-border"
                    style={{ background: t.color }}
                  />
                  <span className="font-medium text-foreground group-hover:text-primary group-hover:underline">{t.name}</span>
                </Link>
              ),
            },
            { key: "color", header: "颜色", cell: (t) => <span className="font-mono text-xs text-muted-foreground">{t.color}</span> },
            { key: "workCount", header: "关联作品", align: "right", cell: (t) => <span className="text-muted-foreground">{t.workCount}</span> },
            { key: "actions", header: "操作", align: "right", cell: (t) => <TagRowActions tag={t} /> },
          ]}
        />
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
