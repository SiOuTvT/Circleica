"use client"

import { Loader2, Sparkles, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RandomCreatorBtn() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      // 随机创作者（真人）- 直接从 VNDB 获取
      const res  = await fetch("/api/creators/random", {
        cache: "no-store",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${res.status} - ${errorData.error || '未知错误'}`)
      }

      const data = await res.json()

      if (data.id) {
        router.push(`/creators/${data.id}`)
      } else if (data.error) {
        alert(`获取失败: ${data.error}`)
      } else {
        // 没有创作者，随机游戏
        const res2  = await fetch("/api/games/random", {
          cache: "no-store",
        })
        const data2 = await res2.json()
        if (data2.id) {
          router.push(`/games/${data2.id}`)
        } else {
          alert("暂无可推荐的内容")
        }
      }
    } catch (error) {
      console.error("Random selection error:", error)
      alert(`随机选择失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="random-discover-btn flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50 group flex-1 lg:flex-none lg:w-full lg:max-w-[200px]"
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
      const res = await fetch("/api/characters/random", {
        cache: "no-store",
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${res.status} - ${errorData.error || '未知错误'}`)
      }

      const data = await res.json()

      if (data.id) {
        router.push(`/characters/${data.id}`)
      } else if (data.error) {
        alert(`获取失败: ${data.error}`)
      } else {
        alert("暂无角色数据，请稍后重试")
      }
    } catch (error) {
      console.error("Random character error:", error)
      alert(`随机角色获取失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={go}
      disabled={loading}
      className="random-discover-btn flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50 group flex-1 lg:flex-none lg:w-full lg:max-w-[200px]"
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