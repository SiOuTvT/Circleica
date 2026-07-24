import type { Metadata } from "next"
import Link from "next/link"
import { Section } from "@/components/galvelica/section"
import { WorkGrid } from "@/components/galvelica/work-card"
import { EditorPicks } from "@/components/galvelica/editor-pick"
import {
  getRecentWorks,
  getEditorPicks,
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
  const [editorPicks, recent, years, studios] = await Promise.all([
    getEditorPicks(5),
    getRecentWorks(10),
    getYears(),
    getStudios(),
  ])

  const topYears = years.slice(0, 12)
  const topStudios = studios.slice(0, 4)

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* ── Hero：档案馆沉浸式入口（保留并微调）── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gal-accent)_20%,transparent)] p-7 sm:p-11"
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
        <h1 className="galvelica-serif mt-3 text-3xl font-semibold leading-tight text-foreground sm:text-[2.6rem]">
          同人视觉小说档案馆
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Galvelica 是一个安静的收藏空间。这里整理同人视觉小说的资料、制作人员与脉络，
          供你沉浸地浏览与发现——而非下载。每一次打开，都是一次归档式的漫游。
        </p>

        <form action="/galvelica/works" method="get" className="mt-6 flex max-w-md gap-2">
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

      {/* ── 编辑精选（杂志式，首页主角）── */}
      <Section
        title="编辑精选"
        subtitle="由策展人精心挑选，值得放慢脚步品读的作品"
        href="/galvelica/works?sort=popular"
        hrefLabel="按热度浏览"
      >
        <EditorPicks works={editorPicks} />
      </Section>

      {/* ── 最新档案（克制的展览网格）── */}
      <Section
        title="最新档案"
        subtitle="新近被收进档案馆的作品"
        href="/galvelica/works?sort=recent"
        hrefLabel="查看全部"
      >
        <WorkGrid works={recent.slice(0, 5)} showTags={false} />
      </Section>

      {/* ── 社团精选（优雅列表，非 chip 云）── */}
      {topStudios.length > 0 && (
        <Section
          title="社团精选"
          subtitle="走进持续产出同人作品的社团"
          href="/galvelica/studios"
          hrefLabel="社团索引"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {topStudios.map(({ name, count }) => (
              <Link
                key={name}
                href={`/galvelica/studios/${encodeURIComponent(name)}`}
                className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 transition-colors duration-300 hover:border-[color-mix(in_srgb,var(--gal-accent)_40%,transparent)]"
              >
                <span className="min-w-0">
                  <span className="galvelica-serif block truncate text-base font-semibold text-foreground transition-colors group-hover:text-[var(--gal-accent)]">
                    {name}
                  </span>
                  <span className="text-xs text-muted-foreground">{count} 部作品</span>
                </span>
                <svg
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-colors group-hover:text-[var(--gal-accent)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 12h14" />
                  <path d="M12 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── 沿着年份（细条时间轴，非功能入口堆砌）── */}
      {topYears.length > 0 && (
        <Section
          title="沿着年份"
          subtitle="时间轴上的同人创作脉络"
          href="/galvelica/years"
          hrefLabel="年份索引"
        >
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {topYears.map(({ year, count }) => (
              <Link
                key={year}
                href={`/galvelica/years/${year}`}
                className="galvelica-serif inline-flex items-baseline gap-1.5 text-lg font-medium text-foreground/80 transition-colors hover:text-[var(--gal-accent)]"
              >
                {year}
                <span className="text-xs font-sans text-muted-foreground/70 tabular-nums">{count}</span>
              </Link>
            ))}
          </div>
        </Section>
      )}

      {/* ── 进入档案馆 CTA ── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gal-accent)_20%,transparent)] p-8 text-center sm:p-12"
        style={{ background: "var(--gal-paper)" }}
      >
        <h2 className="galvelica-serif text-2xl font-semibold text-foreground sm:text-3xl">
          走进档案馆
        </h2>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
          这里没有下载按钮，只有值得被记住的作品与脉络。慢慢看，总有一部会留住你。
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/galvelica/works"
            className="rounded-xl bg-[var(--gal-accent)] px-5 py-2.5 text-sm font-semibold text-[var(--theme-fg)] transition-opacity hover:opacity-90"
          >
            浏览全部档案 →
          </Link>
          <Link
            href="/galvelica/random"
            className="galvelica-navlink rounded-xl px-5 py-2.5 text-sm font-medium"
          >
            随机发现一部
          </Link>
        </div>
      </section>
    </div>
  )
}
