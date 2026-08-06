import type { Metadata } from "next"
import Link from "next/link"
import { Section } from "@/components/galvelica/section"
import { EditorPicks } from "@/components/galvelica/editor-pick"
import { CuratorNote, DailyPick, FeaturedThemes } from "@/components/galvelica/home-features"
import { GalvelicaSearch } from "@/components/galvelica/galvelica-search"
import { getEditorPicks, getDailyPick, getFeaturedThemes } from "@/lib/galvelica"
import { cached, cacheKey } from "@/lib/redis"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Galvelica · 同人视觉小说资料库",
  description:
    "Galvelica 是 Circleica 旗下的同人视觉小说资料库与档案馆。安静地浏览、收藏与发现作品，而非下载。",
  alternates: { canonical: "/galvelica" },
}

export default async function GalvelicaHome() {
  // 首页三大区块走缓存，避免每次导航回源打库。
  // 今日缘分按"当天日期"做 key，跨天自动刷新；其余按内容缓存。
  const [editorPicks, daily, themes] = await Promise.all([
    cached(cacheKey("galvelica:home:editorPicks", 5), () => getEditorPicks(5), 300),
    cached(
      cacheKey("galvelica:home:daily", new Date().toISOString().slice(0, 10)),
      () => getDailyPick(),
      300,
    ),
    cached(cacheKey("galvelica:home:themes"), () => getFeaturedThemes(), 300),
  ])

  return (
    <div className="space-y-10 sm:space-y-12">
      {/* ── Hero：档案馆沉浸式入口（保留）── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gal-accent)_20%,transparent)] p-7 sm:p-11"
        style={{ background: "var(--gal-paper)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--gal-accent), transparent)" }}
          aria-hidden
        />
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">
          Archive · 资料库
        </p>
        <h1 className="galvelica-h1--hero mt-3">
          同人视觉小说档案馆
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Galvelica 是一个安静的收藏空间。这里整理同人视觉小说的资料、制作人员与脉络，
          供你沉浸地浏览与发现——而非下载。每一次打开，都是一次归档式的漫游。
        </p>

        <GalvelicaSearch className="mt-6 flex max-w-md gap-2" submitLabel="检索" />

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

      {/* ── 本馆札记（编辑声，给档案馆人格）── */}
      <CuratorNote />

      {/* ── 今日缘分（按日期确定的一部，偶遇感）── */}
      <Section
        title="今日缘分"
        subtitle="每一天，馆方为你留下一部值得读的作品"
        href="/galvelica/random"
        hrefLabel="随机一部"
      >
        <DailyPick work={daily} />
      </Section>

      {/* ── 专题策划（编辑视角的策展入口，非机械标签云）── */}
      {themes.length > 0 && (
        <Section
          title="专题策划"
          subtitle="编辑视角的策展专栏，而非导航栏里已有的标签筛选"
          href="/galvelica/works"
          hrefLabel="浏览全部"
        >
          <FeaturedThemes themes={themes} />
        </Section>
      )}
    </div>
  )
}
