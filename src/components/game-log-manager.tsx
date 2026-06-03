"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"

interface Log { id: string; content: string; createdAt: string }

export function GameLogManager({ gameId }: { gameId: string }) {
  const [logs, setLogs]     = useState<Log[]>([])
  const [content, setContent] = useState("")
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/admin/games/${gameId}/logs`, { signal: controller.signal })
      .then(r => r.json())
      .then(setLogs)
      .catch(() => {})
    return () => controller.abort()
  }, [gameId])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setAdding(true)
    const res  = await fetch(`/api/admin/games/${gameId}/logs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    })
    const data = await res.json()
    if (res.ok) { setLogs(p => [data, ...p]); setContent("") }
    setAdding(false)
  }

  async function remove(logId: string) {
    await fetch(`/api/admin/games/${gameId}/logs`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId }),
    })
    setLogs(p => p.filter(l => l.id !== logId))
  }

  return (
    <div className="rounded-xl bg-card light:bg-white p-5 ring-1 ring-white/[0.06] light:ring-black/[0.06] space-y-3">
      <h2 className="text-sm font-semibold text-foreground light:text-muted-foreground">更新日志</h2>
      <form onSubmit={add} className="flex gap-2">
        <input value={content} onChange={e => setContent(e.target.value)}
          placeholder="如：修复百度网盘链接、新增汉化版…"
          className="flex-1 rounded-xl bg-secondary light:bg-secondary px-4 py-2.5 text-sm text-foreground light:text-foreground placeholder:text-muted-foreground light:placeholder:text-muted-foreground ring-1 ring-white/[0.06] light:ring-black/[0.06] outline-none focus:ring-zinc-600 light:focus:ring-zinc-400 transition-all" />
        <button type="submit" disabled={adding || !content.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-secondary light:bg-secondary px-4 py-2 text-sm text-foreground light:text-foreground transition-all hover:bg-secondary light:hover:bg-secondary disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
          添加
        </button>
      </form>
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-xs text-muted-foreground light:text-muted-foreground">暂无日志</p>}
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-3 rounded-lg bg-secondary/60 light:bg-secondary/60 px-3 py-2">
            <span className="shrink-0 text-[10px] text-muted-foreground light:text-muted-foreground">
              {new Date(log.createdAt).toLocaleDateString("zh-CN")}
            </span>
            <p className="flex-1 text-xs text-muted-foreground light:text-muted-foreground">{log.content}</p>
            <button onClick={() => remove(log.id)}
              className="shrink-0 text-muted-foreground light:text-muted-foreground transition-colors hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
