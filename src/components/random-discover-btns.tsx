"use client"

import { logger } from "@/lib/logger"
import { Loader2, Sparkles, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

export function RandomCreatorBtn({ fullWidth }: { fullWidth?: boolean } = {}) {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      // 只在本站创作者里随机：M2 之后详情页统一是 /credits/creator/[slug]，
      // 旧实现取 VNDB 数字 id 跳 /creators/[id]，主站没有落地页，必然 404。
      const { ok, data } = await apiFetchSafe<{ slug?: string }>("/api/creators/random", { cache: "no-store" })

      if (ok && data?.slug) {
        router.push(`/credits/creator/${encodeURIComponent(data.slug)}`)
      } else {
        // 本站暂无创作者：降级跳一部随机游戏
        const { ok: ok2, data: data2 } = await apiFetchSafe<{ id?: string; serialId?: string }>("/api/games/random", { cache: "no-store" })
        if (ok2 && data2?.id) {
          router.push(`/games/${data2.serialId ?? data2.id}`)
        } else {
          toast.error("暂无可推荐的内容")
        }
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
    const { ok, data } = await apiFetchSafe<{ id?: string; serialId?: string }>("/api/games/random", { cache: "no-store" })
    if (ok && data?.id) {
      router.push(`/games/${data.serialId ?? data.id}`)
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