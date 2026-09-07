import type { Metadata } from "next"
import Link from "next/link"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaSearch } from "@/components/galvelica/galvelica-search"
import { listWorks, getPopularTags, getNsfwMode, type GalvelicaSort } from "@/lib/galvelica"
import { cached, cacheKey } from "@/lib/redis"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "作品库",
  description: "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。",
  alternates: { canonical: "/galvelica/works" },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "Galvelica",
    title: "作品库",
    description: "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。",
    images: ["/opengraph-image"],
  },
  twitter: {
    card: "summary_large_image",
    title: "作品库",
    description: "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。",
    images: ["/opengraph-image"],
  },
}

type RawSP = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

const SORTS: { key: GalvelicaSort; label: string }[] = [
  { key: "recommended", label: "推荐" },
  { key: "recent", label: "最近" },
  { key: "popular", label: "热门" },
  { key: "views", label: "浏览" },
  { key: "title", label: "名称" },
  { key: "year", label: "年份" },
]

export default async function GalvelicaWorks({ searchParams }: { searchParams: Promise<RawSP> }) {
  const sp = await searchParams

  const search = one(sp.search)?.trim() || undefined
  const yearRaw = one(sp.year)
  const year = yearRaw && /^\d{4}$/.test(yearRaw) ? parseInt(yearRaw, 10) : undefined
  const studio = one(sp.studio) ? decodeURIComponent(one(sp.studio)!) : undefined
  const sort = (one(sp.sort) as GalvelicaSort) || "recommended"
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1)
  const tags = (one(sp.tags) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  // 列表与热门标签走缓存（force-dynamic 下避免每次导航全打库）。
  // 列表按完整筛选条件做 key；⚠️ NSFW 过滤模式必须进 key（防跨用户缓存泄漏）。
  const nsfwMode = await getNsfwMode()
  const [result, popularTags] = await Promise.all([
    cached(
      cacheKey(
        "galvelica:works",
        JSON.stringify({ tags, year, studio, search, sort, page, mode: nsfwMode }),
      ),
      () => listWorks({ tags, year, studio, search, sort, page }),
      60,
    ),
    cached(cacheKey("galvelica:popularTags", 12), () => getPopularTags(12), 300),
  ])

  // 当前筛选状态（用于构造链接）
  const state: Record<string, string | undefined> = {
    search,
    year: year ? String(year) : undefined,
    studio: studio ? encodeURIComponent(studio) : undefined,
    sort,
    tags: tags.join(",") || undefined,
  }

  const makeHref = (override: Record<string, string | undefined>) => {
    const merged = { ...state, ...override }
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(merged)) {
      if (v !== undefined && v !== "") params.set(k, v)
    }
    const qs = params.toString()
    return qs ? `/galvelica/works?${qs}` : "/galvelica/works"
  }

  const toggleTag = (id: string) => {
    const next = tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id]
    return makeHref({ tags: next.join(",") || undefined, page: undefined })
  }

  const hasFilters = !!(search || year || studio || tags.length)

  return (
    <div className="space-y-8">
      <div>
        <p className="text-caption font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 作品库</p>
        <h1 className="galvelica-h1 mt-2">作品库</h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">共收录 {result.total} 部作品</p>
      </div>

      {/* 搜索 */}
      <GalvelicaSearch
        className="flex gap-2"
        defaultValue={search ?? ""}
        hiddenFields={{ tags: tags.join(",") || undefined, year: year ? String(year) : undefined, studio: studio ? encodeURIComponent(studio) : undefined }}
        submitLabel="检索"
      />

      {/* 排序 + 当前筛选（同一横条） */}
      <div className="galvelica-strip">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={makeHref({ sort: s.key, page: undefined })}
            data-active={sort === s.key}
            className="galvelica-strip-item"
          >
            <b>{s.label}</b>
          </Link>
        ))}
        {search && (
          <Link href={makeHref({ search: undefined, page: undefined })} className="galvelica-strip-item">
            <b>关键词：{search} ✕</b>
          </Link>
        )}
        {year && (
          <Link href={makeHref({ year: undefined, page: undefined })} className="galvelica-strip-item">
            <b>{year} 年 ✕</b>
          </Link>
        )}
        {studio && (
          <Link href={makeHref({ studio: undefined, page: undefined })} className="galvelica-strip-item">
            <b>社团：{studio} ✕</b>
          </Link>
        )}
        {tags.map((id) => {
          const t = popularTags.find((p) => p.id === id)
          return (
            <Link key={id} href={toggleTag(id)} className="galvelica-strip-item">
              <b>#{t?.name ?? id} ✕</b>
            </Link>
          )
        })}
        {hasFilters && (
          <Link href="/galvelica/works" className="galvelica-strip-item">
            <b>清除筛选</b>
          </Link>
        )}
      </div>

      {/* 热门标签（12 个，作为可叠加筛选，不上色） */}
      <div className="galvelica-strip">
        {popularTags.map((t) => {
          const active = tags.includes(t.id)
          return (
            <Link key={t.id} href={toggleTag(t.id)} data-active={active} className="galvelica-strip-item">
              <b>{t.name}</b>
              {typeof t.count === "number" && <i>{t.count}</i>}
            </Link>
          )
        })}
      </div>

      {/* 结果 */}
      <WorkGrid works={result.items} priorityCount={5} desc />

      {/* 分页 */}
      <Pager
        basePath="/galvelica/works"
        query={{ search, year: year ? String(year) : undefined, studio: studio ? encodeURIComponent(studio) : undefined, sort, tags: tags.join(",") || undefined }}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  )
}
