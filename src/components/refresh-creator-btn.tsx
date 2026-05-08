"use client"

import { Loader2, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function RefreshCreatorBtn() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function refresh() {
    setLoading(true)
    try {
      const res = await fetch("/api/creators/random", { cache: "no-store" })
      if (!res.ok) throw new Error("获取失败")
      const data = await res.json()
      if (data.id) {
        router.push(`/creators/${data.id}`)
      } else {
        alert("暂无创作者数据，请稍后重试")
      }
    } catch {
      alert("获取失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-8 flex justify-center">
      <button
        onClick={refresh}
        disabled={loading}
        className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-500/20 to-sky-500/20 px-6 py-3 text-sm font-medium text-blue-300 light:text-blue-600 ring-1 ring-blue-500/30 transition-all hover:from-blue-500/30 hover:to-sky-500/30 hover:text-blue-200 light:hover:text-blue-700 disabled:opacity-50"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        换一个创作者
      </button>
    </div>
  )
}