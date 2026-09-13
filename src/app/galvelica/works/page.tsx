import type { Metadata } from "next"
import Link from "next/link"
import { cache as reactCache } from "react"
import { WorkGrid } from "@/components/galvelica/work-card"
import { Pager } from "@/components/galvelica/pager"
import { GalvelicaSearch } from "@/components/galvelica/galvelica-search"
import { listWorks, getPopularTags, getNsfwMode, getStaffBrief, type GalvelicaSort } from "@/lib/galvelica"
import { cached, cacheKey } from "@/lib/redis"

export const dynamic = "force-dynamic"

type RawSP = Record<string, string | string[] | undefined>

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

/** 同一请求内去重：generateMetadata 与页面渲染共用一次查询 */
const staffNameOf = reactCache(async (id: string) => {
  const [b] = await getStaffBrief([id])
  return b?.name ?? null
})

/** 页头主体：title / og:title / twitter:title 与 h1 共用同一字符串 */
async function headingOf(sp: RawSP): Promise<{ staff?: string; person: string | null; heading: string }> {
  const staff = one(sp.staff)?.trim() || undefined
  if (!staff) return { person: null, heading: "作品库" }
  const name = await staffNameOf(staff)
  // 查无此人时也保持文案明确，且 title 与 h1 仍是同一个字符串
  const person = name ?? "该制作人员"
  return { staff, person, heading: `${person} 参与的作品` }
}

const SORTS: { key: GalvelicaSort; label: string }[] = [
  { key: "recommended", label: "推荐" },
  { key: "recent", label: "最近" },
  { key: "popular", label: "热门" },
  { key: "views", label: "浏览" },
  { key: "title", label: "名称" },
  { key: "year", label: "年份" },
]

export async function generateMetadata({ searchParams }: { searchParams: Promise<RawSP> }): Promise<Metadata> {
  const sp = await searchParams
  const { staff, person, heading } = await headingOf(sp)
  const description = person
    ? `浏览 Galvelica 中 ${person} 参与的同人视觉小说作品。`
    : "浏览 Galvelica 资料库中的同人视觉小说作品，支持按标签、年份、社团与关键词筛选。"
  return {
    title: heading,
    description,
    alternates: {
      canonical: staff ? `/galvelica/works?staff=${encodeURIComponent(staff)}` : "/galvelica/works",
    },
    openGraph: {
      type: "website",
      locale: "zh_CN",
      siteName: "Galvelica",
      title: heading,
      description,
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title: heading,
      description,
      images: ["/opengraph-image"],
    },
  }
}

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

  const { staff, heading } = await headingOf(sp)

  // 列表与热门标签走缓存（force-dynamic 下避免每次导航全打库）。
  // 列表按完整筛选条件做 key；⚠️ NSFW 过滤模式必须进 key（防跨用户缓存泄漏）。
  const nsfwMode = await getNsfwMode()
  const [result, popularTags] = await Promise.all([
    cached(
      cacheKey(
        "galvelica:works",
        JSON.stringify({ tags, year, studio, search, staff, sort, page, mode: nsfwMode }),
      ),
      () => listWorks({ tags, year, studio, search, staff, sort, page }),
      60,
    ),
    cached(cacheKey("galvelica:popularTags", 12), () => getPopularTags(12), 300),
  ])

  // 当前筛选状态（用于构造链接）
  const state: Record<string, string | undefined> = {
    search,
    year: year ? String(year) : undefined,
    studio: studio ? encodeURIComponent(studio) : undefined,
    staff,
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

  const hasFilters = !!(search || year || studio || staff || tags.length)

  return (
    <div className="space-y-8">
      <div>
        <p className="galvelica-fs-eyebrow font-medium uppercase tracking-[0.28em] text-[var(--gal-accent)]">GALVELICA 作品库</p>
        <h1 className="galvelica-h1 mt-2">{heading}</h1>
        <p className="mt-1 galvelica-fs-meta text-muted-foreground">共 {result.total} 部作品</p>
      </div>

      {/* 搜索 */}
      <GalvelicaSearch
        className="flex gap-2"
        defaultValue={search ?? ""}
        hiddenFields={{
          tags: tags.join(",") || undefined,
          year: year ? String(year) : undefined,
          studio: studio ? encodeURIComponent(studio) : undefined,
          staff,
        }}
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

      {/* 结果：命中制作人员筛选但查无结果时给明确空态，不留空白列表区 */}
      {result.items.length === 0 ? (
        <p className="py-10 text-center galvelica-fs-meta text-muted-foreground">
          {staff ? `${heading}暂未收录，可清除筛选查看全部作品。` : "暂无收录的作品。"}
        </p>
      ) : (
        <WorkGrid works={result.items} priorityCount={5} desc />
      )}

      {/* 分页 */}
      <Pager
        basePath="/galvelica/works"
        query={{ search, year: year ? String(year) : undefined, studio: studio ? encodeURIComponent(studio) : undefined, staff, sort, tags: tags.join(",") || undefined }}
        page={result.page}
        totalPages={result.totalPages}
      />
    </div>
  )
}
