"use client"

import { Loader2, Sparkles, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function RandomCreatorBtn() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      // 动态导入 VNDB 客户端，避免首屏加载
      const { getRandomStaff, getRandomProducer } = await import("@/lib/vndb-client")
      let creator: { vndbId?: string; [key: string]: unknown } | null = await getRandomStaff()
      if (!creator) {
        creator = await getRandomProducer()
      }

      if (creator && creator.vndbId) {
        // 保存到服务器数据库（不阻塞导航）
        fetch("/api/creators/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(creator),
        }).catch(() => {})
        
        router.push(`/creators/${creator.vndbId}`)
      } else {
        // 都没获取到，随机跳到一个游戏
        const res2 = await fetch("/api/games/random", { cache: "no-store" })
        const data2 = await res2.json()
        if (data2.id) {
          router.push(`/games/${data2.serialId ?? data2.id}`)
        } else {
          toast.error("暂无可推荐的内容")
        }
      }
    } catch (error) {
      console.error("Random selection error:", error)
      toast.error(`随机选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-2.5 text-base text-foreground/70 ring-1 ring-border transition-all hover:bg-card hover:text-foreground disabled:opacity-50 group"
      title="随机发现同人创作者（脚本家、画师、音乐人等）"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
        : <User className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2.5} />
      }
      <span className="font-medium">随机创作者</span>
    </button>
  )
}

export function RandomCharacterBtn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      // 直接在浏览器端调用 VNDB API
      const { getRandomCharacter } = await import("@/lib/vndb-client")
      const character = await getRandomCharacter()

      if (character && character.vndbId) {
        // 保存到服务器数据库（不阻塞导航）
        fetch("/api/characters/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(character),
        }).catch(() => {})
        
        router.push(`/characters/${character.vndbId}`)
      } else {
        toast.error("暂无角色数据，请稍后重试")
      }
    } catch (error) {
      console.error("Random character error:", error)
      toast.error(`随机角色获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-2.5 text-base text-foreground/70 ring-1 ring-border transition-all hover:bg-card hover:text-foreground disabled:opacity-50 group"
      title="随机查看游戏角色（完整角色设定）"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
        : <Sparkles className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2.5} />
      }
      <span className="font-medium">随机角色</span>
    </button>
  )
}