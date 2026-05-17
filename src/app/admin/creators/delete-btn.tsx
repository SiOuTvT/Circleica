"use client"

import { Loader2, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export function CreatorDeleteBtn({ id }: { id: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleDelete() {
    setLoading(true)
    await fetch(`/api/admin/creators/${id}`, { method: "DELETE" })
    setLoading(false)
    setConfirming(false)
    router.refresh()
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground">确认删除？</span>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-xs text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.5} /> : "确认"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground ring-1 ring-border hover:text-foreground"
        >
          取消
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="删除创作者"
      className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:bg-red-500/10 hover:text-red-400"
    >
      <Trash2 className="h-3 w-3" strokeWidth={1.5} />
    </button>
  )
}