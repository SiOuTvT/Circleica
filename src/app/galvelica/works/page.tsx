import type { Metadata } from "next"
import type { CSSProperties } from "react"
import Link from "next/link"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaSearch } from "@/components/galvelica/galvelica-search"
import { listWorks, getPopularTags, getNsfwMode, type GalvelicaSort } from "@/lib/galvelica"
import { cached, cacheKey } from "@/lib/redis"
import { getGalvelicaTagColor } from "@/lib/site-settings"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "作品库 · Galvelica",
  description: "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。",
  alternates: { canonical: "/galvelica/works" },
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
    cached(cacheKey("galvelica:popularTags", 24), () => getPopularTags(24), 300),
  ])

  // 副站统一标签色：直查（实时，不经 300s 长缓存），后台保存后立即在前台生效。
  const tagColor = await getGalvelicaTagColor()

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
        <h1 className="galvelica-h1">作品库</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共收录 {result.total} 部作品
          {hasFilters && (
            <Link href="/galvelica/works" className="ml-2 text-[var(--gal-accent)] hover:underline">
              清除筛选
            </Link>
          )}
        </p>
      </div>

      {/* 搜索 */}
      <GalvelicaSearch
        className="flex gap-2"
        defaultValue={search ?? ""}
        hiddenFields={{ tags: tags.join(",") || undefined, year: year ? String(year) : undefined, studio: studio ? encodeURIComponent(studio) : undefined }}
        submitLabel="检索"
      />

      {/* 排序 */}
      <div className="flex flex-wrap gap-1.5">
        {SORTS.map((s) => (
          <Link
            key={s.key}
            href={makeHref({ sort: s.key, page: undefined })}
            data-active={sort === s.key}
            className="galvelica-navlink rounded-lg px-3 py-1.5 text-sm font-medium"
          >
            {s.label}
          </Link>
        ))}
      </div>

      {/* 标签组合筛选 */}
      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">标签组合（可多选）</p>
        <div className="flex flex-wrap gap-2">
          {popularTags.map((t) => {
            const active = tags.includes(t.id)
            return (
              <Link
                key={t.id}
                href={toggleTag(t.id)}
                data-active={active}
                style={{ "--gal-tag-color": tagColor } as CSSProperties}
                className={
                  active
                    ? "inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--gal-accent)_45%,transparent)] bg-[var(--gal-accent-soft)] px-2.5 py-1.5 text-xs font-medium text-[var(--gal-accent)]"
                    : "galvelica-tag inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium"
                }
              >
                {t.name}
                {typeof t.count === "number" && <span className="opacity-60 tabular-nums">{t.count}</span>}
              </Link>
            )
          })}
        </div>
      </div>

      {/* 当前筛选摘要 */}
      {hasFilters && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">当前筛选：</span>
          {search && (
            <Link href={makeHref({ search: undefined, page: undefined })} className="galvelica-tag rounded-md px-2 py-1">
              关键词：{search} ✕
            </Link>
          )}
          {year && (
            <Link href={makeHref({ year: undefined, page: undefined })} className="galvelica-tag rounded-md px-2 py-1">
              {year} 年 ✕
            </Link>
          )}
          {studio && (
            <Link href={makeHref({ studio: undefined, page: undefined })} className="galvelica-tag rounded-md px-2 py-1">
              社团：{studio} ✕
            </Link>
          )}
          {tags.map((id) => {
            const t = popularTags.find((p) => p.id === id)
            return (
              <Link
                key={id}
                href={toggleTag(id)}
                className="galvelica-tag rounded-md px-2 py-1"
                style={{ "--gal-tag-color": tagColor } as CSSProperties}
              >
                #{t?.name ?? id} ✕
              </Link>
            )
          })}
        </div>
      )}

      {/* 结果 */}
      <WorkGrid works={result.items} priorityCount={5} tagColor={tagColor} />

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
