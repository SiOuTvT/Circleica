"use client"

import { ChevronLeft, ChevronRight, PenTool, Search, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Creator {
  id: string
  name: string
  nameJa: string
  avatar: string
  bio: string
  gender: string
  vndbId: string
  createdAt: string
  _count?: { games: number }
}

export default function AdminCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set("search", search)
    const res = await fetch(`/api/admin/creators?${params}`)
    const data = await res.json()
    setCreators(data.creators || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page, search])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/admin/creators/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("已删除"); load() }
    else toast.error("删除失败")
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <PenTool className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">创作者管理</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 位创作者
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          placeholder="搜索创作者..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-full rounded-xl border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary/50"
        />
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : creators.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <PenTool className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无创作者</p>
        </div>
      ) : (
        <div className="space-y-2">
          {creators.map((creator) => (
            <div
              key={creator.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                {creator.avatar ? (
                  <img src={creator.avatar} alt={creator.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                    {creator.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {creator.name}
                  {creator.nameJa && (
                    <span className="ml-2 text-xs text-muted-foreground">{creator.nameJa}</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {creator.gender && <span>{creator.gender} · </span>}
                  {creator.vndbId && <span>VNDB: {creator.vndbId} · </span>}
                  {new Date(creator.createdAt).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
                <button
                  onClick={() => handleDelete(creator.id)}
                  className="rounded-lg p-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-500"
                  title="删除"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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