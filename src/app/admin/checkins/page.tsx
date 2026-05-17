"use client"

import { CalendarCheck, ChevronLeft, ChevronRight, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface CheckIn {
  id: string
  date: string
  createdAt: string
  user: { id: string; username: string; avatar: string }
}

export default function AdminCheckInsPage() {
  const [checkIns, setCheckIns] = useState<CheckIn[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/checkins?page=${page}`)
    const data = await res.json()
    setCheckIns(data.checkIns || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/admin/checkins", {
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
        <CalendarCheck className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">签到记录</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 条记录
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : checkIns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无签到记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-bold text-white">
                {ci.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {ci.user.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  签到日期: {ci.date} · 创建时间: {new Date(ci.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(ci.id)}
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