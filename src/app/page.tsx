import { AnnounceSwiper } from "@/components/announce-swiper"
import { GameCardSkeleton } from "@/components/game-card"
import { GameGridClient } from "@/components/game-grid-client"
import { RandomCharacterBtn, RandomCreatorBtn } from "@/components/random-discover-btns"
import { buildGameSearchFilter } from "@/lib/filters"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { getSiteSetting } from "@/lib/site-settings"
import Link from "next/link"
import { Suspense } from "react"

export const revalidate = 60

function GameGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-5 sm:grid-cols-3 lg:grid-cols-4 items-stretch">
      {Array.from({ length: 12 }).map((_, i) => <GameCardSkeleton key={i} />)}
    </div>
  )
}

async function GameGridServer({ tag, q, nsfw, page }: { tag: string; q: string; nsfw: boolean; page: number }) {
  const where = buildGameSearchFilter({ q, tag, nsfw })
  const GAMES_PER_PAGE = 24
  const skip = (page - 1) * GAMES_PER_PAGE

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: GAMES_PER_PAGE,
      select: {
        id: true, serialId: true, title: true, coverImage: true, status: true,
        isNsfw: true, favoriteCount: true, viewCount: true,
        downloadCount: true, downloadLinks: true,
        updatedAt: true, createdAt: true,
        tags: { select: { tag: { select: { name: true, color: true } } } },
        resources: { select: { language: true, runType: true, resourceContent: true } },
      },
    }),
    prisma.game.count({ where }),
  ]).catch((err) => {
    logger.db.error("[HomePage] Game query failed", err)
    return [[], 0] as [any[], number]
  })

  if (!games.length) {
    return <GameGridClient initialGames={[]} total={0} tag={tag} q={q} nsfw={nsfw} page={page} />
  }

  const placeholder = await getSiteSetting("default_placeholder_image")

  // 获取"首页卡片标签"组的颜色
  let cardTagColor = "#6b7280"
  try {
    const homeCardTag = await prisma.tagGroup.findFirst({
      where: { positions: { contains: "home_card" } },
      select: { color: true },
    })
    if (homeCardTag?.color) cardTagColor = homeCardTag.color
  } catch {}

  const mapped = games.map((g) => {
    // downloadLinks 是 Json 类型，直接使用
    const downloadLinks: { label?: string; url: string; platform?: string }[] =
      Array.isArray(g.downloadLinks) ? g.downloadLinks as { label?: string; url: string; platform?: string }[] : []

    // 从资源中收集去重的 resourceTags（统一颜色）
    const seen = new Set<string>()
    const resourceTags: { name: string; color: string }[] = []
    for (const r of g.resources) {
      for (const field of [r.language, r.runType, r.resourceContent]) {
        try {
          const arr: string[] = Array.isArray(field) ? field as string[] : []
          for (const name of arr) {
            if (!seen.has(name)) {
              seen.add(name)
              resourceTags.push({ name, color: cardTagColor })
            }
          }
        } catch {}
      }
    }

    return {
      ...g,
      coverImage: g.coverImage || placeholder,
      tags: g.tags.map((t: { tag: { name: string; color: string } }) => t.tag),
      downloadLinks,
      resourceTags,
    }
  })

  return <GameGridClient initialGames={mapped} total={total} tag={tag} q={q} nsfw={nsfw} page={page} />
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tag?: string; nsfw?: string; page?: string }>
}) {
  const sp        = await searchParams
  const q         = sp.q?.trim() || ""
  const activeTag = sp.tag || "全部"
  const nsfw      = sp.nsfw === "1"
  const page      = Math.max(1, parseInt(sp.page || "1"))
  const GAMES_PER_PAGE = 24
  const skip      = (page - 1) * GAMES_PER_PAGE

  let total = 0
  let todayCheckins = 0
  let weekNewGames = 0
  let announcements: { id: string; title: string; content: string; imageUrl: string; link: string; createdAt: string; authorName: string; authorAvatar: string }[] = []
  let dbError = false

  // 统计数据缓存 key（按日期和 nsfw 状态区分）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateStr = today.toISOString().slice(0, 10)
  const statsCacheKey = cacheKey("homepage:stats", dateStr, nsfw ? "1" : "0")

  // 全局去重 Map，防止并发请求同时 miss 缓存
  const PENDING_KEY = "homepage:stats:pending"
  let pendingMap = (globalThis as Record<string, unknown>)[PENDING_KEY] as Map<string, Promise<[number, number, number, typeof announcements]>> | undefined
  if (!pendingMap) {
    pendingMap = new Map()
    ;(globalThis as Record<string, unknown>)[PENDING_KEY] = pendingMap
  }

  try {
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // 尝试从缓存获取统计数据（TTL 5 分钟）
    const cached = await cache.get<{ total: number; todayCheckins: number; weekNewGames: number; announcements: typeof announcements }>(statsCacheKey)
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
              isActive: true,
              AND: [
                { OR: [{ startAt: null }, { startAt: { lte: new Date() } }] },
                { OR: [{ endAt: null }, { endAt: { gte: new Date() } }] },
              ],
            },
            orderBy: { createdAt: "desc" },
            take: 5,
            select: { id: true, title: true, content: true, imageUrl: true, link: true, createdAt: true, authorName: true, authorAvatar: true },
          }).then((anns) => anns.map((a) => ({ ...a, createdAt: a.createdAt.toISOString() }))),
        ]).finally(() => {
          pendingMap!.delete(statsCacheKey)
        })
        pendingMap.set(statsCacheKey, pending)
      }
      const [totalResult, todayCheckinsResult, weekNewGamesResult, announcementsResult] = await pending
      total = totalResult
      todayCheckins = todayCheckinsResult
      weekNewGames = weekNewGamesResult
      announcements = announcementsResult
      // 缓存 5 分钟
      await cache.set(statsCacheKey, { total, todayCheckins, weekNewGames, announcements }, 300)
    }
  } catch (error) {
    logger.db.error("[HomePage] Database query failed", error)
    dbError = true
  }

  if (dbError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-lg text-muted-foreground">数据加载失败，请稍后重试</p>
        <Link href="/" className="text-sm text-primary hover:underline">刷新页面</Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 pt-4">
      <h1 className="sr-only">同人游戏站 · 资源大厅</h1>

      {/* Hero：品牌卡 + 公告 */}
      <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr] gap-5 mb-2 lg:mb-3 items-start">
        {/* 品牌卡 - 桌面端：完整卡片 */}
        <div className="hidden md:flex rounded-2xl bg-card ring-1 ring-border overflow-hidden h-[310px] flex-col">
          <div className="flex flex-col flex-1 px-7 py-8 justify-between">
            <div>
              <h2 className="text-4xl font-bold text-foreground tracking-tight leading-tight">同人游戏站</h2>
              <p className="text-base text-muted-foreground mt-2">GalGame 同人世界的一站式入口</p>
            </div>
            {/* 统计行 */}
            <div className="flex gap-6">
              <div>
                <p className="text-3xl font-bold text-foreground leading-none">{total}</p>
                <p className="text-sm text-muted-foreground mt-1.5">个游戏</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground leading-none">{weekNewGames}</p>
                <p className="text-sm text-muted-foreground mt-1.5">本周新增</p>
              </div>
              <div>
                <p className="text-3xl font-bold text-foreground leading-none">{todayCheckins}</p>
                <p className="text-sm text-muted-foreground mt-1.5">今日签到</p>
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

      {/* 游戏网格 */}
      <section>
        <div className="mb-3 sm:mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-wide text-foreground">
            {q ? `「${q}」的搜索结果` : activeTag === "全部" ? "最新资源" : `# ${activeTag}`}
          </h2>
          <span className="text-sm text-muted-foreground">{total} 个</span>
        </div>
        <Suspense fallback={<GameGridSkeleton />}>
          <GameGridServer tag={activeTag} q={q} nsfw={nsfw} page={page} />
        </Suspense>
      </section>

    </div>
  )
}
