import { GameCard, GameCardSlot } from "@/components/game-card"
import { Suspense } from "react"
import { HomeAnnounceBar, buildActivities, type ActivityItem, type StatItem } from "@/components/home-announce-bar"
import { HomeRandomDiscover } from "@/components/home-random-discover"
import Link from "next/link"
import { buildGameSearchFilter } from "@/lib/filters"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { getSiteName, getSiteDescription, getSiteSetting } from "@/lib/site-settings"

type HomeAnnouncement = {
  id: string
  title: string
  summary: string
  content: string
  imageUrl: string
  link: string
  createdAt: string
  authorName: string
  authorAvatar: string
  isPinned: boolean
}

type StatsPending = Map<string, Promise<[number, number, number, HomeAnnouncement[]]>>
type CachedGrid = { games: ReturnType<typeof mapGameToCard>[]; total: number }
type GridPending = Map<string, Promise<CachedGrid>>

const PENDING_HOLDER_KEY = "__circleica_homepage_stats_pending"
const globalRef = globalThis as Record<string, unknown>
const PENDING_HOLDER: { map: StatsPending } =
  (globalRef[PENDING_HOLDER_KEY] as { map: StatsPending } | undefined) ?? { map: new Map() }
if (!globalRef[PENDING_HOLDER_KEY]) globalRef[PENDING_HOLDER_KEY] = PENDING_HOLDER

const GRID_PENDING_KEY = "__circleica_homepage_grid_pending"
const GRID_PENDING: { map: GridPending } =
  (globalRef[GRID_PENDING_KEY] as { map: GridPending } | undefined) ?? { map: new Map() }
if (!globalRef[GRID_PENDING_KEY]) globalRef[GRID_PENDING_KEY] = GRID_PENDING

export const revalidate = 60

// ─── Announcement fallback ────────────────────────────────────

function GameGridSlots() {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSlot key={i} />)}
    </div>
  )
}

// ─── Game grid data fetching (unchanged logic) ─────────────────

type SortKey = "newest" | "popular" | "mostFaved"

const ORDER_BY: Record<SortKey, { createdAt?: "desc"; viewCount?: "desc"; favoriteCount?: "desc" }> = {
  newest: { createdAt: "desc" },
  popular: { viewCount: "desc" },
  mostFaved: { favoriteCount: "desc" },
}

async function GameGridServer({ tag, q, mode, sort = "newest", page }: { tag: string; q: string; mode: MainNsfwMode; sort?: SortKey; page: number }) {
  const where = buildGameSearchFilter({ q, tag, mode })
  const GAMES_PER_PAGE = 24
  const skip = (page - 1) * GAMES_PER_PAGE

  const gridCacheKey = cacheKey("homepage:games:grid", tag, q, mode, sort, String(page))
  const pendingMap = GRID_PENDING.map

  let gridData: CachedGrid
  try {
    const cached = await cache.get<CachedGrid>(gridCacheKey)
    if (cached) {
      gridData = cached
    } else {
      let pending = pendingMap.get(gridCacheKey)
      if (!pending) {
        pending = (async () => {
          const [games, total] = await Promise.all([
            prisma.game.findMany({
              where,
              orderBy: ORDER_BY[sort],
              skip,
              take: GAMES_PER_PAGE,
              select: GAME_CARD_SELECT,
            }),
            prisma.game.count({ where }),
          ])
          if (!games.length) return { games: [], total } as CachedGrid

          const placeholder = await getSiteSetting("default_placeholder_image")

          let cardTagColor = "#6b7280"
          try {
            const homeCardTag = await prisma.tagGroup.findFirst({
              where: { id: "preset_home_card" },
              select: { color: true },
            })
            if (homeCardTag?.color) cardTagColor = homeCardTag.color
          } catch {}

          return {
            games: games.map((g) => mapGameToCard(g, { resourceTagColor: cardTagColor, coverFallback: placeholder })),
            total,
          } as CachedGrid
        })().finally(() => {
          pendingMap.delete(gridCacheKey)
        })
        pendingMap.set(gridCacheKey, pending)
      }
      gridData = await pending!
      await cache.set(gridCacheKey, gridData, 60).catch(() => {})
    }
  } catch (err) {
    logger.db.error("[HomePage] Game query failed", err)
    gridData = { games: [], total: 0 }
  }

  return gridData
}

// ─── Activity data builder ─────────────────────────────────────

function buildHomeActivities(
  announcements: HomeAnnouncement[],
  recentGames: { id: string; title: string; createdAt: Date }[],
  updatedGames: { id: string; title: string; updatedAt: Date }[],
): ActivityItem[] {
  const items: ActivityItem[] = []

  // 公告动态
  for (const a of announcements.slice(0, 3)) {
    items.push({
      id: `ann-${a.id}`,
      type: "announcement",
      title: a.title,
      time: a.createdAt,
      username: a.authorName || "Circleica",
    })
  }

  // 新游戏上架
  for (const g of recentGames.slice(0, 5)) {
    items.push({
      id: `new-${g.id}`,
      type: "game_added",
      title: `《${g.title}》上架`,
      time: g.createdAt.toISOString(),
    })
  }

  // 游戏更新
  for (const g of updatedGames.slice(0, 3)) {
    items.push({
      id: `upd-${g.id}`,
      type: "game_updated",
      title: `《${g.title}》有更新`,
      time: g.updatedAt.toISOString(),
    })
  }

  // 按时间排序
  items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())

  return items.slice(0, 15)
}

// ─── Page ──────────────────────────────────────────────────────

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; sort?: string; view?: string; page?: string }>
}) {
  const sp = await searchParams
  const q = sp.q?.trim() || ""
  const activeTag = sp.tag || "全部"
  const nsfwMode = await getMainNsfwMode()
  const VALID_SORTS = ["newest", "popular", "mostFaved"] as const
  const sort = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest"
  const page = Math.max(1, parseInt(sp.page || "1"))

  // ── Fetch data in parallel ──────────────────────────────────
  const [siteName, siteDesc, gridData] = await Promise.all([
    getSiteName(),
    getSiteDescription(),
    GameGridServer({ tag: activeTag, q, mode: nsfwMode, sort, page }),
  ])

  // ── 统计数据（游戏总数 + 累计签到）──
  let totalGames = 0
  let totalCheckins = 0
  try {
    const [gameCount, checkinSum] = await Promise.all([
      prisma.game.count({ where: { isPublished: true } }),
      prisma.checkIn.aggregate({ _sum: { marks: true } }),
    ])
    totalGames = gameCount
    totalCheckins = checkinSum._sum.marks ?? 0
  } catch {}

  const stats: StatItem[] = [
    { label: "游戏总数", value: totalGames },
    { label: "累计签到", value: totalCheckins },
  ]

  // Announcements (same query as before, inlined here)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let announcements: HomeAnnouncement[] = []
  try {
    const cached = await cache.get<{ announcements: HomeAnnouncement[] }>(cacheKey("homepage:announcements"))
    if (cached) {
      announcements = cached.announcements
    } else {
      const statsCacheKey = `homepage:stats:${nsfwMode}:${today.toISOString().slice(0, 10)}`
      const pending = PENDING_HOLDER.map.get(statsCacheKey)
      const annPromise = prisma.announcement.findMany({
        where: {
          status: "published",
          isActive: true,
          AND: [
            { OR: [{ startAt: null }, { startAt: { lte: new Date() } }] },
            { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
          ],
        },
        orderBy: [{ isPinned: "desc" }, { sortOrder: "asc" }],
        take: 5,
        select: { id: true, title: true, summary: true, content: true, imageUrl: true, link: true, createdAt: true, authorName: true, authorAvatar: true, isPinned: true },
      }).then((anns) => anns.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() })))

      announcements = await annPromise
      await cache.set(statsCacheKey, { announcements }, 300).catch(() => {})
    }
  } catch (error) {
    logger.db.error("[HomePage] Announcements query failed", error)
  }

  // ── 动态数据（有意义的内容动态）──
  let recentGames: { id: string; title: string; createdAt: Date }[] = []
  let updatedGames: { id: string; title: string; updatedAt: Date }[] = []
  try {
    const [newGames, upGames] = await Promise.all([
      prisma.game.findMany({
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.game.findMany({
        where: { isPublished: true },
        orderBy: { updatedAt: "desc" },
        take: 5,
        select: { id: true, title: true, updatedAt: true },
      }),
    ])
    recentGames = newGames
    updatedGames = upGames
  } catch {}

  const activities = buildHomeActivities(announcements, recentGames, updatedGames)
  const allGames = gridData.games

  return (
    <div className="flex flex-col gap-5 sm:gap-7 pt-4">
      <h1 className="sr-only">{siteName} · 资源大厅</h1>

      {/* ── Announcement + Activity + 数据行 ── */}
      <HomeAnnounceBar
        announcements={announcements}
        activities={activities}
        stats={stats}
        randomDiscover={<HomeRandomDiscover />}
        siteName={siteName}
      />

      {/* ── 最新资源入口 ── */}
      <Link href="/games" className="flex items-center gap-3 group">
        <h2 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">最新资源</h2>
        <span className="flex items-center gap-1 text-sm font-medium text-primary group-hover:text-primary/80 transition-colors">
          更多
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="transition-transform group-hover:translate-x-0.5">
            <path d="M5 12h14" />
            <path d="M12 5l7 7-7 7" />
          </svg>
        </span>
      </Link>

      {/* ── 游戏网格 ── */}
      {allGames.length > 0 ? (
        <section>
          <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
            {allGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
            {Array.from({ length: Math.max(0, 12 - allGames.length) }).map((_, i) => (
              <GameCardSlot key={`ph-${i}`} />
            ))}
          </div>
        </section>
      ) : (
        <section>
          <Suspense fallback={<GameGridSlots />}>
            <LegacyGameGrid games={gridData.games} total={gridData.total} tag={activeTag} q={q} page={page} sort={sort} />
          </Suspense>
        </section>
      )}
    </div>
  )
}

// ─── Legacy grid (only shown when track is empty) ──────────────

function LegacyGameGrid({ games, total, tag, q, page, sort }: { games: ReturnType<typeof mapGameToCard>[]; total: number; tag: string; q: string; page: number; sort: string }) {
  const isSearch = tag && tag !== "全部"
  const basePath = isSearch ? "/search" : "/"
  const totalPages = Math.ceil(total / 24)
  const placeholderCount = page === 1 ? Math.max(0, 12 - games.length) : 0
  const hasReal = games.length > 0

  if (!hasReal && placeholderCount === 0) return null

  return (
    <>
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
          {Array.from({ length: placeholderCount }).map((_, i) => (
            <GameCardSlot key={`ph-${i}`} />
          ))}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-8">
          {/* Pagination would go here - keeping minimal for legacy fallback */}
        </div>
      )}
    </>
  )
}
