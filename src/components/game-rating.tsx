"use client"

import { Star } from "lucide-react"
import { useSession } from "next-auth/react"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { apiFetchSafe } from "@/lib/api-client"

interface RatingStats {
  _avg: { score: number | null }
  _count: number
}

interface RatingData {
  userScore: number | null
  stats: RatingStats
}

/**
 * 游戏评分：5 星打分 + 平均分/人数展示。
 * 游客可看平均分；登录用户点击星星提交评分（可修改）。
 */
export function GameRating({ gameId }: { gameId: string }) {
  const { status } = useSession()
  const [userScore, setUserScore] = useState<number | null>(null)
  const [avg, setAvg] = useState<number | null>(null)
  const [count, setCount] = useState(0)
  const [hover, setHover] = useState(0)
  const [pending, setPending] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true
    let cancelled = false
    apiFetchSafe<RatingData>(`/api/games/${gameId}/rating`)
      .then(({ ok, data }) => {
        if (!ok || !data || cancelled) return
        const inner = (data as unknown as { data?: RatingData })?.data ?? data
        setUserScore(inner.userScore ?? null)
        setAvg(inner.stats?._avg?.score ?? null)
        setCount(inner.stats?._count ?? 0)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [gameId])

  async function submit(score: number) {
    if (status !== "authenticated") {
      toast.error("请先登录后再评分")
      return
    }
    if (pending) return
    setPending(true)
    const prev = userScore
    setUserScore(score)
    try {
      const { ok, data } = await apiFetchSafe<{ stats: RatingStats }>(`/api/games/${gameId}/rating`, {
        method: "POST",
        body: { score },
      })
      const inner = (data as unknown as { data?: { stats?: RatingStats } })?.data
      if (ok && inner?.stats) {
        setAvg(inner.stats._avg?.score ?? null)
        setCount(inner.stats._count ?? 0)
        toast.success(`已评 ${score} 星`)
      } else {
        setUserScore(prev)
        toast.error("评分失败，请稍后重试")
      }
    } catch {
      setUserScore(prev)
      toast.error("评分失败，请稍后重试")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((s) => {
            const lit = s <= (hover || userScore || 0)
            return (
              <button
                key={s}
                type="button"
                aria-label={`评 ${s} 星`}
                title={status === "authenticated" ? `评 ${s} 星` : "登录后可评分"}
                onMouseEnter={() => setHover(s)}
                onMouseLeave={() => setHover(0)}
                onClick={() => submit(s)}
                disabled={pending}
                className={cn(
                  "rounded transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                  pending && "cursor-wait opacity-60",
                )}
              >
                <Star
                  className={cn("h-4 w-4", lit ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")}
                  strokeWidth={2}
                />
              </button>
            )
          })}
        </div>
        <span className="text-xs text-muted-foreground">
          {avg ? avg.toFixed(1) : "—"} 分 · {count} 人评分
        </span>
      </div>
      {status === "authenticated" && userScore != null && (
        <p className="text-micro text-muted-foreground">你已评 {userScore} 星，点击星星可修改</p>
      )}
    </div>
  )
}
