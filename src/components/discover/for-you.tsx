"use client"

import { useEffect, useState } from "react"
import { GameCard, GameCardSkeleton, type GameCardData } from "@/components/game-card"
import { getRecentlyViewed } from "@/lib/recently-viewed"
import { apiFetchSafe } from "@/lib/api-client"

interface ForYouItem {
  card: GameCardData
  reason: string
  kind: "similar" | "popular"
}

/**
 * 为你推荐（重构版 · 2+3 结合）：
 * - 多种子聚合：取最近 3 部浏览记录，各自拉相似后去重，被多部命中的排前
 * - 热门补位：余位用服务端下发的 popular 兜底，保证区块永不空（修掉旧版无历史 return null 消失的 bug）
 * - 响应式网格 + 每卡「理由」小标，与「继续浏览」的横滑彻底区分
 */
export function ForYou({ popular = [] }: { popular?: GameCardData[] }) {
  const [items, setItems] = useState<ForYouItem[] | null>(null)

  useEffect(() => {
    const seeds = getRecentlyViewed().slice(0, 3)
    let cancelled = false

    ;(async () => {
      // 多种子并行拉相似
      const batches = await Promise.all(
        seeds.map(async (s) => {
          // apiFetchSafe 返回完整响应体 { success, data: { games } }，需解 data.data
          const { ok, data } = await apiFetchSafe<{ data?: { games?: GameCardData[] }; games?: GameCardData[] }>(
            `/api/games/similar?id=${encodeURIComponent(s.id)}&limit=6`,
            { cache: "no-store" },
          )
          const games: GameCardData[] = ((data as any)?.data ?? data)?.games ?? []
          return (ok ? games : []).map(
            (g: GameCardData) => ({ card: g, reason: s.title, kind: "similar" as const }),
          )
        }),
      )

      if (cancelled) return

      // 聚合去重（被越多种子命中越靠前）
      const byId = new Map<string, ForYouItem>()
      const hits = new Map<string, number>()
      for (const list of batches) {
        for (const it of list) {
          const id = it.card.id
          hits.set(id, (hits.get(id) ?? 0) + 1)
          if (!byId.has(id)) byId.set(id, it)
        }
      }
      const merged = [...byId.values()].sort(
        (a, b) => (hits.get(b.card.id) ?? 0) - (hits.get(a.card.id) ?? 0),
      )

      // 热门补位：余位用 popular 填（去重）
      const seen = new Set(merged.map((m) => m.card.id))
      for (const p of popular) {
        if (merged.length >= 9) break
        if (!seen.has(p.id)) {
          merged.push({ card: p, reason: "", kind: "popular" })
          seen.add(p.id)
        }
      }

      // 完全无浏览历史：整段用热门兜底
      const finalItems =
        seeds.length === 0
          ? popular.slice(0, 9).map((p) => ({ card: p, reason: "", kind: "popular" as const }))
          : merged

      setItems(finalItems)
    })()

    return () => {
      cancelled = true
    }
  }, [popular])

  if (items == null) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <GameCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">暂无可推荐内容</p>
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {items.map((it) => (
        <div key={it.card.id} className="flex flex-col gap-1.5">
          <GameCard game={it.card} />
          {it.kind === "similar" ? (
            <p className="truncate text-xs text-muted-foreground/70">与《{it.reason}》相似</p>
          ) : (
            <p className="truncate text-xs text-muted-foreground/70">热门推荐</p>
          )}
        </div>
      ))}
    </div>
  )
}
