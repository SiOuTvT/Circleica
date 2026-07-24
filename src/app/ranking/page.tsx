import type { Metadata } from "next"
import Link from "next/link"
import { Trophy } from "lucide-react"
import { prisma } from "@/lib/prisma"
import { GAME_CARD_SELECT, mapGameToCard } from "@/lib/game-card-map"
import { GameCard, GameListRow, type GameCardData } from "@/components/game-card"
import Image from "next/image"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "排行榜 · Circleica",
  description: "按评分、收藏、浏览、评论查看热门作品排行",
}

type DimKey = "rating" | "favorite" | "view" | "comment"

const DIMS: { key: DimKey; label: string }[] = [
  { key: "rating", label: "评分" },
  { key: "favorite", label: "收藏" },
  { key: "view", label: "浏览" },
  { key: "comment", label: "评论" },
]

const VALID_DIMS: DimKey[] = ["rating", "favorite", "view", "comment"]

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

async function getRanked(dim: DimKey): Promise<RankedItem[]> {
  if (dim === "rating") {
    const grouped = await prisma.gameRating.groupBy({
      by: ["gameId"],
      _avg: { score: true },
      _count: { _all: true },
      orderBy: { _avg: { score: "desc" } },
      take: 200,
    })
    const filtered = grouped
      .filter((g) => g._count._all >= 3)
      .sort((a, b) => (b._avg.score ?? 0) - (a._avg.score ?? 0))
      .slice(0, 50)
    const ids = filtered.map((g) => g.gameId)
    const rows = await prisma.game.findMany({
      where: { id: { in: ids }, isPublished: true },
      select: GAME_CARD_SELECT,
    })
    const byId = new Map(rows.map((r) => [r.id, r]))
    const items: RankedItem[] = []
    for (const g of filtered) {
      const row = byId.get(g.gameId)
      if (!row) continue
      items.push({
        card: mapGameToCard(row),
        label: (g._avg.score ?? 0).toFixed(1),
        unit: `分 · ${g._count._all}人评`,
      })
    }
    return items
  }

  if (dim === "comment") {
    const rows = await prisma.game.findMany({
      where: { isPublished: true },
      orderBy: { comments: { _count: "desc" } },
      take: 50,
      select: { ...GAME_CARD_SELECT, _count: { select: { comments: true } } },
    })
    return rows.map((r) => ({
      card: mapGameToCard(r),
      label: fmtNum(r._count.comments),
      unit: "评论",
    }))
  }

  const orderBy =
    dim === "favorite"
      ? { favoriteCount: "desc" as const }
      : { viewCount: "desc" as const }
  const rows = await prisma.game.findMany({
    where: { isPublished: true },
    orderBy,
    take: 50,
    select: GAME_CARD_SELECT,
  })
  return rows.map((r) => ({
    card: mapGameToCard(r),
    label: fmtNum(dim === "favorite" ? r.favoriteCount : r.viewCount),
    unit: dim === "favorite" ? "收藏" : "浏览",
  }))
}

const MEDALS = [
  { border: "ring-amber-400/70", bg: "bg-amber-400", fg: "text-white", label: "bg-amber-400 text-white" },
  { border: "ring-slate-300/70", bg: "bg-slate-300", fg: "text-slate-800", label: "bg-slate-300 text-slate-800" },
  { border: "ring-orange-600/60", bg: "bg-orange-700", fg: "text-white", label: "bg-orange-700 text-white" },
]

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ dim?: string }>
}) {
  const sp = await searchParams
  const dim: DimKey = VALID_DIMS.includes(sp.dim as DimKey)
    ? (sp.dim as DimKey)
    : "rating"

  let items: RankedItem[] = []
  try {
    items = await getRanked(dim)
  } catch {
    items = []
  }

  const top3 = items.slice(0, 3)
  const rest = items.slice(3)

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      {/* ── 页头 ── */}
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--theme-color)]/10 text-[var(--theme-color)]">
          <Trophy className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <div>
          <h1 className="text-2xl font-heading font-semibold tracking-tight">排行榜</h1>
          <p className="text-sm text-muted-foreground">按维度查看热门作品</p>
        </div>
      </header>

      {/* ── 维度切换 ── */}
      <nav className="mt-6 flex gap-1 rounded-xl bg-muted p-1">
        {DIMS.map((d) => (
          <Link
            key={d.key}
            href={`/ranking?dim=${d.key}`}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-all",
              dim === d.key
                ? "bg-card text-foreground shadow-sm ring-1 ring-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {d.label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
          <Trophy className="mx-auto h-10 w-10 text-muted-foreground/40" strokeWidth={1.5} />
          <p className="mt-3 text-sm text-muted-foreground">暂无榜单数据</p>
          <p className="mt-1 text-xs text-muted-foreground/70">收录更多作品后，这里会按维度展示排行</p>
        </div>
      ) : (
        <>
          {/* ── TOP 3 ── */}
          {top3.length > 0 && (
            <section className="mt-8 grid gap-5 sm:grid-cols-3">
              {top3.map((item, i) => (
                <div key={item.card.id} className="relative flex flex-col items-center">
                  {/* 奖牌 */}
                  <div
                    className={cn(
                      "absolute -top-2 z-10 flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ring-4 shadow-lg",
                      MEDALS[i].bg,
                      MEDALS[i].fg,
                      MEDALS[i].border,
                    )}
                  >
                    {i + 1}
                  </div>
                  {/* 封面 */}
                  <div className="w-full max-w-[200px]">
                    <GameCard game={item.card} />
                  </div>
                  <div className="mt-3 text-center">
                    <span className="text-xl font-bold tabular-nums">{item.label}</span>
                    <span className="ml-1.5 text-xs text-muted-foreground">{item.unit}</span>
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* ── 第 4 名及以后 ── */}
          {rest.length > 0 && (
            <section className="mt-8 space-y-1">
              {rest.map((item, i) => {
                const rank = i + 4
                return (
                  <div
                    key={item.card.id}
                    className="flex items-center gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="w-8 shrink-0 text-center text-sm font-bold tabular-nums text-muted-foreground/40">
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
