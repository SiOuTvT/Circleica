"use client"

import { logger } from "@/lib/logger"
import { Loader2, Sparkles, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { getRandomCreator } from "@/lib/vndb-client"

export function RandomCreatorBtn({ fullWidth }: { fullWidth?: boolean } = {}) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      // 优先浏览器端直连 VNDB 随机创作者（绕开部署服务器访问不到 api.vndb.org 的限制）
      const creator = await getRandomCreator()
      if (creator?.vndbId) {
        router.push(`/creators/vndb/${encodeURIComponent(creator.vndbId)}`)
        return
      }

      // VNDB 失败：降级本站创作者，再降级随机游戏
      // apiFetchSafe 返回完整响应体 { success, data: { slug } }，需解包 data.data
      const { ok, data } = await apiFetchSafe<{ data?: { slug?: string } }>("/api/creators/random", { cache: "no-store" })
      const inner = data?.data
      if (ok && inner?.slug) {
        router.push(`/credits/creator/${encodeURIComponent(inner.slug)}`)
        return
      }

      // games/random 返回 { success, data: [{ id, serialId }] }
      const { ok: ok2, data: data2 } = await apiFetchSafe<{ data?: Array<{ id?: string; serialId?: string }> }>("/api/games/random", { cache: "no-store" })
      const game = data2?.data?.[0]
      if (ok2 && game?.id) {
        router.push(`/games/${game.serialId ?? game.id}`)
      } else {
        toast.error("暂无可推荐的内容")
      }
    } catch (error) {
      logger.game.error("Random selection error", error)
      toast.error(`随机选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className={`flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-2.5 text-base text-foreground/70 ring-1 ring-border transition-all hover:bg-card hover:text-foreground disabled:opacity-50 group ${fullWidth ? "w-full" : ""}`}
      title="随机发现同人创作者（脚本家、画师、音乐人等）"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
        : <User className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2} />
      }
      <span className="font-medium">随机创作者</span>
    </button>
  )
}

export function RandomCharacterBtn({ fullWidth }: { fullWidth?: boolean } = {}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    let navigated = false
    try {
      // 直接在浏览器端调用 VNDB API
      const { getRandomCharacter } = await import("@/lib/vndb-client")
      const character = await getRandomCharacter()

      if (character && character.vndbId) {
        router.push(`/characters/${character.vndbId}`)
        navigated = true
        return
      }
    } catch (error) {
      // VNDB 境外直连超时/不可达：记录后走与「随机创作者」同构的降级，
      // 而不是只弹错误——避免角色入口在 VNDB 抖动时彻底失效（review-#14）
      logger.game.error("Random character VNDB 失败，降级为随机游戏", error)
    } finally {
      if (!navigated) setLoading(false)
    }

    // 到达这里：VNDB 无结果 / 超时 / 不可达 → 与「随机创作者」同构降级跳一部随机游戏
    // games/random 返回 { success, data: [{ id, serialId }] }
    const { ok, data } = await apiFetchSafe<{ data?: Array<{ id?: string; serialId?: string }> }>("/api/games/random", { cache: "no-store" })
    const game = data?.data?.[0]
    if (ok && game?.id) {
      router.push(`/games/${game.serialId ?? game.id}`)
    } else {
      toast.error("暂无可推荐的内容")
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className={`flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-2.5 text-base text-foreground/70 ring-1 ring-border transition-all hover:bg-card hover:text-foreground disabled:opacity-50 group ${fullWidth ? "w-full" : ""}`}
      title="随机查看游戏角色（完整角色设定）"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2} />
        : <Sparkles className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2} />
      }
      <span className="font-medium">随机角色</span>
    </button>
  )
}