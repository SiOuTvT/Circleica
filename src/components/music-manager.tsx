"use client"

import { useState, useRef, useCallback } from "react"
import { Plus, Trash2, Eye, EyeOff, Music, Loader2, Play, Pause } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { toast } from "sonner"

interface MusicItem { id: string; title: string; url: string; filename: string; isActive: boolean }

export function MusicManager({ initialMusic }: { initialMusic: MusicItem[] }) {
  const [list, setList]   = useState(initialMusic)
  const [title, setTitle] = useState("")
  const [url, setUrl]     = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError]   = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const togglePlay = useCallback((id: string, musicUrl: string) => {
    // 如果点击的是当前正在播放的曲目，则暂停/恢复
    if (playingId === id && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play()
        setPlayingId(id)
      } else {
        audioRef.current.pause()
        setPlayingId(null)
      }
      return
    }

    // 停止当前播放
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
    }

    // 播放新曲目
    const audio = new Audio(musicUrl)
    audioRef.current = audio
    audio.play().then(() => setPlayingId(id)).catch(() => setPlayingId(null))
    audio.onended = () => setPlayingId(null)
    audio.onerror = () => setPlayingId(null)
  }, [playingId])

  const inputCls = "w-full rounded-xl bg-muted px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setAdding(true)
    const res = await fetch("/api/admin/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), url: url.trim() }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error); return }
    setList(p => [data, ...p])
    setTitle(""); setUrl("")
  }

  async function toggle(id: string, current: boolean) {
    const res = await fetch(`/api/admin/music/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) setList(p => p.map(m => m.id === id ? { ...m, isActive: !current } : m))
  }

  async function confirmDelete() {
    if (!deleteId) return
    const res = await fetch(`/api/admin/music/${deleteId}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("音乐已删除")
      setList(p => p.filter(m => m.id !== deleteId))
    } else {
      toast.error("删除失败")
    }
    setDeleteId(null)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <h2 className="text-sm font-semibold text-foreground">添加音乐</h2>
        <p className="text-xs text-muted-foreground">填入音乐文件的直链 URL（mp3/ogg/flac），前台会循环播放所有激活的曲目</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <form onSubmit={add} className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="曲目名称" required className={inputCls} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="音乐直链 URL（https://...）" required className={inputCls} />
          <button type="submit" disabled={adding}
            className="flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm text-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground disabled:opacity-60">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {adding ? "添加中…" : "添加"}
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">共 {list.length} 首，{list.filter(m => m.isActive).length} 首激活</p>
        </div>
        <div className="divide-y divide-white/[0.04] divide-border/50">
          {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无音乐</p>}
          {list.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
              <Music className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                <p className="text-[10px] text-muted-foreground truncate">{m.url || m.filename}</p>
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${m.isActive ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                {m.isActive ? "播放中" : "已停用"}
              </span>
              <button onClick={() => togglePlay(m.id, m.url)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title={playingId === m.id ? "暂停" : "试听"}>
                {playingId === m.id ? <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button onClick={() => toggle(m.id, m.isActive)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {m.isActive ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button onClick={() => setDeleteId(m.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={v => !v && setDeleteId(null)}
        title="删除音乐"
        description="确定要删除该音乐吗？删除后将无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDelete}
      />
    </div>
  )
}
