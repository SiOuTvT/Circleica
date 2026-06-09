import { GameCard, GameCardSkeleton } from "@/components/game-card"
import { MobileSortDropdown } from "@/components/mobile-sort-dropdown"
import { Pagination } from "@/components/ui/pagination"
import { SearchBar } from "@/components/search-bar"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { Clock, Heart, TrendingUp, X } from "lucide-react"
import { unstable_cache } from "next/cache"
import Link from "next/link"
import { Suspense } from "react"

// 缓存标签查询（24 小时）
const getCachedDiscoverTags = unstable_cache(
  async () => {
    const discoverGroup = await prisma.tagGroup.findUnique({
      where: { id: "preset_discover" },
      select: { color: true },
    })
    const discoverColor = discoverGroup?.color || "#a78bfa"
    const rawTags = await prisma.tag.findMany({
      orderBy: { name: "asc" },
      include: { group: { select: { color: true } } },
    })
    return rawTags.map(t => ({ ...t, color: discoverColor }))
  },
  ["search-page-tags"],
  { revalidate: 86400, tags: ["tags"] }
)

type SortKey = "newest" | "popular" | "mostFaved"

interface GameWithTag {
  id: string
  serialId: number
  title: string
  coverImage: string | null
  status: string
  isNsfw: boolean
  favoriteCount: number
  viewCount: number
  downloadCount: number
  downloadLinks: unknown
  updatedAt: Date
  createdAt: Date
  tags: { tag: { name: string; color: string } }[]
}

const SORT_OPTIONS: { key: SortKey; label: string; icon: typeof Clock }[] = [
  { key: "newest", label: "最新", icon: Clock },
  { key: "popular", label: "最热", icon: TrendingUp },
  { key: "mostFaved", label: "最多收藏", icon: Heart },
]

const ORDER_MAP: Record<SortKey, object> = {
  newest: { createdAt: "desc" },
  popular: { viewCount: "desc" },
  mostFaved: { favoriteCount: "desc" },
}

function parseDlLinks(raw: unknown): { label?: string; url: string; platform?: string }[] {
  if (Array.isArray(raw)) return raw as { label?: string; url: string; platform?: string }[]
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

async function SearchResults({
  q, tag, sort, nsfw, page = 1,
}: {
  q: string; tag: string; sort: SortKey; nsfw: boolean; page?: number
}) {
  const where = {
    isPublished: true,
    ...(nsfw ? {} : { isNsfw: false }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { originalWork: { contains: q, mode: "insensitive" as const } },
        { englishName: { contains: q, mode: "insensitive" as const } },
        { aliases: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
      ],
    }),
    ...(tag && { tags: { some: { tag: { name: { contains: tag, mode: "insensitive" as const } } } } }),
  }

  const limit = 24
  const skip = (page - 1) * limit

  let rawGames: GameWithTag[] = []
  let total = 0
  try {
    const [gamesResult, countResult] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: ORDER_MAP[sort],
        skip,
        take: limit,
        select: {
          id: true, serialId: true, title: true, coverImage: true, status: true,
          isNsfw: true, favoriteCount: true, viewCount: true,
          downloadCount: true, downloadLinks: true,
          updatedAt: true, createdAt: true,
          tags: { select: { tag: { select: { name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
    ])
    rawGames = gamesResult
    total = countResult
  } catch (error) {
    logger.db.error("[SearchResults] Database query failed", error)
  }

  const totalPages = Math.ceil(total / limit)
  const games = rawGames.map((g) => ({
    ...g,
    coverImage: g.coverImage ?? "",
    downloadLinks: parseDlLinks(g.downloadLinks),
    tags: g.tags.map((t) => t.tag),
  }))

  // 无结果时推荐热门游戏
  if (!games.length) {
    let rawRecommended: GameWithTag[] = []
    try {
      rawRecommended = await prisma.game.findMany({
        where: { isPublished: true, ...(nsfw ? {} : { isNsfw: false }) },
        orderBy: { viewCount: "desc" },
        take: 8,
        select: {
          id: true, serialId: true, title: true, coverImage: true, status: true,
          isNsfw: true, favoriteCount: true, viewCount: true,
          downloadCount: true, downloadLinks: true,
          updatedAt: true, createdAt: true,
          tags: { select: { tag: { select: { name: true, color: true } } } },
        },
      })
    } catch (error) {
      logger.db.error("[SearchResults] Recommended games query failed", error)
    }

    const recommended = rawRecommended.map((g) => ({
      ...g,
      coverImage: g.coverImage ?? "",
      downloadLinks: parseDlLinks(g.downloadLinks),
      tags: g.tags.map((t) => t.tag),
    }))

    return (
      <div className="py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <span className="text-3xl">🔍</span>
        </div>
        <p className="text-sm font-medium text-foreground">
          {q ? `没有找到与「${q}」相关的游戏` : "没有符合条件的游戏"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          试试换个关键词，或浏览下方推荐
        </p>
        {q && (
          <Link href="/search" className="mt-3 inline-flex items-center rounded-lg px-4 py-2.5 text-sm text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground hover:ring-foreground/20">
            清除搜索条件
          </Link>
        )}
        {recommended.length > 0 && (
          <div className="mt-8 text-left">
            <h3 className="mb-3 text-sm font-semibold text-foreground">🔥 热门推荐</h3>
            <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 items-stretch">
              {recommended.map((game) => (
                <GameCard key={game.id} game={game} />
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <p className="mb-4 text-xs text-muted-foreground">找到 {total} 个结果~</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
        {games.map((game) => (
          <GameCard key={game.id} game={game} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            baseUrl="/search"
            extraParams={{
              ...(q && { q }),
              ...(tag && { tag }),
              ...(sort !== "newest" && { sort }),
              ...(nsfw && { nsfw: "1" }),
            }}
          />
        </div>
      )}
    </>
  )
}

function ResultsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; nsfw?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ""
  const tag = sp.tag?.trim() ?? ""
  const VALID_SORTS: SortKey[] = ["newest", "popular", "mostFaved"]
  const sort = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest"
  const nsfw = sp.nsfw === "1"
  const page = Math.max(1, parseInt(sp.page || "1"))

  const tags = await getCachedDiscoverTags()

  function buildHref(overrides: Record<string, string>) {
    const p = new URLSearchParams()
    if (q) p.set("q", q)
    if (tag) p.set("tag", tag)
    if (sort !== "newest") p.set("sort", sort)
    if (nsfw) p.set("nsfw", "1")
    Object.entries(overrides).forEach(([k, v]) => v ? p.set(k, v) : p.delete(k))
    const s = p.toString()
    return `/search${s ? `?${s}` : ""}`
  }

  return (
    <div className="space-y-5">
      {/* 搜索框 */}
      <SearchBar defaultValue={q} />

      {/* 标签筛选 - 横向滚动 */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        <Link
          href="/search"
          className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
            !tag ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
          }`}
        >
          全部
        </Link>
        {tags.map((t) => (
          <Link
            key={t.id}
            href={buildHref({ tag: t.name })}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              tag === t.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.name}
          </Link>
        ))}
      </div>

      {/* 当前筛选 + 排序 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            {q && tag
              ? `「${q}」· ${tag}`
              : q
              ? `「${q}」的搜索结果`
              : tag
              ? `# ${tag}`
              : "全部游戏"}
          </h2>
          {(q || tag || sort !== "newest" || nsfw) && (
            <Link href="/search" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3 w-3" strokeWidth={2} />
              清除
            </Link>
          )}
        </div>

        {/* 排序 */}
        <div className="hidden sm:flex items-center gap-1">
          {SORT_OPTIONS.map(({ key, label, icon: Icon }) => (
            <Link
              key={key}
              href={buildHref({ sort: key })}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                sort === key ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.5} />
              {label}
            </Link>
          ))}
        </div>
        <MobileSortDropdown
          currentSort={sort}
          options={SORT_OPTIONS.map(({ key, label }) => ({ key, label }))}
          basePath="/search"
          extraParams={{
            ...(q && { q }),
            ...(tag && { tag }),
            ...(nsfw && { nsfw: "1" }),
          }}
        />
      </div>

      {/* 结果 */}
      <Suspense fallback={<ResultsSkeleton />}>
        <SearchResults q={q} tag={tag} sort={sort} nsfw={nsfw} page={page} />
      </Suspense>
    </div>
  )
}
