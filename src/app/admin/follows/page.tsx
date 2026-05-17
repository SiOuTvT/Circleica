"use client"

import { ChevronLeft, ChevronRight, Trash2, Users } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Follow {
  id: string
  createdAt: string
  follower: { id: string; username: string; avatar: string }
  following: { id: string; username: string; avatar: string }
}

export default function AdminFollowsPage() {
  const [follows, setFollows] = useState<Follow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/follows?page=${page}`)
    const data = await res.json()
    setFollows(data.follows || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/admin/follows", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success("已删除"); load() }
    else toast.error("删除失败")
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">关注管理</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 条关系
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : follows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <Users className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无关注关系</p>
        </div>
      ) : (
        <div className="space-y-2">
          {follows.map((follow) => (
            <div
              key={follow.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-bold text-white">
                  {follow.follower.username.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm text-muted-foreground">→</span>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xs font-bold text-white">
                  {follow.following.username.charAt(0).toUpperCase()}
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {follow.follower.username}
                  <span className="mx-1 text-muted-foreground">关注了</span>
                  {follow.following.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(follow.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(follow.id)}
                className="shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                title="删除"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}