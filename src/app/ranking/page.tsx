import type { Metadata } from "next"
import { unstable_cache } from "next/cache"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { getMainNsfwMode, type MainNsfwMode } from "@/lib/nsfw-mode"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { GameCard, GameListRow, type GameCardData } from "@/components/game-card"
import { cn } from "@/lib/utils"
import { ArchiveHero } from "@/components/archive/archive-hero"

export const metadata: Metadata = {
  title: "排行榜",
  description: "按收藏、浏览与评论查看热门作品排行",
}

type DimKey = "favorite" | "view" | "comment"
type ScopeKey = "month" | "3m" | "6m"

const DIMS: { key: DimKey; label: string }[] = [
  { key: "favorite", label: "收藏" },
  { key: "view", label: "浏览" },
  { key: "comment", label: "评论" },
]

const SCOPES: { key: ScopeKey; label: string }[] = [
  { key: "month", label: "本月" },
  { key: "3m", label: "近三月" },
  { key: "6m", label: "近半年" },
]

const VALID_DIMS: DimKey[] = ["favorite", "view", "comment"]
const VALID_SCOPES: ScopeKey[] = ["month", "3m", "6m"]

/** 时间范围起点（按相对窗口计算，最大不超过近半年） */
function scopeFromDate(scope: ScopeKey): Date {
  const now = new Date()
  if (scope === "month") return new Date(now.getFullYear(), now.getMonth(), 1)
  if (scope === "3m") {
    const d = new Date(now)
    d.setMonth(d.getMonth() - 3)
    return d
  }
  // 6m（默认）
  const d = new Date(now)
  d.setMonth(d.getMonth() - 6)
  return d
}

function fmtNum(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w"
  if (n >= 1000) return (n / 1000).toFixed(1) + "k"
  return String(n)
}

interface RankedItem {
  card: GameCardData
  label: string
  unit: string
}

interface RankResult {
  items: RankedItem[]
  /** 当前维度是否因窗口内无数据而回退到了累计榜 */
  fallback: boolean
}

/** 收藏榜：按 createdAt 落在窗口内（from 为 undefined 时取全站）的新增收藏条数排名 */
async function favItems(from: Date | undefined, nsfwMode: MainNsfwMode): Promise<RankedItem[]> {
  const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
  const grouped = await prisma.favorite.groupBy({
    by: ["gameId"],
    where: from
      ? { createdAt: { gte: from }, game: { isPublished: true, ...nsfwWhere } }
      : { game: { isPublished: true, ...nsfwWhere } },
    _count: { id: true },
    orderBy: { gameId: "desc" },
    take: 200,
  })
  const filtered = grouped.sort((a, b) => b._count.id - a._count.id).slice(0, 50)
  const ids = filtered.map((g) => g.gameId)
  const rows = await prisma.game.findMany({
    where: { id: { in: ids }, isPublished: true, ...nsfwWhere },
    select: GAME_CARD_SELECT,
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const items: RankedItem[] = []
  for (const g of filtered) {
    const row = byId.get(g.gameId)
    if (!row) continue
    items.push({ card: mapGameToCard(row), label: fmtNum(g._count.id), unit: "收藏" })
  }
  return items
}

/** 评论榜：按 createdAt 落在窗口内（from 为 undefined 时取全站）的新增评论条数排名（回复一并计入） */
async function commentItems(from: Date | undefined, nsfwMode: MainNsfwMode): Promise<RankedItem[]> {
  const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
  const grouped = await prisma.comment.groupBy({
    by: ["gameId"],
    where: from
      ? { createdAt: { gte: from }, game: { isPublished: true, ...nsfwWhere } }
      : { game: { isPublished: true, ...nsfwWhere } },
    _count: { id: true },
    orderBy: { gameId: "desc" },
    take: 200,
  })
  const filtered = grouped.sort((a, b) => b._count.id - a._count.id).slice(0, 50)
  const ids = filtered.map((g) => g.gameId)
  const rows = await prisma.game.findMany({
    where: { id: { in: ids }, isPublished: true, ...nsfwWhere },
    select: GAME_CARD_SELECT,
  })
  const byId = new Map(rows.map((r) => [r.id, r]))
  const items: RankedItem[] = []
  for (const g of filtered) {
    const row = byId.get(g.gameId)
    if (!row) continue
    items.push({ card: mapGameToCard(row), label: fmtNum(g._count.id), unit: "评论" })
  }
  return items
}

async function getRanked(dim: DimKey, scope: ScopeKey, nsfwMode: MainNsfwMode): Promise<RankResult> {
  // NSFW 三段过滤：sfw 排除露骨 / nsfw 只留露骨 / all 不过滤（cookie 模式，未登录强制 sfw）
  const nsfwWhere = nsfwMode === "sfw" ? { isNsfw: false } : nsfwMode === "nsfw" ? { isNsfw: true } : {}
  const from = scopeFromDate(scope)

  if (dim === "view") {
    // 浏览榜：库里没有按时间的浏览流水（Game.viewCount 是累计计数器，ViewHistory 每人对同一部作品只有一行），
    // 故不做时间筛选，直接按累计浏览量排名。
    const rows = await prisma.game.findMany({
      where: { isPublished: true, ...nsfwWhere },
      orderBy: { viewCount: "desc" },
      take: 50,
      select: GAME_CARD_SELECT,
    })
    return {
      items: rows.map((r) => ({ card: mapGameToCard(r), label: fmtNum(r.viewCount), unit: "浏览" })),
      fallback: false,
    }
  }

  if (dim === "favorite") {
    // 收藏榜：按新增收藏条数（行为时间）排名，不用 Game.favoriteCount 累计总数
    const windowItems = await favItems(from, nsfwMode)
    if (windowItems.length > 0) return { items: windowItems, fallback: false }
    // 窗口内无新增收藏 → 回退按累计收藏数排名
    const rows = await prisma.game.findMany({
      where: { isPublished: true, ...nsfwWhere },
      orderBy: { favoriteCount: "desc" },
      take: 50,
      select: GAME_CARD_SELECT,
    })
    return {
      items: rows.map((r) => ({ card: mapGameToCard(r), label: fmtNum(r.favoriteCount), unit: "收藏" })),
      fallback: true,
    }
  }

  // dim === "comment"：评论榜按新增评论条数（行为时间）排名，回复一并计入
  const windowItems = await commentItems(from, nsfwMode)
  if (windowItems.length > 0) return { items: windowItems, fallback: false }
  // 窗口内无新增评论 → 回退按累计评论数排名
  const rows = await prisma.game.findMany({
    where: { isPublished: true, ...nsfwWhere },
    orderBy: { comments: { _count: "desc" } },
    take: 50,
    select: { ...GAME_CARD_SELECT, _count: { select: { comments: true } } },
  })
  return {
    items: rows.map((r) => ({ card: mapGameToCard(r), label: fmtNum(r._count.comments), unit: "评论" })),
    fallback: true,
  }
}

async function getRankedCached(dim: DimKey, scope: ScopeKey, nsfwMode: MainNsfwMode): Promise<RankResult> {
  return unstable_cache(
    async () => getRanked(dim, scope, nsfwMode),
    ["ranking:v2", dim, scope, nsfwMode],
    { revalidate: 3600, tags: ["ranking"] }
  )()
}

// 领奖台名次配色（固定色，不随主题切换，深浅色模式表现一致）：
// 第一金（琥珀）· 第二银（灰）· 第三铜（深橙）。奖杯用该色，名次数字用同色系深一档以保证可读。
const PODIUM: Record<number, { grad: string; ring: string }> = {
  // 金属渐变（固定色，不随主题切换）：左上亮、右下暗，模拟金属反光
  1: { grad: "linear-gradient(135deg,#fde68a 0%,#fbbf24 45%,#b45309 100%)", ring: "inset 0 0 0 2px rgba(180,83,9,0.55)" },
  2: { grad: "linear-gradient(135deg,#f8fafc 0%,#cbd5e1 50%,#64748b 100%)", ring: "inset 0 0 0 2px rgba(100,116,139,0.55)" },
  3: { grad: "linear-gradient(135deg,#fed7aa 0%,#fb923c 50%,#9a3412 100%)", ring: "inset 0 0 0 2px rgba(154,52,18,0.55)" },
}

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ dim?: string; scope?: string }>
}) {
  const sp = await searchParams
  const dim: DimKey = VALID_DIMS.includes(sp.dim as DimKey) ? (sp.dim as DimKey) : "favorite"
  const scope: ScopeKey = VALID_SCOPES.includes(sp.scope as ScopeKey) ? (sp.scope as ScopeKey) : "6m"
  // NSFW 过滤模式：服务端按 cookie 解析（未登录强制 sfw）
  const nsfwMode = await getMainNsfwMode()

  let result: RankResult = { items: [], fallback: false }
  try {
    result = await getRankedCached(dim, scope, nsfwMode)
  } catch {
    result = { items: [], fallback: false }
  }
  const items = result?.items ?? []
  const top3 = items.slice(0, 3)
  const rest = items.slice(3)

  // 浏览榜不按时间筛选：隐藏右侧时间范围按钮，改在页头标注「按累计」
  const cumulativeNote =
    dim === "view" ? "按累计" : result.fallback ? "窗口内暂无数据，已按累计展示" : null

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 页头（全站统一 ArchiveHero） */}
      <ArchiveHero
        variant="ranking"
        eyebrow="ranking"
        title="排行榜"
        lede="按收藏、浏览与评论，发现大家都在玩的作品"
        meta={
          items.length > 0 ? (
            <>
              <span className="tabular-nums">共 {items.length} 部</span>
              {cumulativeNote && (
                <span className="text-xs text-muted-foreground/70">{cumulativeNote}</span>
              )}
            </>
          ) : undefined
        }
      />

      {/* 控制条：维度 + 时间范围（浏览榜隐藏时间范围） */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex gap-1 rounded-xl bg-muted p-1">
          {DIMS.map((d) => (
            <Link
              key={d.key}
              href={`/ranking?dim=${d.key}&scope=${scope}`}
              className={cn(
                "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition duration-150 ease-in-out",
                dim === d.key
                  ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {d.label}
            </Link>
          ))}
        </nav>
        {dim !== "view" && (
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {SCOPES.map((s) => (
              <Link
                key={s.key}
                href={`/ranking?dim=${dim}&scope=${s.key}`}
                className={cn(
                  "rounded-md px-2.5 py-[10px] text-xs font-medium transition duration-150 ease-in-out",
                  scope === s.key
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 sm:p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-muted-foreground">暂无榜单数据</p>
          <p className="mt-1 text-xs text-muted-foreground/70">收录更多作品后，这里会按维度展示排行</p>
        </div>
      ) : (
        <>
          {/* TOP 3 领奖台 */}
          {top3.length > 0 && (
            <section className="mt-2 mx-auto grid max-w-[896px] gap-5 sm:grid-cols-3">
              {/* 渲染顺序：第二、第一、第三 —— 第一名居中，名次与颜色绑定真实名次 */}
              {[1, 0, 2].map((idx) => {
                const item = top3[idx]
                if (!item) return null
                const rank = idx + 1
                const style = PODIUM[rank]
                return (
                  <div key={item.card.id} className="relative flex h-full flex-col items-center">
                    <div className="absolute -top-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center">
                      {/* 绶带：红/白/蓝三段 */}
                      <div className="flex h-2 w-7 overflow-hidden rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                        <div className="flex-1 bg-red-500" />
                        <div className="flex-1 bg-white" />
                        <div className="flex-1 bg-blue-500" />
                      </div>
                      {/* 挂环 */}
                      <div className="-mt-px h-1.5 w-1.5 rounded-full border border-white/70" />
                      {/* 奖牌圆盘 */}
                      <div
                        className="relative flex h-10 w-10 items-center justify-center rounded-full"
                        style={{ background: style.grad, boxShadow: `${style.ring}, 0 2px 3px rgba(0,0,0,0.35)` }}
                      >
                        <span
                          className="text-sm font-extrabold tabular-nums text-white"
                          style={{ textShadow: "0 1px 2px rgba(0,0,0,0.45)" }}
                        >
                          {rank}
                        </span>
                      </div>
                    </div>
                    <div className="w-full flex-1">
                      <GameCard game={item.card} />
                    </div>
                    <div className="mt-3 text-center">
                      <span className="text-xl font-bold tabular-nums">{item.label}</span>
                      <span className="ml-1.5 text-xs text-muted-foreground">{item.unit}</span>
                    </div>
                  </div>
                )
              })}
            </section>
          )}

          {/* 第 4 名及以后 */}
          {rest.length > 0 && (
            <section className="mt-2 space-y-1">
              {rest.map((item, i) => {
                const rank = i + 4
                return (
                  <div
                    key={item.card.id}
                    className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground/70">
                      {String(rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0 flex-1">
                      <GameListRow game={item.card} />
                    </div>
                    <div className="hidden w-24 shrink-0 text-right sm:block">
                      <div className="text-sm font-semibold tabular-nums">{item.label}</div>
                      <div className="text-xs text-muted-foreground/60">{item.unit}</div>
                    </div>
                  </div>
                )
              })}
            </section>
          )}
        </>
      )}
    </div>
  )
}
