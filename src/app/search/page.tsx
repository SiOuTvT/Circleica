import { GameCard, GameCardSkeleton, GameListRow, GameListRowSkeleton } from "@/components/game-card"
import { ResultToolbar, GAME_SORT_OPTIONS } from "@/components/result-toolbar"
import { Pagination } from "@/components/ui/pagination"
import { SearchBar } from "@/components/search-bar"
import Link from "next/link"
import { logger } from "@/lib/logger"
import type { Metadata } from "next"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; view?: string }>
}): Promise<Metadata> {
  const sp = await searchParams
  const q = sp.q?.trim()
  const tag = sp.tag?.trim()
  const title = q ? `搜索「${q}」` : tag ? `标签 #${tag}` : "搜索"
  const canonical = q
    ? `/search?q=${encodeURIComponent(q)}`
    : tag
      ? `/search?tag=${encodeURIComponent(tag)}`
      : "/search"
  const description = q
    ? `搜索同人游戏、Galgame、视觉小说资源，关键词「${q}」的查找结果`
    : "搜索同人游戏、Galgame、视觉小说资源，按名称、标签、原作查找"
  return {
    title,
    description,
    openGraph: { title: `${title} · Circleica`, description, images: ["/opengraph-image"] },
    alternates: { canonical },
  }
}
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { unstable_cache } from "next/cache"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import { getGameNsfwModeFilter } from "@/lib/filters"
import { Flame, Library, Search } from "lucide-react"
import { Suspense } from "react"

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

type SortKey = "newest" | "popular" | "mostFaved"
type ViewKey = "grid" | "list"

function parseDlLinks(raw: unknown): { label?: string; url: string; platform?: string }[] {
  if (Array.isArray(raw)) return raw as { label?: string; url: string; platform?: string }[]
  if (typeof raw === "string") {
    try { const p = JSON.parse(raw); return Array.isArray(p) ? p : [] } catch { return [] }
  }
  return []
}

// 缓存搜索结果查询（2 分钟）- 缩短缓存时间以提高搜索结果新鲜度
// ⚠️ NSFW 模式进 unstable_cache 参数（自动进 key），否则跨用户泄漏
const getCachedSearchResults = unstable_cache(
  async (q: string, tag: string, sort: SortKey, mode: MainNsfwMode, page: number, limit: number) => {
    const where = {
      isPublished: true,
      ...getGameNsfwModeFilter(mode),
      ...(q && {
        OR: [
          { searchVector: { search: q } },
          { tags: { some: { tag: { name: { contains: q, mode: "insensitive" as const } } } } },
        ],
      }),
      ...(tag && { tags: { some: { tag: { name: { contains: tag, mode: "insensitive" as const } } } } }),
    } as Prisma.GameWhereInput

    const skip = (page - 1) * limit

    const orderBy: Prisma.GameOrderByWithRelationInput = {
      newest: { createdAt: "desc" as const },
      popular: { viewCount: "desc" as const },
      mostFaved: { favoriteCount: "desc" as const },
    }[sort]

    const [gamesResult, countResult] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy,
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

    return { games: gamesResult, total: countResult }
  },
  ["search-results"],
  { revalidate: 120 } // 2 分钟缓存
)

// 缓存推荐游戏查询（10 分钟）
const getCachedRecommendedGames = unstable_cache(
  async (mode: MainNsfwMode) => {
    const rawRecommended = await prisma.game.findMany({
      where: { isPublished: true, ...getGameNsfwModeFilter(mode) },
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
    return rawRecommended
  },
  ["recommended-games"],
  { revalidate: 600 } // 10 分钟缓存
)

async function SearchResults({
  q, tag, sort, nsfwMode, view, page = 1,
}: {
  q: string; tag: string; sort: SortKey; nsfwMode: MainNsfwMode; view?: ViewKey; page?: number
}) {
  // 没有搜索词和标签时显示推荐游戏
  if (!q && !tag) {
    const recommended = await getCachedRecommendedGames(nsfwMode)
    if (!recommended.length) return null
    const games = recommended.map((g) => ({
      ...g,
      coverImage: g.coverImage ?? "",
      downloadLinks: parseDlLinks(g.downloadLinks),
      tags: g.tags.map((t) => t.tag),
    }))
    return (
      <>
        <p className="mb-4 text-xs text-muted-foreground flex items-center gap-1.5"><Flame className="h-3.5 w-3.5" strokeWidth={2} /> 热门推荐</p>
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 items-stretch">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>
      </>
    )
  }

  const limit = 24
  let rawGames: GameWithTag[] = []
  let total = 0
  try {
    const result = await getCachedSearchResults(q, tag, sort, nsfwMode, page, limit)
    rawGames = result.games as GameWithTag[]
    total = result.total
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
      rawRecommended = await getCachedRecommendedGames(nsfwMode)
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
      <div className="py-8 sm:py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
          <Search className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
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
        {q && (
          <Link
            href={`/galvelica/works?search=${encodeURIComponent(q)}`}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[color-mix(in_srgb,var(--gal-accent)_12%,transparent)] px-4 py-2.5 text-sm font-semibold text-[var(--gal-accent)] ring-1 ring-[color-mix(in_srgb,var(--gal-accent)_28%,transparent)] transition-all hover:bg-[color-mix(in_srgb,var(--gal-accent)_22%,transparent)]"
            title="本站在副站资料库中查找该作品"
          >
            <Library className="h-4 w-4" />
            在副站资料库中查找
          </Link>
        )}
        {recommended.length > 0 && (
          <div className="mt-8 text-left">
            <h3 className="mb-3 text-sm font-semibold text-foreground flex items-center gap-1.5"><Flame className="h-4 w-4" strokeWidth={2} /> 热门推荐</h3>
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

  const resultLabel = q ? "搜索结果" : tag ? "标签结果" : "全部游戏"
  // NSFW 模式由 cookie 决定（服务端解析），不再写入 URL —— 避免 URL 参数绕过登录门槛切换过滤
  const activeFilters = [
    ...(q
      ? [{ key: "q", label: `"${q}"`, basePath: "/search", clearParams: { ...(tag && { tag }) } }]
      : []),
    ...(tag
      ? [{ key: "tag", label: `#${tag}`, basePath: "/search", clearParams: { ...(q && { q }) } }]
      : []),
  ]

  return (
    <>
      <ResultToolbar
        total={total}
        resultLabel={resultLabel}
        sort={sort}
        sortOptions={GAME_SORT_OPTIONS}
        basePath="/search"
        params={{ ...(q && { q }), ...(tag && { tag }) }}
        view={view ?? "grid"}
        activeFilters={activeFilters}
      />
      <div className="mt-4">
        {view === "list" ? (
          <div className="flex flex-col gap-2">
            {games.map((game) => (
              <GameListRow key={game.id} game={game} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 items-stretch">
            {games.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
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
              ...(view && view !== "grid" && { view }),
            }}
          />
        </div>
      )}
    </>
  )
}

function ResultsSkeleton({ view = "grid" }: { view?: ViewKey }) {
  if (view === "list") {
    return (
      <div className="mt-4 flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => <GameListRowSkeleton key={i} />)}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 md:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; view?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() ?? ""
  const tag = sp.tag?.trim() ?? ""
  const VALID_SORTS: SortKey[] = ["newest", "popular", "mostFaved"]
  const sort = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest"
  const VALID_VIEWS: ViewKey[] = ["grid", "list"]
  const view = VALID_VIEWS.includes(sp.view as ViewKey) ? (sp.view as ViewKey) : undefined
  // NSFW 过滤模式：服务端按 cookie 解析（nsfw_mode，兼容旧 nsfw_status），不再读 URL 参数
  const nsfwMode = await getMainNsfwMode()
  const page = Math.max(1, parseInt(sp.page || "1"))

  return (
    <div className="space-y-5">
      {/* 搜索框 */}
      <SearchBar defaultValue={q} />

      {/* 结果（工具栏含排序 / 视图 / 计数 / 筛选 chips） */}
      <Suspense fallback={<ResultsSkeleton view={view} />}>
        <SearchResults q={q} tag={tag} sort={sort} nsfwMode={nsfwMode} view={view} page={page} />
      </Suspense>
    </div>
  )
}
