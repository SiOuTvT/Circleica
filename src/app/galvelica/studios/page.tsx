import type { Metadata } from "next"
import { Building2 } from "lucide-react"
import { getStudios } from "@/lib/galvelica"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaIndexFilter } from "@/components/galvelica/galvelica-index-filter"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "社团索引",
  description: "浏览制作同人视觉小说的社团，按作品数量排序。",
  alternates: { canonical: "/galvelica/studios" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "社团索引",
    description: "浏览制作同人视觉小说的社团，按作品数量排序。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "社团索引",
    description: "浏览制作同人视觉小说的社团，按作品数量排序。",
    images: ["/opengraph-image"],
  },
}

const STUDIOS_PER_PAGE = 60

export default async function GalvelicaStudios({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams
  const all = await getStudios()
  const total = all.length
  const totalPages = Math.max(1, Math.ceil(total / STUDIOS_PER_PAGE))
  const page = Math.min(totalPages, Math.max(1, Number(pageParam) || 1))
  const start = (page - 1) * STUDIOS_PER_PAGE
  const studios = all.slice(start, start + STUDIOS_PER_PAGE)

  return (
    <div className="space-y-8">
      <div className="galvelica-index-page">
        <div className="galvelica-index-title">
          <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 社团</p>
          <h1 className="galvelica-h1 mt-2 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            社团索引
          </h1>
          <p className="mt-1 galvelica-fs-meta text-muted-foreground">共 {total} 个社团，第 {page}/{totalPages} 页。</p>
        </div>

        {studios.length === 0 ? (
          <p className="galvelica-index-empty py-10 text-center galvelica-fs-meta text-muted-foreground">暂无收录的社团。</p>
        ) : (
          <GalvelicaIndexFilter
            variant="studio"
            placeholder="筛选社团"
            paged={totalPages > 1 ? { page, perPage: STUDIOS_PER_PAGE } : undefined}
            items={studios.map(({ name, count }) => ({
              href: `/galvelica/studios/${encodeURIComponent(name)}`,
              label: name,
              count,
            }))}
          />
        )}
      </div>

      <Pager basePath="/galvelica/studios" page={page} totalPages={totalPages} />
    </div>
  )
}
