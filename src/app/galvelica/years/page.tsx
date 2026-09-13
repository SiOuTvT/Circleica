import type { Metadata } from "next"
import { CalendarDays } from "lucide-react"
import { getYears } from "@/lib/galvelica"
import { GalvelicaIndexFilter } from "@/components/galvelica/galvelica-index-filter"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "年份索引",
  description: "沿时间轴回看同人视觉小说的创作脉络，按发布年份浏览作品。",
  alternates: { canonical: "/galvelica/years" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "年份索引",
    description: "沿时间轴回看同人视觉小说的创作脉络，按发布年份浏览作品。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "年份索引",
    description: "沿时间轴回看同人视觉小说的创作脉络，按发布年份浏览作品。",
    images: ["/opengraph-image"],
  },
}

export default async function GalvelicaYears() {
  const years = await getYears()
  const thisYear = new Date().getFullYear()

  return (
    <div className="galvelica-index-page">
      <div className="galvelica-index-title">
        <p className="galvelica-fs-eyebrow font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 年份</p>
        <h1 className="galvelica-h1 mt-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          年份索引
        </h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">
          沿时间轴回看同人视觉小说的创作脉络，共 {years.length} 个年份。
        </p>
      </div>

      {years.length === 0 ? (
        <p className="galvelica-index-empty py-10 text-center galvelica-fs-meta text-muted-foreground">暂无收录的作品。</p>
      ) : (
        <GalvelicaIndexFilter
          variant="year"
          numericPrefix
          placeholder="筛选年份"
          items={years.map(({ year, count }) => ({
            href: `/galvelica/years/${year}`,
            label: String(year),
            count,
            alt: year > thisYear ? "预定" : "",
          }))}
        />
      )}
    </div>
  )
}
