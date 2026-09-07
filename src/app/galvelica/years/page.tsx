import type { Metadata } from "next"
import Link from "next/link"
import { CalendarDays } from "lucide-react"
import { getYears } from "@/lib/galvelica"

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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 年份</p>
        <h1 className="galvelica-h1 mt-2 flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-muted-foreground" />
          年份索引
        </h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">
          沿时间轴回看同人视觉小说的创作脉络，共 {years.length} 个年份。
        </p>
      </div>

      {years.length === 0 ? (
        <p className="py-10 text-center galvelica-fs-meta text-muted-foreground">暂无收录的作品。</p>
      ) : (
        <div className="galvelica-year-grid">
          {years.map(({ year, count }) => (
            <Link
              key={year}
              href={`/galvelica/years/${year}`}
              className="galvelica-index-card galvelica-year-cell"
            >
              <span className="galvelica-year-year">{year}</span>
              <span className="galvelica-year-count">{count} 部</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
