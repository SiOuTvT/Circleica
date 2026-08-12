import type { Metadata } from "next"
import Link from "next/link"
import { getYears } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "年份索引 · Galvelica",
  description: "沿时间轴回看同人视觉小说的创作脉络，按发布年份浏览作品。",
  alternates: { canonical: "/galvelica/years" },
}

export default async function GalvelicaYears() {
  const years = await getYears()

  return (
    <div className="space-y-8">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA · 年份</p>
        <h1 className="galvelica-h1 mt-2">年份索引</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          沿时间轴回看同人视觉小说的创作脉络，共 {years.length} 个年份。
        </p>
      </div>

      {years.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">暂无收录的作品。</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {years.map(({ year, count }) => (
            <Link
              key={year}
              href={`/galvelica/years/${year}`}
              className="galvelica-card group flex flex-col items-center justify-center rounded-2xl py-6 transition-colors"
            >
              <span className="galvelica-serif text-2xl font-semibold text-foreground tabular-nums group-hover:text-[var(--gal-accent)]">
                {year}
              </span>
              <span className="mt-1 text-xs text-muted-foreground tabular-nums">{count} 部</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
