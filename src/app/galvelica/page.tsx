import type { Metadata } from "next"
import Link from "next/link"
import { Section } from "@/components/galvelica/section"
import { WorkGrid } from "@/components/galvelica/work-card"
import { TagCloud } from "@/components/galvelica/tag-pill"
import {
  getRecentWorks,
  getEditorPicks,
  getPopularTags,
  getYears,
  getStudios,
} from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Galvelica · 同人视觉小说资料库",
  description:
    "Galvelica 是 Circleica 旗下的同人视觉小说资料库与档案馆。安静地浏览、收藏与发现作品，而非下载。",
  alternates: { canonical: "/galvelica" },
}

export default async function GalvelicaHome() {
  const [editorPicks, recent, popularTags, years, studios] = await Promise.all([
    getEditorPicks(8),
    getRecentWorks(10),
    getPopularTags(28),
    getYears(),
    getStudios(),
  ])

  const topYears = years.slice(0, 14)
  const topStudios = studios.slice(0, 16)

  return (
    <div className="space-y-8 sm:space-y-10">
      {/* ── Hero ── */}
      <section
        className="relative overflow-hidden rounded-2xl border border-border p-6 sm:p-9"
        style={{ background: "var(--gal-paper)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--gal-accent), transparent)" }}
          aria-hidden
        />
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">
          Archive · 资料库
        </p>
        <h1 className="galvelica-serif mt-2 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
          同人视觉小说档案馆
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Galvelica 是一个安静的收藏空间。这里整理同人视觉小说的资料、制作人员与脉络，
          供你沉浸地浏览与发现——而非下载。每一次打开，都是一次归档式的漫游。
        </p>

        <form action="/galvelica/works" method="get" className="mt-5 flex max-w-md gap-2">
          <input
            type="search"
            name="search"
            placeholder="搜索作品、社团或原作…"
            className="min-w-0 flex-1 rounded-xl border border-input bg-card px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 focus:border-[var(--gal-accent)] focus:outline-none"
            aria-label="搜索作品"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl bg-[var(--gal-accent)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-fg)] transition-opacity hover:opacity-90"
          >
            检索
          </button>
        </form>

        <Link
          href="/galvelica/random"
          className="galvelica-navlink mt-4 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium"
        >
          随便看看：随机发现一部作品 →
        </Link>
      </section>

      {/* ── 编辑推荐 ── */}
      <Section
        title="编辑推荐"
        subtitle="由社区策展的精选手册"
        href="/galvelica/works?sort=popular"
        hrefLabel="按热度浏览"
      >
        <WorkGrid works={editorPicks} priorityCount={5} />
      </Section>

      {/* ── 最近收录 ── */}
      <Section title="最近收录" subtitle="新近进入档案的作品" href="/galvelica/works?sort=recent" hrefLabel="查看全部">
        <WorkGrid works={recent} />
      </Section>

      {/* ── 热门标签 ── */}
      <Section title="热门标签" subtitle="沿着题材、世界观与社团自由探索" href="/galvelica/tags" hrefLabel="全部标签">
        <TagCloud tags={popularTags} />
      </Section>

      {/* ── 按年份浏览 ── */}
      {topYears.length > 0 && (
        <Section title="按年份浏览" subtitle="沿时间轴回看同人创作的脉络" href="/galvelica/years" hrefLabel="年份索引">
          <div className="flex flex-wrap gap-2">
            {topYears.map(({ year, count }) => (
              <Link
                key={year}
                href={`/galvelica/years/${year}`}
                className="galvelica-tag inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium tabular-nums"
              >
                {year}
                <span className="opacity-60">{count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── 按社团浏览 ── */}
      {topStudios.length > 0 && (
        <Section title="按社团浏览" subtitle="走进制作同人作品的社团" href="/galvelica/studios" hrefLabel="社团索引">
          <div className="flex flex-wrap gap-2">
            {topStudios.map(({ name, count }) => (
              <Link
                key={name}
                href={`/galvelica/studios/${encodeURIComponent(name)}`}
                className="galvelica-tag inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium"
              >
                {name}
                <span className="opacity-60 tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}
