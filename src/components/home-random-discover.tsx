"use client"

import { Loader2, Sparkles } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useRef } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { getRandomStaff } from "@/lib/vndb-client"

export function HomeRandomDiscover() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleRandom() {
    if (loading) return
    setLoading(true)
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const timer = setTimeout(() => {
      setLoading(false)
      toast.error("获取超时，请稍后重试")
    }, 20000)

    try {
      const creator = await getRandomStaff()
      if (creator?.vndbId && !controller.signal.aborted) {
        router.push(`/creators/vndb/${encodeURIComponent(creator.vndbId)}`)
        clearTimeout(timer)
        return
      }
      const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store", signal: controller.signal })
      if (!controller.signal.aborted && ok && data?.data?.[0]?.serialId) {
        router.push(`/games/${data.data[0].serialId}`)
      } else if (!controller.signal.aborted) {
        toast.error("暂无推荐内容")
      }
    } catch {
      if (!controller.signal.aborted) {
        try {
          const { ok, data } = await apiFetchSafe<{ data?: Array<{ serialId?: number }> }>("/api/games/random", { cache: "no-store", signal: controller.signal })
          if (ok && data?.data?.[0]?.serialId) router.push(`/games/${data.data[0].serialId}`)
          else toast.error("暂无推荐内容")
        } catch {
          toast.error("获取失败，请稍后重试")
        }
      }
    } finally {
      clearTimeout(timer)
      if (!controller.signal.aborted) setLoading(false)
    }
  }

  return (
    <button
      onClick={handleRandom}
      disabled={loading}
      className="flex flex-col items-center justify-center rounded-xl bg-card border border-border px-3 py-3 text-center shadow-sm hover:bg-accent/50 hover:border-border/60 transition-colors disabled:opacity-50 cursor-pointer"
      title="随机发现一个作品"
    >
      {loading ? (
        <Loader2 className="h-5 w-5 text-primary animate-spin mb-1" strokeWidth={2} />
      ) : (
        <Sparkles className="h-5 w-5 text-primary mb-1" strokeWidth={2} />
      )}
      <span className="text-xs font-semibold text-foreground leading-tight">随机</span>
      <span className="text-xs font-semibold text-foreground leading-tight">发现</span>
    </button>
  )
}
