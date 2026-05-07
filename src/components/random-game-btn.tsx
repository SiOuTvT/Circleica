"use client"

import { Loader2, Shuffle, User } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RandomCreatorBtn() {
  const router  = useRouter()
  const [loading, setLoading] = useState(false)

  async function go() {
    setLoading(true)
    try {
      console.log("开始获取随机创作者...")
      // 随机创作者（真人）- 直接从 VNDB 获取
      const res  = await fetch("/api/creators/random", {
        cache: "no-store", // 不使用缓存
      })
      
      if (!res.ok) {
        console.error("API 请求失败:", res.status, res.statusText)
        const errorData = await res.json().catch(() => ({}))
        throw new Error(`API 请求失败: ${res.status} - ${errorData.error || '未知错误'}`)
      }
      
      const data = await res.json()
      console.log("获取到的数据:", data)
      
      if (data.id) {
        console.log("跳转到创作者页面:", `/creators/${data.id}`)
        router.push(`/creators/${data.id}`)
      } else if (data.error) {
        console.error("API 返回错误:", data.error)
        alert(`获取失败: ${data.error}`)
      } else {
        // 没有创作者，随机游戏
        console.log("没有创作者数据，尝试随机游戏...")
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
      className="flex items-center justify-center gap-2 rounded-xl bg-card/60 px-4 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-50 group w-full max-w-[200px]"
      title="随机发现同人创作者或游戏"
    >
      {loading
        ? <Loader2 className="h-6 w-6 animate-spin" strokeWidth={2.5} />
        : <User className="h-6 w-6 transition-transform group-hover:scale-110" strokeWidth={2.5} />
      }
      <span className="font-medium">随机人物</span>
    </button>
  )
}

export function PlaceholderPreviewBtn() {
  return (
    <button
      disabled
      className="flex items-center justify-center gap-2 rounded-xl bg-card/40 px-4 py-3 text-sm text-muted-foreground/60 ring-1 ring-border cursor-not-allowed opacity-60 w-full max-w-[200px]"
      title="功能开发中"
    >
      <Shuffle className="h-6 w-6" strokeWidth={2.5} />
      <span className="font-medium">预览</span>
    </button>
  )
}
