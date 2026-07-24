import { AnnounceSwiper } from "@/components/announce-swiper"
import { GameCardSkeleton } from "@/components/game-card"
import { GameGridClient } from "@/components/game-grid-client"
import { RandomCharacterBtn, RandomCreatorBtn } from "@/components/random-discover-btns"
import { buildGameSearchFilter } from "@/lib/filters"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { getSiteSetting, getSiteName, getSiteDescription } from "@/lib/site-settings"
import { toShanghaiDate } from "@/lib/date"
import { Suspense } from "react"

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

// 全局去重 Map 单例：跨请求防止缓存 miss 时并发重复查询；存于 globalThis 以在 dev HMR 期间持久化。
// 仅在模块顶层初始化 globalThis（react-hooks/immutability 不允许在组件/钩子内重赋值外部绑定），
// 运行期内只通过 Map.get/set/delete 变更，不重赋值外部变量。
const PENDING_HOLDER_KEY = "__circleica_homepage_stats_pending"
const globalRef = globalThis as Record<string, unknown>
const PENDING_HOLDER: { map: StatsPending } =
  (globalRef[PENDING_HOLDER_KEY] as { map: StatsPending } | undefined) ?? { map: new Map() }
if (!globalRef[PENDING_HOLDER_KEY]) globalRef[PENDING_HOLDER_KEY] = PENDING_HOLDER

export const revalidate = 60

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

type SortKey = "newest" | "popular" | "mostFaved"
type ViewKey = "grid" | "list"

const ORDER_BY: Record<SortKey, { createdAt?: "desc"; viewCount?: "desc"; favoriteCount?: "desc" }> = {
  newest: { createdAt: "desc" },
  popular: { viewCount: "desc" },
  mostFaved: { favoriteCount: "desc" },
}

async function GameGridServer({ tag, q, nsfw, sort = "newest", view = "grid", page }: { tag: string; q: string; nsfw: boolean; sort?: SortKey; view?: ViewKey; page: number }) {
  const where = buildGameSearchFilter({ q, tag, nsfw })
  const GAMES_PER_PAGE = 24
  const skip = (page - 1) * GAMES_PER_PAGE

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: ORDER_BY[sort],
      skip,
      take: GAMES_PER_PAGE,
      select: GAME_CARD_SELECT,
    }),
    prisma.game.count({ where }),
  ]).catch((err) => {
    logger.db.error("[HomePage] Game query failed", err)
    return [[], 0] as [never[], number]
  })

  if (!games.length) {
    return <GameGridClient initialGames={[]} total={0} tag={tag} q={q} nsfw={nsfw} page={page} sort={sort} view={view} />
  }

  const placeholder = await getSiteSetting("default_placeholder_image")

  // 获取"首页卡片标签"组的颜色（站点可配置，未配置则回退默认灰）
  let cardTagColor = "#6b7280"
  try {
    const homeCardTag = await prisma.tagGroup.findFirst({
      where: { positions: { array_contains: ["home_card"] } },
      select: { color: true },
    })
    if (homeCardTag?.color) cardTagColor = homeCardTag.color
  } catch (err) { logger.db.warn("[HomePage] cardTagColor query failed", { error: err instanceof Error ? err.message : String(err) }) }

  const mapped = games.map((g) => mapGameToCard(g, { resourceTagColor: cardTagColor, coverFallback: placeholder }))

  return <GameGridClient initialGames={mapped} total={total} tag={tag} q={q} nsfw={nsfw} page={page} sort={sort} view={view} />
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; nsfw?: string; sort?: string; view?: string; page?: string }>
}) {
  const sp        = await searchParams
  const q         = sp.q?.trim() || ""
  const activeTag = sp.tag || "全部"
  const nsfw      = sp.nsfw === "1"
  const VALID_SORTS = ["newest", "popular", "mostFaved"] as const
  const sort = VALID_SORTS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest"
  const VALID_VIEWS = ["grid", "list"] as const
  const view = VALID_VIEWS.includes(sp.view as ViewKey) ? (sp.view as ViewKey) : "grid"
  const page      = Math.max(1, parseInt(sp.page || "1"))

  let total = 0
  let todayCheckins = 0
  let weekNewGames = 0
  let announcements: HomeAnnouncement[] = []

  // 获取站点品牌信息
  const [siteName, siteDesc] = await Promise.all([getSiteName(), getSiteDescription()])

  // 统计数据缓存 key（按日期和 nsfw 状态区分）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateStr = toShanghaiDate(today)
  const statsCacheKey = cacheKey("homepage:stats", dateStr, nsfw ? "1" : "0")

  // 全局去重 Map（模块级单例，跨 HMR 持久化于 globalThis），防止并发请求同时 miss 缓存
  const pendingMap = PENDING_HOLDER.map

  try {
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // 尝试从缓存获取统计数据（TTL 5 分钟）
    const cached = await cache.get<{ total: number; todayCheckins: number; weekNewGames: number; announcements: HomeAnnouncement[] }>(statsCacheKey)
    if (cached) {
      ;({ total, todayCheckins, weekNewGames } = cached)
      announcements = cached.announcements
    } else {
      // 检查是否有正在进行的请求
      let pending = pendingMap.get(statsCacheKey)
      if (!pending) {
        // 发起新请求
        pending = Promise.all([
          prisma.game.count({ where: { isPublished: true, ...(nsfw ? {} : { isNsfw: false }) } }),
          prisma.checkIn.count({ where: { createdAt: { gte: today } } }),
          prisma.game.count({ where: { isPublished: true, createdAt: { gte: weekAgo } } }),
          prisma.announcement.findMany({
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
          }).then((anns) => anns.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))),
        ]).finally(() => {
          pendingMap.delete(statsCacheKey)
        })
        pendingMap.set(statsCacheKey, pending)
      }
      const [totalResult, todayCheckinsResult, weekNewGamesResult, announcementsResult] = await pending!
      total = totalResult
      todayCheckins = todayCheckinsResult
      weekNewGames = weekNewGamesResult
      announcements = announcementsResult
      // 缓存 5 分钟
      await cache.set(statsCacheKey, { total, todayCheckins, weekNewGames, announcements }, 300)
    }
  } catch (error) {
    logger.db.error("[HomePage] Database query failed (离线回退空数据)", error)
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pt-4">
      <h1 className="sr-only">{siteName} · 资源大厅</h1>

      {/* Hero + 手机端随机按钮 — 紧密组合 */}
      <div className="flex flex-col gap-4 sm:gap-5">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 items-start">
          {/* 品牌卡 - 桌面端：站点概览（资源站风格，非海报式） */}
          <div className="hidden md:flex rounded-2xl bg-card ring-1 ring-border overflow-hidden h-[310px] flex-col">
            <div className="flex flex-col flex-1 px-6 py-8 justify-between">
              <div>
                <p className="text-xs font-medium tracking-[0.2em] text-[var(--clr-blue)] uppercase">视觉小说 · 同人 · 资源</p>
                <h2 className="mt-3 text-4xl font-bold text-foreground tracking-tight leading-tight">{siteName}</h2>
                <p className="mt-2 text-base text-muted-foreground">{siteDesc || "GalGame 同人世界的一站式入口"}</p>
              </div>
              {/* 统计行 */}
              <div className="flex gap-6">
                <div>
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{total}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">个游戏</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{weekNewGames}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">本周新增</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{todayCheckins}</p>
                  <p className="mt-1.5 text-sm text-muted-foreground">今日签到</p>
                </div>
              </div>
              {/* 按钮行 */}
              <div className="flex gap-2">
                <RandomCreatorBtn />
                <RandomCharacterBtn />
              </div>
            </div>
          </div>

          {/* 公告区 */}
          {announcements.length > 0 && (
            <AnnounceSwiper announcements={announcements} />
          )}
        </div>

        {/* 手机端：随机发现按钮 */}
        <div className="flex md:hidden gap-2">
          <div className="flex-1"><RandomCreatorBtn fullWidth /></div>
          <div className="flex-1"><RandomCharacterBtn fullWidth /></div>
        </div>
      </div>

      {/* 游戏网格 */}
      <section>
          <div className="mb-4 sm:mb-5">
            <div className="flex items-end justify-between border-b border-border pb-3">
              <div>
                <p className="mb-1 text-xs font-medium tracking-[0.18em] text-[var(--clr-blue)] uppercase">资源大厅</p>
                <h2 className="text-lg font-semibold tracking-wide text-foreground">
                  {q ? `「${q}」的搜索结果` : activeTag === "全部" ? "最新资源" : `# ${activeTag}`}
                </h2>
              </div>
            </div>
          </div>
        <Suspense fallback={<GameGridSkeleton />}>
          <GameGridServer tag={activeTag} q={q} nsfw={nsfw} sort={sort} view={view} page={page} />
        </Suspense>
      </section>

    </div>
  )
}
