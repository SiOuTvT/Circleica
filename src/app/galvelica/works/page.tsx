import type { Metadata } from "next"
import Link from "next/link"
import { WorkGrid } from "@/components/galvelica/work-card"
import { listWorks, getPopularTags, type GalvelicaSort } from "@/lib/galvelica"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "作品档案 · Galvelica",
  description: "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。",
  alternates: { canonical: "/galvelica/works" },
}

type RawSP = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

const SORTS: { key: GalvelicaSort; label: string }[] = [
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
  const sort = (one(sp.sort) as GalvelicaSort) || "recent"
  const page = Math.max(1, parseInt(one(sp.page) || "1", 10) || 1)
  const tags = (one(sp.tags) || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  const [result, popularTags] = await Promise.all([
    listWorks({ tags, year, studio, search, sort, page }),
    getPopularTags(24),
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
    <div className="space-y-6">
      <div>
        <h1 className="galvelica-serif text-2xl font-semibold text-foreground">作品档案</h1>
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
      <form action="/galvelica/works" method="get" className="flex gap-2">
        <input type="hidden" name="tags" value={tags.join(",")} />
        {year && <input type="hidden" name="year" value={String(year)} />}
        {studio && <input type="hidden" name="studio" value={encodeURIComponent(studio)} />}
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
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
              <Link key={id} href={toggleTag(id)} className="galvelica-tag rounded-md px-2 py-1">
                #{t?.name ?? id} ✕
              </Link>
            )
          })}
        </div>
      )}

      {/* 结果 */}
      <WorkGrid works={result.items} priorityCount={5} />

      {/* 分页 */}
      {result.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          {result.page > 1 ? (
            <Link href={makeHref({ page: String(result.page - 1) })} className="galvelica-navlink rounded-lg px-4 py-2 text-sm font-medium">
              ← 上一页
            </Link>
          ) : (
            <span className="rounded-lg px-4 py-2 text-sm text-muted-foreground/40">← 上一页</span>
          )}
          <span className="text-sm tabular-nums text-muted-foreground">
            {result.page} / {result.totalPages}
          </span>
          {result.page < result.totalPages ? (
            <Link href={makeHref({ page: String(result.page + 1) })} className="galvelica-navlink rounded-lg px-4 py-2 text-sm font-medium">
              下一页 →
            </Link>
          ) : (
            <span className="rounded-lg px-4 py-2 text-sm text-muted-foreground/40">下一页 →</span>
          )}
        </div>
      )}
    </div>
  )
}
