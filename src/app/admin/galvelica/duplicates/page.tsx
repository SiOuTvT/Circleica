import { Pagination } from "@/components/ui/pagination"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { CopyCheck, Users, Layers, ArrowRight } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "Galvelica 重复检测 · 管理后台" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 20

export default async function GalvelicaDuplicatesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireSiteAdmin("galvelica")
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const skip = (page - 1) * PAGE_SIZE

  type DupGroup = { key: string; items: { id: string; label: string; href: string }[] }

  let creatorDups: DupGroup[] = []
  let creatorTotal = 0
  let workDups: DupGroup[] = []
  let workTotal = 0

  try {
    // ── 创作者重复：同名（case-insensitive）且 source=galvelica，服务端分组 + 分页 ──
    const creatorRows = await prisma.$queryRaw<Array<{ ids: string[]; names: string[] }>>`
      SELECT array_agg("id") as "ids", array_agg("name") as "names"
      FROM "Creator"
      WHERE source = 'galvelica'
      GROUP BY LOWER("name")
      HAVING COUNT(*) > 1
      ORDER BY LOWER("name")
      LIMIT ${PAGE_SIZE}::int OFFSET ${skip}::int
    `
    const creatorCountRows = await prisma.$queryRaw<Array<{ cnt: number }>>`
      SELECT COUNT(*)::int as cnt FROM (
        SELECT 1 FROM "Creator"
        WHERE source = 'galvelica'
        GROUP BY LOWER("name")
        HAVING COUNT(*) > 1
      ) t
    `
    creatorTotal = creatorCountRows[0]?.cnt ?? 0
    creatorDups = creatorRows.map((r) => ({
      key: r.names[0] ?? "",
      items: r.ids.map((id, i) => ({
        id,
        label: r.names[i] ?? id,
        href: `/admin/galvelica/creators/${id}`,
      })),
    }))

    // ── 作品重复：服务端按归一化键（title/originalWork/englishName 去声调/小写/去非字母数字/保留中日韩）
    //    分组，避免把 2 万+ 作品全量读进内存。复用与 normalizeMatchKey 等价的 PG 正则。 ──
    const workRows = await prisma.$queryRaw<Array<{ key: string; ids: string[]; titles: string[]; slugs: string[] }>>`
      WITH norm AS (
        SELECT id, title, slug,
          LOWER(REGEXP_REPLACE(COALESCE("title", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k1,
          LOWER(REGEXP_REPLACE(COALESCE("originalWork", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k2,
          LOWER(REGEXP_REPLACE(COALESCE("englishName", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k3
        FROM "Work"
      ),
      keys AS (
        SELECT id, title, slug, k1 AS k FROM norm WHERE LENGTH(k1) >= 3
        UNION ALL
        SELECT id, title, slug, k2 AS k FROM norm WHERE LENGTH(k2) >= 3
        UNION ALL
        SELECT id, title, slug, k3 AS k FROM norm WHERE LENGTH(k3) >= 3
      )
      SELECT k AS key, array_agg(id) AS ids, array_agg(title) AS titles, array_agg(slug) AS slugs
      FROM keys
      GROUP BY k
      HAVING COUNT(*) > 1
      ORDER BY k
      LIMIT ${PAGE_SIZE}::int OFFSET ${skip}::int
    `
    const workCountRows = await prisma.$queryRaw<Array<{ cnt: number }>>`
      WITH norm AS (
        SELECT
          LOWER(REGEXP_REPLACE(COALESCE("title", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k1,
          LOWER(REGEXP_REPLACE(COALESCE("originalWork", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k2,
          LOWER(REGEXP_REPLACE(COALESCE("englishName", ''), '[^a-z0-9一-鿿]', '', 'g')) AS k3
        FROM "Work"
      ),
      keys AS (
        SELECT k1 AS k FROM norm WHERE LENGTH(k1) >= 3
        UNION ALL
        SELECT k2 AS k FROM norm WHERE LENGTH(k2) >= 3
        UNION ALL
        SELECT k3 AS k FROM norm WHERE LENGTH(k3) >= 3
      )
      SELECT COUNT(*)::int as cnt FROM (
        SELECT k FROM keys GROUP BY k HAVING COUNT(*) > 1
      ) t
    `
    workTotal = workCountRows[0]?.cnt ?? 0
    workDups = workRows.map((r) => {
      // 同组内按 id 去重（一个作品多个字段命中同一键时会出现重复行）
      const seen = new Set<string>()
      const items: { id: string; label: string; href: string }[] = []
      r.ids.forEach((id, i) => {
        if (seen.has(id)) return
        seen.add(id)
        const slug = r.slugs?.[i] ?? id
        items.push({
          id,
          label: r.titles[i] ?? id,
          href: `/galvelica/works/${slug}`,
        })
      })
      return { key: r.key, items }
    })
  } catch (e) {
    logger.db.error("[GalvelicaDuplicates] 重复检测失败", e)
  }

  const creatorPages = Math.max(1, Math.ceil(creatorTotal / PAGE_SIZE))
  const workPages = Math.max(1, Math.ceil(workTotal / PAGE_SIZE))

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · DEDUPE"
      title="重复检测"
      description="按名称 / 归一化标题找出副站内的重复创作者与作品，便于合并治理。已分页，避免一次性加载全量数据。"
    >
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" /> 重复创作者（{creatorTotal} 组）
        </h2>
        {creatorDups.length === 0 ? (
          <EmptyState icon={CopyCheck} title="未发现重复创作者" description="副站创作者暂无同名重复。" bordered />
        ) : (
          <div className="space-y-3">
            {creatorDups.map((g) => (
              <div key={g.key} className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-sm font-medium text-foreground">{g.key}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <Link
                      key={it.id}
                      href={it.href}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground ring-1 ring-border hover:bg-accent/30"
                    >
                      {it.label}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={creatorPages} baseUrl="/admin/galvelica/duplicates" />
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" /> 重复作品（{workTotal} 组）
        </h2>
        {workDups.length === 0 ? (
          <EmptyState icon={CopyCheck} title="未发现重复作品" description="副站作品暂无归一化标题重复。" bordered />
        ) : (
          <div className="space-y-3">
            {workDups.map((g) => (
              <div key={g.key} className="rounded-xl border border-border bg-card p-4">
                <p className="mb-2 text-sm font-medium text-foreground">匹配键：{g.key}</p>
                <div className="flex flex-wrap gap-2">
                  {g.items.map((it) => (
                    <Link
                      key={it.id}
                      href={it.href}
                      className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground ring-1 ring-border hover:bg-accent/30"
                    >
                      {it.label}
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4">
          <Pagination currentPage={page} totalPages={workPages} baseUrl="/admin/galvelica/duplicates" />
        </div>
      </section>
    </AdminPageContainer>
  )
}
