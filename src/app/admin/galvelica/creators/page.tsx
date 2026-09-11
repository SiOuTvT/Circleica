import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { PenTool } from "lucide-react"
import Link from "next/link"
import { CreatorRowActions } from "./creator-actions"

export const metadata = { title: "创作者管理" }

export default async function GalvelicaCreatorsPage({
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

  const baseFilter = { source: "galvelica" as const }
  const where = q
    ? {
        AND: [
          baseFilter,
          {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { nameJa: { contains: q, mode: "insensitive" as const } },
            ],
          },
        ],
      }
    : baseFilter

  const cacheKeyCreators = cacheKey("admin:galvelica:creators", String(page), q)
  let cached: { creators: { id: string; name: string; nameJa: string; avatar: string; workCount: number }[]; total: number } | null = null
  try {
    cached = await cache.get<typeof cached>(cacheKeyCreators)
  } catch (e) {
    logger.db.error("[GalvelicaCreators] Cache get failed", e)
  }

  let mappedCreators: { id: string; name: string; nameJa: string; avatar: string; workCount: number }[]
  let total: number

  if (cached) {
    ({ creators: mappedCreators, total } = cached)
  } else {
    const [creators, totalResult] = await Promise.all([
      prisma.creator.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          name: true,
          nameJa: true,
          avatar: true,
          works: { where: { work: { isCommercial: false } }, select: { workId: true } },
        },
      }),
      prisma.creator.count({ where }),
    ])

    mappedCreators = creators.map(c => ({
      id: c.id,
      name: c.name,
      nameJa: c.nameJa,
      avatar: c.avatar,
      workCount: new Set(c.works.map(w => w.workId)).size,
    }))
    total = totalResult

    try {
      await cache.set(cacheKeyCreators, { creators: mappedCreators, total }, 120)
    } catch (e) {
      logger.db.error("[GalvelicaCreators] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA CREATORS"
      title="创作者管理"
      description={`Galvelica 副站共 ${total} 位创作者（source=galvelica）`}
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索创作者…" aria-label="搜索创作者" />}
    >
      <AdminDataTable
        rows={mappedCreators}
        rowKey={(c) => c.id}
        emptyIcon={PenTool}
        emptyTitle="暂无创作者"
        emptyDescription="Galvelica 副站尚无创作者数据"
        columns={[
          {
            key: "name",
            label: "创作者",
            render: (c) => (
              <span className="flex min-w-0 items-center gap-2.5">
                {c.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.avatar} alt={c.name} className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                    {c.name.charAt(0)}
                  </span>
                )}
                <Link
                  href={`/admin/galvelica/creators/${c.id}`}
                  className="block truncate font-medium text-foreground hover:text-primary hover:underline"
                  title={c.name}
                >
                  {c.name?.trim() || "—"}
                </Link>
              </span>
            ),
          },
          {
            key: "nameJa",
            label: "别名",
            width: "220px",
            render: (c) => (
              <span className="block truncate text-xs text-muted-foreground" title={c.nameJa ?? ""}>
                {c.nameJa?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "workCount",
            label: "作品数",
            numeric: true,
            width: "112px",
            render: (c) => c.workCount,
          },
        ]}
        actions={(c) => <CreatorRowActions creator={c} />}
        actionsWidth="132px"
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/galvelica/creators"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
