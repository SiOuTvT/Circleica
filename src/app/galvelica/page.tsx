import type { Metadata } from "next"
import Link from "next/link"
import { GalvelicaEyebrow } from "@/components/galvelica/galvelica-eyebrow"
import { GalvelicaCover } from "@/components/galvelica/galvelica-cover"
import { GalvelicaEntryRow } from "@/components/galvelica/galvelica-entry-row"
import { GalvelicaSectionHead } from "@/components/galvelica/galvelica-section-head"
import {
  getEditorPicks,
  getDailyPick,
  getYears,
  getPopularTags,
  getNsfwMode,
  getWorksByIds,
  type GalvelicaWorkCard,
} from "@/lib/galvelica"
import { auth } from "@/lib/auth"
import { getRecentViewIds } from "@/lib/view-history"
import { cached, cacheKey } from "@/lib/redis"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "同人视觉小说资料库",
  description: "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
  alternates: { canonical: "/galvelica" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "同人视觉小说资料库",
    description: "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "同人视觉小说资料库",
    description: "Galvelica 是 Circleica 旗下的同人视觉小说资料库。安静地浏览、收藏与发现作品，而非下载。",
    images: ["/opengraph-image"],
  },
}

export default async function GalvelicaHome() {
  const nsfwMode = await getNsfwMode().catch(() => "safe")

  const [editorPicks, daily, years, tags] = await Promise.all([
    cached(cacheKey("galvelica:home:editorPicks", nsfwMode, 8), () => getEditorPicks(8), 300).catch(() => [] as GalvelicaWorkCard[]),
    cached(cacheKey("galvelica:home:daily", nsfwMode, new Date().toISOString().slice(0, 10)), () => getDailyPick(), 300).catch(() => null),
    getYears(),
    getPopularTags(10),
  ])

  let recentWorks: GalvelicaWorkCard[] = []
  const session = await auth()
  if (session?.user?.id) {
    const ids = await getRecentViewIds(session.user.id, "WORK", 6)
    if (ids.length) recentWorks = await getWorksByIds(ids)
  }

  const thisYear = new Date().getFullYear()
  const pastYears = years.filter((y) => y.year <= thisYear).slice(0, 9)
  const futureYears = years.filter((y) => y.year > thisYear)
  const shownYears = [...pastYears, ...futureYears]

  const monthDay = new Date().toLocaleDateString("zh-CN", { month: "long", day: "numeric" })

  return (
    <>
      <h1 className="sr-only galvelica-fs-h1">同人视觉小说资料库</h1>

      <div className="galvelica-home">
        {/* ① 今日偶遇 */}
        {daily && (
          <a href={daily.href} className="galvelica-daily">
            <span className="galvelica-daily-spine" aria-hidden />
            <GalvelicaCover src={daily.coverImage} alt={daily.title} size="lg" />
            <span className="galvelica-daily-body">
              <GalvelicaEyebrow text={`今日偶遇 ${monthDay}`} />
              <h3 className="galvelica-daily-title">{daily.title}</h3>
              {daily.description && <p className="galvelica-daily-desc">{daily.description}</p>}
              <span className="galvelica-entry-meta">
                <span className="galvelica-entry-studio">{daily.studioName || "未知社团"}</span>
                {daily.releaseYear ? <span>{daily.releaseYear}</span> : null}
                {daily.originalWork ? <span>{daily.originalWork}</span> : null}
              </span>
            </span>
            <span className="galvelica-daily-side">
              <span className="galvelica-daily-year">{daily.releaseYear ?? ""}</span>
              <span className="galvelica-entry-tagcount">{daily.tags.length} 个标签</span>
            </span>
          </a>
        )}

        {/* ② 编辑精选 */}
        <section>
          <GalvelicaSectionHead
            title="编辑精选"
            count="20928 部里挑出 8 部"
            href="/galvelica/works"
            hrefLabel="全部作品"
          />
          <div className="galvelica-grid-2">
            {editorPicks.map((w) => (
              <GalvelicaEntryRow key={w.id} work={w} />
            ))}
          </div>
        </section>

        {/* ③ 按年份走 */}
        <section>
          <GalvelicaSectionHead title="按年份走" href="/galvelica/years" hrefLabel="全部 42 个年份" />
          <div className="galvelica-strip">
            {shownYears.map((y) => (
              <Link key={y.year} href={`/galvelica/years/${y.year}`} className="galvelica-strip-item">
                <b>{y.year}{y.year > thisYear ? " 预定" : ""}</b>
                <i>{y.count}</i>
              </Link>
            ))}
          </div>
        </section>

        {/* ④ 常见标签 */}
        <section>
          <GalvelicaSectionHead title="常见标签" href="/galvelica/tags" hrefLabel="标签索引" />
          <div className="galvelica-strip">
            {tags.map((t) => (
              <Link key={t.id} href={`/galvelica/tags/${t.id}`} className="galvelica-strip-item">
                <b>{t.name}</b>
                <i>{t.count}</i>
              </Link>
            ))}
          </div>
        </section>

        {/* ⑤ 继续浏览（登录且有历史才显示，上限 6） */}
        {recentWorks.length > 0 && (
          <section>
            <GalvelicaSectionHead title="继续浏览" href="/galvelica/works" hrefLabel="全部作品" />
            <div className="galvelica-grid-2">
              {recentWorks.map((w) => (
                <GalvelicaEntryRow key={w.id} work={w} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  )
}
