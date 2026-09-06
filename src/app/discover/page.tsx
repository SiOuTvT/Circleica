import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { cached, cacheKey } from "@/lib/redis"
import type { Metadata } from "next"
import { CalendarDays, Clock, History } from "lucide-react"
import { auth } from "@/lib/auth"
import { getRecentViewIds } from "@/lib/view-history"
import { ArchiveHero } from "@/components/archive/archive-hero"
import { DiscoverySection } from "@/components/discover/section"
import { RecentlyViewed } from "@/components/discover/recently-viewed"
import { ForYou } from "@/components/discover/for-you"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { GameCard, type GameCardData } from "@/components/game-card"
import styles from "@/components/discover/discover-overrides.module.css"

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "发现",
    description: "接着看、看点精选、刷刷推荐——找到下一部想玩的作品",
    openGraph: {
      siteName: "Circleica",
      title: "发现",
      description: "探索同人游戏，发现更多好作品",
      images: ["/opengraph-image"],
    },
    alternates: { canonical: "/discover" },
  }
}

export const revalidate = 120

interface DiscoveryData {
  years: { year: number; count: number }[]
  popular: GameCardData[]
  recent: GameCardData[]
}

/**
 * 发现页数据：三大板块**各自独立降级**。
 *
 * 此前四个查询共用一个 Promise.all + 整体 catch，任意一个失败就整页返回 null。
 * 尤其年份聚合走的是 $queryRaw —— 它在数据库不可达时的行为是**抛错**
 * （与 model 方法返回空结果不同），于是一条非关键的可视化查询即可打空整个发现页，
 * 再叠加 `revalidate = 120` 把空页固化两分钟。
 *
 * 改为 allSettled 后：某块查询失败只会让该板块缺席，其余板块照常展示。
 */
async function getDiscoveryData(): Promise<DiscoveryData | null> {
  const settle = <T,>(r: PromiseSettledResult<T>, fallback: T, label: string): T => {
    if (r.status === "fulfilled") return r.value
    logger.db.warn(`[discover] ${label} 查询失败，该板块降级为空`, {
      error: r.reason instanceof Error ? r.reason.message : String(r.reason),
    })
    return fallback
  }

  try {
    // 发现页三大板块整体缓存 300s（热门/时间轴/最近上新数据不常变），single-flight 防并发击穿
    const [yearsR, popularR, recentR] = await cached(
      cacheKey("discover:all"),
      () => Promise.allSettled([
        prisma.$queryRaw<{ year: number; count: number }[]>`
          SELECT EXTRACT(YEAR FROM "releaseDate")::int AS year, COUNT(*)::int AS count
          FROM "Game"
          WHERE "isPublished" = true AND "isNsfw" = false AND "releaseDate" IS NOT NULL
          GROUP BY year
          ORDER BY year DESC
          LIMIT 12
        `,
        prisma.game.findMany({
          where: { isPublished: true, isNsfw: false },
          orderBy: { viewCount: "desc" },
          take: 12,
          select: GAME_CARD_SELECT,
        }),
        prisma.game.findMany({
          where: { isPublished: true, isNsfw: false, releaseDate: { not: null } },
          orderBy: { releaseDate: "desc" },
          take: 12,
          select: GAME_CARD_SELECT,
        }),
      ]),
      300,
    )

    const years = settle(yearsR, [] as { year: number; count: number }[], "发行年份聚合")
    const popular = settle(popularR, [], "热门作品")
    const recent = settle(recentR, [], "最近上新")

    // 三块全空 = 数据库整体不可用，交给上层渲染空态（绝不注入假数据）
    if (years.length === 0 && popular.length === 0 && recent.length === 0) {
      return null
    }

    // 发现页卡片标签颜色 = "发现页标签"预设组色（紫 #a78bfa），后台可改
    let discoverTagColor = "#a78bfa"
    try {
      const group = await prisma.tagGroup.findUnique({
        where: { id: "preset_discover" },
        select: { color: true },
      })
      if (group?.color) discoverTagColor = group.color
    } catch (err) { logger.db.warn("[discover] discoverTagColor query failed", { error: err instanceof Error ? err.message : String(err) }) }

    return {
      years: years.map((y) => ({ year: Number(y.year), count: Number(y.count) })),
      popular: popular.map((g) => mapGameToCard(g, { resourceTagColor: discoverTagColor })),
      recent: recent.map((g) => mapGameToCard(g, { resourceTagColor: discoverTagColor })),
    }
  } catch {
    // 数据库不可用（构建期/沙箱）：返回空，绝不注入假数据
    return null
  }
}

/** 发行日期格式化（最近上新板块只保留此一行元信息） */
function formatReleaseDate(d?: Date | string): string {
  if (!d) return ""
  const dt = typeof d === "string" ? new Date(d) : d
  if (Number.isNaN(dt.getTime())) return ""
  const y = dt.getFullYear()
  const m = String(dt.getMonth() + 1).padStart(2, "0")
  const day = String(dt.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export default async function DiscoverPage() {
  const data = await getDiscoveryData()
  const years = data?.years ?? []
  const recent = data?.recent ?? []
  const maxYear = years.length ? Math.max(...years.map((y) => y.count)) : 1

  // 继续浏览：服务端按当前登录用户读取真实浏览历史（每人各自独立）
  const session = await auth()
  const historyCards: GameCardData[] = []
  if (session?.user?.id) {
    const ids = await getRecentViewIds(session.user.id, "GAME", 12)
    if (ids.length) {
      const games = await prisma.game.findMany({
        where: { id: { in: ids }, isPublished: true },
        select: GAME_CARD_SELECT,
      })
      const map = new Map(games.map((g) => [g.id, mapGameToCard(g)]))
      historyCards.push(...ids.map((id) => map.get(id)).filter(Boolean).map((c) => c as GameCardData))
    }
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 页头（全站统一 ArchiveHero） */}
      <ArchiveHero
        variant="discover"
        eyebrow="discover"
        title="发现"
        lede="接着看、看点精选、刷刷推荐——找到下一部想玩的作品"
      />

      {/* 1. 接着看 */}
      <DiscoverySection title="继续浏览" description="你最近看过的作品" icon={History}>
        <RecentlyViewed initialCards={historyCards} />
      </DiscoverySection>

      {/* 2. 刷推荐（为你推荐） */}
      <ForYou popular={data?.popular ?? []} />

      {/* 3. 发行时间轴（自包含年份发行量可视化，不外链别的页面） */}
      <DiscoverySection title="发行时间轴" description="全站作品的年代分布" icon={CalendarDays}>
        {years.length > 0 ? (
          <div className="space-y-2.5">
            {years.map((y) => {
              const pct = Math.max(6, Math.round((y.count / maxYear) * 100))
              return (
                <div key={y.year} className="flex items-center gap-3">
                  <span className="w-12 shrink-0 text-sm tabular-nums text-muted-foreground">{y.year}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{y.count} 部</span>
                </div>
              )
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无年份数据</p>
        )}
      </DiscoverySection>

      {/* 4. 最近上新（真实内容、自包含，与 /games 完整浏览列表区分） */}
      <DiscoverySection title="最近上新" description="刚刚入库的作品" icon={Clock} actionHref="/games?sort=new" actionLabel="查看全部">
        {recent.length > 0 ? (
          <div className={`${styles.recent} grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6`}>
            {recent.map((g) => (
              <GameCard key={g.id} game={g} showTags={false} releaseDate={formatReleaseDate(g.createdAt)} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无新作</p>
        )}
      </DiscoverySection>
    </div>
  )
}
