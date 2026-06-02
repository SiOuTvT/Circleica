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
    <div className="rounded-xl bg-zinc-900 light:bg-white p-5 ring-1 ring-white/[0.06] light:ring-black/[0.06] space-y-3">
      <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">更新日志</h2>
      <form onSubmit={add} className="flex gap-2">
        <input value={content} onChange={e => setContent(e.target.value)}
          placeholder="如：修复百度网盘链接、新增汉化版…"
          className="flex-1 rounded-xl bg-zinc-800 light:bg-zinc-100 px-4 py-2.5 text-sm text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 ring-1 ring-white/[0.06] light:ring-black/[0.06] outline-none focus:ring-zinc-600 light:focus:ring-zinc-400 transition-all" />
        <button type="submit" disabled={adding || !content.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-zinc-700 light:bg-zinc-200 px-4 py-2 text-sm text-zinc-200 light:text-zinc-800 transition-all hover:bg-zinc-600 light:hover:bg-zinc-300 disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
          添加
        </button>
      </form>
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-xs text-zinc-600 light:text-zinc-400">暂无日志</p>}
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-3 rounded-lg bg-zinc-800/60 light:bg-zinc-100/60 px-3 py-2">
            <span className="shrink-0 text-[10px] text-zinc-600 light:text-zinc-400">
              {new Date(log.createdAt).toLocaleDateString("zh-CN")}
            </span>
            <p className="flex-1 text-xs text-zinc-400 light:text-zinc-600">{log.content}</p>
            <button onClick={() => remove(log.id)}
              className="shrink-0 text-zinc-600 light:text-zinc-400 transition-colors hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
