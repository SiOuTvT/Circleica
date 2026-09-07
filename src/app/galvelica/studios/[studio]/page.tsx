import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaBackLink } from "@/components/galvelica/back-link"
import { GalvelicaEyebrow } from "@/components/galvelica/galvelica-eyebrow"
import { listWorks } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

export async function generateMetadata({ params }: { params: Promise<{ studio: string }> }): Promise<Metadata> {
  const { studio } = await params
  const name = decodeURIComponent(studio)
  return {
    title: name,
    description: `浏览 Galvelica 中社团「${name}」的同人视觉小说作品。`,
    openGraph: { siteName: "Galvelica" },
    alternates: { canonical: `/galvelica/studios/${studio}` },
  }
}

export default async function GalvelicaStudioDetail({
  params,
  searchParams,
}: {
  params: Promise<{ studio: string }>
  searchParams: Promise<RawSP>
}) {
  const { studio } = await params
  const name = decodeURIComponent(studio)
  if (!name) notFound()

  const sp = await searchParams
  const page = Math.max(1, parseInt((Array.isArray(sp.page) ? sp.page[0] : sp.page) || "1", 10) || 1)

  const result = await listWorks({ studio: name, page })

  return (
    <div className="space-y-8">
      <div>
        <GalvelicaBackLink href="/galvelica/studios" label="社团索引" />
        <GalvelicaEyebrow text="GALVELICA 社团" className="mt-3" />
        <h1 className="galvelica-detail-title">{name}</h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">共 {result.total} 部作品</p>
      </div>

      <WorkGrid works={result.items} priorityCount={5} />
      <Pager basePath={`/galvelica/studios/${studio}`} page={result.page} totalPages={result.totalPages} />
    </div>
  )
}
