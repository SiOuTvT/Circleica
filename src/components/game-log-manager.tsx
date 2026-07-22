"use client"

import { Card } from "@/components/ui/card"
import { useState, useEffect } from "react"
import { Plus, Trash2, Loader2 } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { logger } from "@/lib/logger"
import { formatDate } from "@/lib/date"
import { apiFetchSafe, apiDeleteSafe } from "@/lib/api-client"

interface Log { id: string; content: string; createdAt: string }

export function GameLogManager({ gameId }: { gameId: string }) {
  const [logs, setLogs]     = useState<Log[]>([])
  const [content, setContent] = useState("")
  const [adding, setAdding] = useState(false)
  const [logToDelete, setLogToDelete] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    apiFetchSafe<Log[]>(`/api/admin/games/${gameId}/logs`, { signal: controller.signal })
      .then(({ data }) => { if (data) setLogs(data) })
      .catch(() => {})
    return () => controller.abort()
  }, [gameId])

  async function add(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return
    setAdding(true)
    const { ok, data } = await apiFetchSafe<Log>(`/api/admin/games/${gameId}/logs`, {
      method: "POST",
      body: { content: content.trim() },
    })
    if (ok) { setLogs(p => [data as Log, ...p]); setContent("") }
    setAdding(false)
  }

  async function remove(logId: string) {
    const { ok, error } = await apiDeleteSafe(`/api/admin/games/${gameId}/logs`, { logId })
    if (ok) setLogs(p => p.filter(l => l.id !== logId))
    else logger.game.warn("[GameLogManager] delete log failed", { error })
  }

  return (
    <Card size="comfortable" radius="xl" className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">更新日志</h2>
      <form onSubmit={add} className="flex gap-2">
        <input value={content} onChange={e => setContent(e.target.value)}
          placeholder="如：修复百度网盘链接、新增汉化版…"
          className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all" />
        <button type="submit" disabled={adding || !content.trim()}
          className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm text-foreground transition-all hover:bg-secondary disabled:opacity-50">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : <Plus className="h-4 w-4" strokeWidth={1.5} />}
          添加
        </button>
      </form>
      <div className="space-y-2">
        {logs.length === 0 && <p className="text-xs text-muted-foreground">暂无日志</p>}
        {logs.map(log => (
          <div key={log.id} className="flex items-center gap-3 rounded-lg bg-secondary/60/60 px-3 py-2">
            <span className="shrink-0 text-micro text-muted-foreground">
              {formatDate(log.createdAt)}
            </span>
            <p className="flex-1 text-xs text-muted-foreground">{log.content}</p>
            <button onClick={() => setLogToDelete(log.id)}
              className="shrink-0 text-muted-foreground transition-colors hover:text-red-400">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </button>
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={logToDelete !== null}
        onOpenChange={(open) => { if (!open) setLogToDelete(null) }}
        title="删除日志"
        description="确定要删除这条更新日志吗？删了就找不回来了。"
        variant="destructive"
        confirmText="删除"
        onConfirm={() => { if (logToDelete) { remove(logToDelete); setLogToDelete(null) } }}
      />
    </Card>
  )
}
