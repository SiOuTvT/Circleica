"use client"

import { Button } from "@/components/ui/button"
import { Shuffle, Sparkles, UserCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RandomDiscoverBtns() {
  const [loading, setLoading] = useState<"creator" | "character" | null>(null)
  const router = useRouter()

  const handleRandomCreator = async () => {
    setLoading("creator")
    try {
      const res = await fetch("/api/creators/random")
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      // Navigate to creator page using vndbId
      if (data.vndbId) {
        router.push(`/creators/${data.vndbId}`)
      } else if (data.id) {
        const id = data.id.replace("s", "")
        router.push(`/creators/${id}`)
      }
    } catch {
      alert("获取随机创作者失败，请稍后重试")
    } finally {
      setLoading(null)
    }
  }

  const handleRandomCharacter = async () => {
    setLoading("character")
    try {
      const res = await fetch("/api/characters/random")
      const data = await res.json()
      if (data.error) {
        alert(data.error)
        return
      }
      // Navigate to character page
      if (data.id) {
        router.push(`/characters/${data.id}`)
      }
    } catch {
      alert("获取随机角色失败，请稍后重试")
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8 rounded-full border-dashed hover:border-solid hover:bg-primary/5"
        onClick={handleRandomCreator}
        disabled={loading !== null}
      >
        {loading === "creator" ? (
          <Shuffle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <UserCircle className="h-3.5 w-3.5" />
        )}
        随机创作者
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 text-xs h-8 rounded-full border-dashed hover:border-solid hover:bg-primary/5"
        onClick={handleRandomCharacter}
        disabled={loading !== null}
      >
        {loading === "character" ? (
          <Shuffle className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        随机角色
      </Button>
    </div>
  )
}