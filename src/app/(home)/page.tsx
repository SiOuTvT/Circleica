import { AnnounceSwiper } from "@/components/announce-swiper"
import { ContributorsCard } from "@/components/contributors-card"
import { GameCardSlot } from "@/components/game-card"
import { CalendarCheck, Gamepad2, Megaphone, Plus } from "lucide-react"
import { GameGridClient } from "@/components/game-grid-client"
import { RandomCharacterBtn, RandomCreatorBtn } from "@/components/random-discover-btns"
import { buildGameSearchFilter } from "@/lib/filters"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { getSiteSetting, getSiteName, getSiteDescription } from "@/lib/site-settings"
import { homeStatsCacheKey } from "@/lib/home-stats"
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
/** 游戏网格缓存载荷（mapGameToCard 输出为纯可序列化数据，可进 Redis） */
type CachedGrid = { games: ReturnType<typeof mapGameToCard>[]; total: number }
type GridPending = Map<string, Promise<CachedGrid>>

// 全局去重 Map 单例：跨请求防止缓存 miss 时并发重复查询；存于 globalThis 以在 dev HMR 期间持久化。
// 仅在模块顶层初始化 globalThis（react-hooks/immutability 不允许在组件/钩子内重赋值外部绑定），
// 运行期内只通过 Map.get/set/delete 变更，不重赋值外部变量。
const PENDING_HOLDER_KEY = "__circleica_homepage_stats_pending"
const globalRef = globalThis as Record<string, unknown>
const PENDING_HOLDER: { map: StatsPending } =
  (globalRef[PENDING_HOLDER_KEY] as { map: StatsPending } | undefined) ?? { map: new Map() }
if (!globalRef[PENDING_HOLDER_KEY]) globalRef[PENDING_HOLDER_KEY] = PENDING_HOLDER

// 游戏网格单飞去重（与统计分属不同类型载荷，独立持有，避免类型互相污染）
const GRID_PENDING_KEY = "__circleica_homepage_grid_pending"
const GRID_PENDING: { map: GridPending } =
  (globalRef[GRID_PENDING_KEY] as { map: GridPending } | undefined) ?? { map: new Map() }
if (!globalRef[GRID_PENDING_KEY]) globalRef[GRID_PENDING_KEY] = GRID_PENDING

export const revalidate = 60

/**
 * 首页网格的 Suspense fallback —— 直接用常驻空槽，不用 shimmer 骨架。
 *
 * 理由：骨架的语义是「结构会变，内容在来」，但首页网格的结构恒定不变（加载中 12 格，
 * 加载完还是 12 格）。用骨架会制造「结构会变」的错误暗示，并引入一次 shimmer 停止的视觉切换。
 * 用空槽则网格从第一帧到最后一帧完全静止，只有内容就地填入。
 */
function GameGridSlots() {
  return (
    <div className="grid auto-rows-fr grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSlot key={i} />)}
    </div>
  )
}

/**
 * 公告区常驻空槽：无公告时常驻，与 AnnounceSwiper 同尺寸，有公告时覆盖。
 *
 * 与游戏卡空槽的差异（有意为之）：公告位是「单例大区块」（1 个，面积约单卡 6 倍），
 * 完全空白的 310px 会在视觉上塌陷、易被读成「这块坏了」，所以允许一个图标+文案锚点。
 * 游戏卡空槽是「重复小单元」（11 个），任何标记都会形成网点噪声，故零标记。
 *
 * 已移除的三样东西（勿加回）：
 * 1. dark: 前缀的渐变 —— 本项目 .dark 类是运行时脚本打的，SSR 首屏没有它，
 *    会导致首屏先渲染浅灰色再翻黑，在深色页面里闪一块 310px 浅灰板。一律用「深色为基础 + .light 覆盖」。
 * 2. 底部黑色遮罩 —— 它的唯一作用是让文字压在照片上可读；没照片时就是一条凭空暗带，像图片加载失败。
 * 3. skeleton-shimmer 假内容条 —— 骨架语言，且是动画源。
 */
function AnnounceSlot() {
  return (
    <div className="announce-slot relative flex w-full h-[200px] sm:h-[220px] lg:h-[310px] flex-col items-center justify-center gap-2.5 overflow-hidden rounded-2xl">
      <Megaphone className="announce-slot-mark h-8 w-8" strokeWidth={1} aria-hidden="true" />
      <p className="announce-slot-text text-sm">暂无公告</p>
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

  // 游戏网格 60s Redis 短缓存（与品牌区统计同源模式）：
  // 首页每次导航都全量查库（findMany + count + tagGroup + placeholder）是移动端慢的根因之一。
  // 短 TTL：后台发布/编辑游戏后最多 60s 内自动刷新，无需手动硬刷新。
  const gridCacheKey = cacheKey("homepage:games:grid", tag, q, nsfw ? "1" : "0", sort, String(page))
  const pendingMap = GRID_PENDING.map

  let gridData: CachedGrid
  try {
    const cached = await cache.get<CachedGrid>(gridCacheKey)
    if (cached) {
      gridData = cached
    } else {
      // 复用全局单飞去重：并发请求只查一次库，其余等同一 Promise
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

          // 获取"首页卡片标签"组的颜色（站点可配置，未配置则回退默认灰）
          let cardTagColor = "#6b7280"
          try {
            const homeCardTag = await prisma.tagGroup.findFirst({
              where: { positions: { array_contains: ["home_card"] } },
              select: { color: true },
            })
            if (homeCardTag?.color) cardTagColor = homeCardTag.color
          } catch (err) { logger.db.warn("[HomePage] cardTagColor query failed", { error: err instanceof Error ? err.message : String(err) }) }

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

  return <GameGridClient initialGames={gridData.games} total={gridData.total} tag={tag} q={q} nsfw={nsfw} page={page} sort={sort} view={view} />
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

  // 统计数据缓存 key（按日期和 nsfw 状态区分，与写操作侧 invalidateHomeStats 同源）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const statsCacheKey = homeStatsCacheKey(nsfw)

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
        // 首页品牌卡「三统计」口径（非显而易见，集中说明以免误读）：
        //   ① total        = 已发布游戏【总数】  （isPublished=true；非 NSFW 模式下再排除 isNsfw）
        //   ② weekNewGames = 「本周新增」= 已发布 且 createdAt 在最近 7 天内(now-7d) 的游戏数。
        //                    数的是「新上架/新发布的游戏」，不是新用户、新标签、也不是更新动作。
        //   ③ todayCheckins= 「今日签到」= 今天 checkIn 表新增的签到记录数。
        //   三者均带 5 分钟缓存（见下方 cache.set(…, 300)）；DB 不可达时走空数据兜底，绝不注入假数据。
        //   ⚠️ 当前主站 DB 无已发布游戏，线上三数均为 0（真数据，非 bug），发布后会自动增长。
        pending = Promise.all([
          prisma.game.count({ where: { isPublished: true, ...(nsfw ? {} : { isNsfw: false }) } }), // ① total：已发布游戏总数
          prisma.checkIn.count({ where: { createdAt: { gte: today } } }),                          // ③ todayCheckins：今日签到数
          prisma.game.count({ where: { isPublished: true, createdAt: { gte: weekAgo } } }),        // ② weekNewGames：本周新增（近 7 天新发布）

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
          <div className="hidden md:flex rounded-2xl bg-card ring-1 ring-border overflow-hidden h-[310px] flex-col brand-card-bg">
            <div className="flex flex-col flex-1 px-6 py-8 justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">视觉小说资源站</p>
                <h2 className="mt-3 text-[32px] font-semibold tracking-tight leading-tight text-foreground">{siteName}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground max-w-[30ch]">{siteDesc || "GalGame 与同人游戏的资源档案库"}</p>
              </div>
              {/* 统计行 */}
              <div className="grid grid-cols-3 divide-x divide-border">
                <div className="flex flex-col gap-2.5" title="已发布的游戏总数">
                  <Gamepad2 className="brand-stat-icon h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{total}</p>
                  <p className="text-sm text-muted-foreground">游戏总数</p>
                </div>
                <div className="flex flex-col gap-2.5 pl-6" title="近 7 天新上架的游戏">
                  <Plus className="brand-stat-icon h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{weekNewGames}</p>
                  <p className="text-sm text-muted-foreground">本周新增游戏</p>
                </div>
                <div className="flex flex-col gap-2.5 pl-6" title="今日新增的签到次数">
                  <CalendarCheck className="brand-stat-icon h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  <p className="text-3xl font-bold text-foreground leading-none tabular-nums">{todayCheckins}</p>
                  <p className="text-sm text-muted-foreground">今日签到</p>
                </div>
              </div>
              {/* 按钮行 */}
              <div className="flex gap-2">
                <RandomCreatorBtn />
                <RandomCharacterBtn />
              </div>
            </div>
          </div>

          {/* 公告区：有公告覆盖，无公告常驻占位卡 */}
          {announcements.length > 0 ? (
            <AnnounceSwiper announcements={announcements} />
          ) : (
            <AnnounceSlot />
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
                <p className="mb-1 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">资源大厅</p>
                <h2 className="text-lg font-semibold tracking-wide text-foreground">
                  {q ? `「${q}」的搜索结果` : activeTag === "全部" ? "最新资源" : `# ${activeTag}`}
                </h2>
              </div>
            </div>
          </div>
        <Suspense fallback={<GameGridSlots />}>
          <GameGridServer tag={activeTag} q={q} nsfw={nsfw} sort={sort} view={view} page={page} />
        </Suspense>
      </section>

      <ContributorsCard />

    </div>
  )
}
