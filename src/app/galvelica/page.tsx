import type { Metadata } from "next"
import Link from "next/link"
import { Section } from "@/components/galvelica/section"
import { EditorPicks } from "@/components/galvelica/editor-pick"
import { DailyPick, FeaturedThemes } from "@/components/galvelica/home-features"
import { GalvelicaSearch } from "@/components/galvelica/galvelica-search"
import { GalvelicaRandomLink } from "@/components/galvelica/galvelica-random-link"
import { getEditorPicks, getDailyPick, getFeaturedThemes, getNsfwMode, getWorksByIds } from "@/lib/galvelica"
import type { GalvelicaWorkCard } from "@/lib/galvelica"
import { WorkGrid } from "@/components/galvelica/work-card"
import { auth } from "@/lib/auth"
import { getRecentViewIds } from "@/lib/view-history"
import { cached, cacheKey } from "@/lib/redis"
import { getGalvelicaTagColor } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Galvelica · 同人视觉小说资料库",
  description:
    "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
  alternates: { canonical: "/galvelica" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "Galvelica · 同人视觉小说资料库",
    description:
      "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Galvelica · 同人视觉小说资料库",
    description:
      "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
    images: ["/opengraph-image"],
  },
}

/* 资料库索引快捷入口：指向各检索维度，强化「进入资料库」的入口感 */
const INDEX_LINKS = [
  { href: "/galvelica/works", label: "作品库" },
  { href: "/galvelica/tags", label: "标签索引" },
  { href: "/galvelica/studios", label: "社团" },
  { href: "/galvelica/years", label: "年份" },
  { href: "/galvelica/random", label: "随机翻开" },
]

export default async function GalvelicaHome() {
  // 首页三大区块走缓存，避免每次导航回源打库。
  // ⚠️ NSFW 过滤模式必须进缓存 key（防跨用户缓存泄漏）。
  // 任一数据源（VNDB / 数据库 / 缓存）抖动都不应拖垮整页：失败区块优雅降级为空，而非 500 白屏。
  const nsfwMode = await getNsfwMode().catch(() => "safe")
  const [editorPicks, daily, themes, tagColor] = await Promise.all([
    cached(cacheKey("galvelica:home:editorPicks", nsfwMode, 5), () => getEditorPicks(5), 300).catch(
      () => [] as any[],
    ),
    cached(
      cacheKey("galvelica:home:daily", nsfwMode, new Date().toISOString().slice(0, 10)),
      () => getDailyPick(),
      300,
    ).catch(() => null),
    cached(cacheKey("galvelica:home:themes", nsfwMode), () => getFeaturedThemes(), 300).catch(
      () => [] as any[],
    ),
    getGalvelicaTagColor().catch(() => undefined),
  ])

  // 继续浏览：服务端按当前登录用户读取真实浏览历史（每人各自独立）
  let recentWorks: GalvelicaWorkCard[] = []
  const session = await auth()
  if (session?.user?.id) {
    const ids = await getRecentViewIds(session.user.id, "WORK", 12)
    if (ids.length) recentWorks = await getWorksByIds(ids)
  }

  return (
    <div className="space-y-10 sm:space-y-14">
      {/* ── 刊头 Hero：资料库沉浸入口 + 更突出的检索 + 资料库索引带 ── */}
      <section
        className="relative overflow-hidden rounded-3xl border border-[color-mix(in_srgb,var(--gal-accent)_30%,transparent)] border-b-2 border-b-[color-mix(in_srgb,var(--gal-accent)_52%,transparent)] p-7 sm:p-11"
        style={{ background: "var(--gal-paper)" }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{ background: "linear-gradient(90deg, transparent, var(--gal-accent), transparent)" }}
          aria-hidden
        />
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">
          ARCHIVE · 可以随手逛
        </p>
        <h1 className="galvelica-h1--hero mt-3">同人视觉小说资料库</h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
          Galvelica 是一个安静的收藏空间。这里整理同人视觉小说的资料、制作人员与脉络，
          供你随手浏览与发现——而非下载。每一次打开，都是一次新鲜的偶遇。
        </p>

        {/* 检索：更突出的检索条（拉伸填满） */}
        <GalvelicaSearch
          className="mt-7 flex w-full max-w-xl gap-2"
          submitLabel="检索"
          fullWidth
        />

        {/* 资料库索引带：指向 works / tags / studios / years / random */}
        <div className="mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-caption font-medium uppercase tracking-[0.24em] text-muted-foreground/70">
            资料库索引
          </span>
          {INDEX_LINKS.map((l) =>
            l.href === "/galvelica/random" ? (
              <GalvelicaRandomLink
                key={l.href}
                label={l.label}
                showIcon={false}
                className="galvelica-navlink rounded-full px-3.5 py-1.5 text-sm font-medium"
              />
            ) : (
              <Link
                key={l.href}
                href={l.href}
                className="galvelica-navlink rounded-full px-3.5 py-1.5 text-sm font-medium"
              >
                {l.label}
              </Link>
            )
          )}
        </div>
      </section>

      {/* ── 继续浏览：个人真实浏览历史（每人各自独立），无历史则不显示 ── */}
      {recentWorks.length > 0 && (
        <Section title="继续浏览" subtitle="你最近看过的作品">
          <WorkGrid works={recentWorks} />
        </Section>
      )}

      {/* ── 编辑式双栏：编辑精选（主角，2/3）+ 今日偶遇（侧栏，1/3）──
          打破"Hero + 几个横排卡片"的通用模板，形成错落编排的阅览节奏 */}
      <div className="grid gap-6 sm:gap-8 lg:grid-cols-3 lg:gap-10">
        <div className="min-w-0 lg:col-span-2">
          <Section
            title="编辑精选"
            subtitle="由编辑精心挑选，值得放慢脚步品读的作品"
            href="/galvelica/works"
            hrefLabel="浏览全部作品"
          >
            <EditorPicks works={editorPicks} />
          </Section>
        </div>

        <div className="flex min-w-0 flex-col">
          <Section
            title="今日偶遇"
            subtitle="每一天，为你留下一部值得读的作品"
            className="flex flex-1 flex-col"
            action={
              <GalvelicaRandomLink
                label="随机一部 →"
                showIcon={false}
                className="galvelica-navlink shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium"
              />
            }
          >
            <DailyPick work={daily} />
          </Section>
        </div>
      </div>

      {/* ── 专题（编辑视角的专题入口，非机械标签云，全宽收束）── */}
      {themes.length > 0 && (
        <Section
          title="专题"
          subtitle="编辑视角的专题专栏，而非导航栏里已有的标签筛选"
          href="/galvelica/works"
          hrefLabel="浏览全部"
        >
          <FeaturedThemes themes={themes} tagColor={tagColor} />
        </Section>
      )}
    </div>
  )
}
