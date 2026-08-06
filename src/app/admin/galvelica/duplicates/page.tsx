import Link from "next/link"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { normalizeMatchKey } from "@/lib/galvelica/work-service"
import { CopyCheck, Users, Layers, ArrowRight } from "lucide-react"

export const metadata = { title: "Galvelica 重复检测 · 管理后台" }
export const dynamic = "force-dynamic"

export default async function GalvelicaDuplicatesPage() {
  await requireSiteAdmin("galvelica")

  type DupGroup = { key: string; items: { id: string; label: string; href: string }[] }

  let creatorDups: DupGroup[] = []
  let workDups: DupGroup[] = []

  try {
    // 创作者重复：同名（case-insensitive）且 source=galvelica
    const creatorRows = await prisma.$queryRaw<Array<{ ids: string[]; names: string[] }>>`
      SELECT array_agg("id") as "ids", array_agg("name") as "names"
      FROM "Creator"
      WHERE source = 'galvelica'
      GROUP BY LOWER("name")
      HAVING COUNT(*) > 1
    `
    creatorDups = creatorRows.map((r) => ({
      key: r.names[0] ?? "",
      items: r.ids.map((id, i) => ({
        id,
        label: r.names[i] ?? id,
        href: `/admin/galvelica/creators/${id}`,
      })),
    }))

    // 作品重复：按归一化标题/原名分组
    const works = await prisma.work.findMany({
      select: { id: true, title: true, originalWork: true, englishName: true, slug: true },
    })
    const buckets = new Map<string, { id: string; title: string; slug: string }[]>()
    for (const w of works) {
      const keys = [w.title, w.originalWork, w.englishName].map(normalizeMatchKey).filter((k) => k.length >= 3)
      // 取第一个命中键作为归属；若有多个不同键命中，分别入桶
      const used = new Set<string>()
      for (const k of keys) {
        if (used.has(k)) continue
        used.add(k)
        const arr = buckets.get(k) ?? []
        arr.push({ id: w.id, title: w.title, slug: w.slug })
        buckets.set(k, arr)
      }
    }
    workDups = Array.from(buckets.entries())
      .filter(([, items]) => items.length > 1)
      .map(([key, items]) => ({
        key,
        items: items.map((w) => ({ id: w.id, label: w.title, href: `/galvelica/works/${w.slug}` })),
      }))
  } catch (e) {
    logger.db.error("[GalvelicaDuplicates] 重复检测失败", e)
  }

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · DEDUPE"
      title="重复检测"
      description="按名称 / 归一化标题找出副站内的重复创作者与作品，便于合并治理。"
    >
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Users className="h-4 w-4 text-primary" /> 重复创作者（{creatorDups.length} 组）
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
      </section>

      <section className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Layers className="h-4 w-4 text-primary" /> 重复作品（{workDups.length} 组）
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
      </section>
    </AdminPageContainer>
  )
}
