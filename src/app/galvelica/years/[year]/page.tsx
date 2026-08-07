import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaBackLink } from "@/components/galvelica/back-link"
import { listWorks } from "@/lib/galvelica"
import { getGalvelicaTagColor } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({ params }: { params: Promise<{ year: string }> }): Promise<Metadata> {
  const { year } = await params
  if (!/^\d{4}$/.test(year)) return { title: "年份 · Galvelica" }
  return {
    title: `${year} 年 · Galvelica`,
    description: `浏览 Galvelica 中发布于 ${year} 年的同人视觉小说作品。`,
    alternates: { canonical: `/galvelica/years/${year}` },
  }
}

export default async function GalvelicaYearDetail({
  params,
  searchParams,
}: {
  params: Promise<{ year: string }>
  searchParams: Promise<RawSP>
}) {
  const { year } = await params
  if (!/^\d{4}$/.test(year)) notFound()
  const y = parseInt(year, 10)

  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)

  const [result, tagColor] = await Promise.all([listWorks({ year: y, page }), getGalvelicaTagColor()])

  return (
    <div className="space-y-8">
      <div>
        <GalvelicaBackLink href="/galvelica/years" label="年份索引" />
        <h1 className="galvelica-h1 mt-3">{y} 年</h1>
        <p className="mt-1 text-sm text-muted-foreground">共 {result.total} 部作品</p>
      </div>

      <WorkGrid works={result.items} priorityCount={5} tagColor={tagColor} />
      <Pager basePath={`/galvelica/years/${year}`} page={result.page} totalPages={result.totalPages} />
    </div>
  )
}
