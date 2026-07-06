"use client"

import { Card } from "@/components/ui/card"
import { useState, useRef, useCallback, useEffect } from "react"
import { Plus, Trash2, Eye, EyeOff, Music, Loader2, Play, Pause, Pencil, Upload, X, ListMusic } from "lucide-react"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { logger } from "@/lib/logger"

interface MusicItem { id: string; title: string; url: string; filename: string; isActive: boolean; playlist?: { id: string; name: string } | null }
interface PlaylistItem { id: string; name: string; _count: { music: number } }

export function MusicManager({ initialMusic }: { initialMusic: MusicItem[] }) {
  const [list, setList]   = useState(initialMusic)
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([])
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>("")
  const [newPlaylistName, setNewPlaylistName] = useState("")
  const [editingPlaylist, setEditingPlaylist] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [url, setUrl]     = useState("")
  const [file, setFile]   = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [adding, setAdding] = useState(false)
  const [error, setError]   = useState("")
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [playlistDeleteId, setPlaylistDeleteId] = useState<string | null>(null)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editUrl, setEditUrl] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Load playlists
  const fetchPlaylists = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/playlists")
      if (res.ok) setPlaylists(await res.json())
    } catch (err) { logger.api.warn("[MusicManager] fetchPlaylists failed", { error: err instanceof Error ? err.message : String(err) }) }
  }, [])

  useEffect(() => { fetchPlaylists() }, [fetchPlaylists])

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

  // 文件上传
  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 32 * 1024 * 1024) { setError("音频最大 32MB"); return }
    setFile(f)
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""))
  }

  async function uploadFile(): Promise<string | null> {
    if (!file) return null
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || "上传失败")
      return data.url
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败")
      return null
    } finally {
      setUploading(false)
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    let musicUrl = url.trim()

    if (file) {
      const uploaded = await uploadFile()
      if (!uploaded) return
      musicUrl = uploaded
    }

    if (!musicUrl && !file) { setError("请填写直链或上传文件"); return }

    setAdding(true)
    const res = await fetch("/api/admin/music", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), url: musicUrl, playlistId: selectedPlaylistId || undefined }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error); return }
    setList(p => [data, ...p])
    setTitle(""); setUrl(""); setFile(null)
  }

  // Playlist CRUD
  async function createPlaylist() {
    if (!newPlaylistName.trim()) return
    const res = await fetch("/api/admin/playlists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newPlaylistName.trim() }),
    })
    if (res.ok) { await fetchPlaylists(); setNewPlaylistName("") }
  }

  async function renamePlaylist(id: string, name: string) {
    if (!name.trim()) return
    await fetch(`/api/admin/playlists/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    })
    await fetchPlaylists()
    setEditingPlaylist(null)
  }

  async function deletePlaylist(id: string) {
    await fetch(`/api/admin/playlists/${id}`, { method: "DELETE" })
    await fetchPlaylists()
  }

  async function toggle(id: string, current: boolean) {
    const res = await fetch(`/api/admin/music/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    })
    if (res.ok) setList(p => p.map(m => m.id === id ? { ...m, isActive: !current } : m))
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/admin/music/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: editTitle.trim(), url: editUrl.trim() }),
    })
    if (res.ok) {
      const data = await res.json()
      setList(p => p.map(m => m.id === id ? { ...m, title: data.title, url: data.url } : m))
      setEditingId(null)
      toast.success("已更新")
    }
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
      {/* 播放列表管理 */}
      <Card size="comfortable" radius="xl" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <ListMusic className="h-4 w-4" strokeWidth={1.5} />播放列表
        </h2>
        <div className="flex flex-wrap gap-2">
          {playlists.map(pl => (
            <div key={pl.id} className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors",
              selectedPlaylistId === pl.id ? "bg-primary/10 text-primary ring-primary/30" : "bg-secondary text-muted-foreground ring-border"
            )}>
              {editingPlaylist === pl.id ? (
                <input
                  autoFocus
                  defaultValue={pl.name}
                  className="w-20 bg-transparent text-foreground outline-none"
                  onKeyDown={e => {
                    if (e.key === "Enter") renamePlaylist(pl.id, e.currentTarget.value)
                    if (e.key === "Escape") setEditingPlaylist(null)
                  }}
                  onBlur={e => renamePlaylist(pl.id, e.target.value)}
                />
              ) : (
                <button onClick={() => setSelectedPlaylistId(pl.id === selectedPlaylistId ? "" : pl.id)} className="hover:text-foreground">
                  {pl.name} ({pl._count.music})
                </button>
              )}
              <button onClick={() => setEditingPlaylist(pl.id)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-2.5 w-2.5" /></button>
              <button onClick={() => setPlaylistDeleteId(pl.id)} className="text-muted-foreground hover:text-red-400"><X className="h-2.5 w-2.5" /></button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input value={newPlaylistName} onChange={e => setNewPlaylistName(e.target.value)}
            placeholder="新建播放列表" className={cn(inputCls, "flex-1 text-xs")}
            onKeyDown={e => { if (e.key === "Enter") createPlaylist() }}
          />
          <button onClick={createPlaylist} disabled={!newPlaylistName.trim()}
            className="shrink-0 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40">
            创建
          </button>
        </div>
      </Card>

      <Card size="comfortable" radius="xl" className="space-y-3">
        <h2 className="text-sm font-semibold text-foreground">添加音乐</h2>
        <p className="text-xs text-muted-foreground">上传音频文件（最大 32MB）或填入直链 URL</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <form onSubmit={add} className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="曲目名称" required className={inputCls} />
          <div className="flex items-center gap-2">
            <SelectPlaylist
              playlists={playlists}
              value={selectedPlaylistId}
              onChange={setSelectedPlaylistId}
            />
          </div>
          <div className="flex gap-2">
            <input value={url} onChange={e => setUrl(e.target.value)} placeholder="音乐直链 URL（或直接上传文件）" className={cn(inputCls, "flex-1")} />
            <input ref={fileInputRef} type="file" accept="audio/*" className="hidden" onChange={handleFileSelect} />
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className={cn("flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium ring-1 transition-all shrink-0",
                file ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-secondary text-muted-foreground ring-border hover:text-foreground")}>
              <Upload className="h-3.5 w-3.5" strokeWidth={1.5} />
              {file ? file.name.slice(0, 15) + (file.name.length > 15 ? "…" : "") : "选择文件"}
            </button>
            {file && (
              <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = "" }}
                className="rounded-lg p-2 text-muted-foreground hover:text-red-400 transition-colors">
                <X className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            )}
          </div>
          <button type="submit" disabled={adding || uploading}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
            {(adding || uploading) ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {uploading ? "上传中…" : adding ? "添加中…" : "添加"}
          </button>
        </form>
      </Card>

      <Card size="compact" radius="xl" className="overflow-hidden">
        <div className="border-b border-border px-4 py-3">
          <p className="text-xs text-muted-foreground">共 {list.length} 首，{list.filter(m => m.isActive).length} 首激活</p>
        </div>
        <div className="divide-y divide-white/[0.04] divide-border/50">
          {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">暂无音乐</p>}
          {list.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors">
              <Music className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                {editingId === m.id ? (
                  <div className="flex flex-col gap-1">
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="rounded-lg bg-muted px-2 py-1 text-sm text-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                    <input value={editUrl} onChange={e => setEditUrl(e.target.value)}
                      className="rounded-lg bg-muted px-2 py-1 text-micro text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                    <div className="flex gap-1.5 mt-0.5">
                      <button onClick={() => saveEdit(m.id)}
                        className="rounded-md bg-primary px-2 py-0.5 text-micro font-medium text-primary-foreground hover:opacity-90">保存</button>
                      <button onClick={() => setEditingId(null)}
                        className="rounded-md bg-secondary px-2 py-0.5 text-micro font-medium text-muted-foreground hover:text-foreground">取消</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">{m.title}</p>
                    <p className="text-micro text-muted-foreground truncate">{m.url || m.filename}</p>
                  </>
                )}
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-micro font-medium ${m.isActive ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                {m.isActive ? "播放中" : "已停用"}
              </span>
              <button onClick={() => togglePlay(m.id, m.url)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title={playingId === m.id ? "暂停" : "试听"}>
                {playingId === m.id ? <Pause className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Play className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button onClick={() => toggle(m.id, m.isActive)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                {m.isActive ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button onClick={() => { setEditingId(m.id); setEditTitle(m.title); setEditUrl(m.url) }}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" title="编辑">
                <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
              <button onClick={() => setDeleteId(m.id)} className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </Card>
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={v => !v && setDeleteId(null)}
        title="删除音乐"
        description="确定要删除该音乐吗？删除后将无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={!!playlistDeleteId}
        onOpenChange={v => !v && setPlaylistDeleteId(null)}
        title="删除播放列表"
        description="确定要删除该播放列表吗？列表中的音乐不会被删除，但列表本身将无法恢复。"
        confirmText="删除"
        variant="destructive"
        onConfirm={() => { if (playlistDeleteId) { deletePlaylist(playlistDeleteId); setPlaylistDeleteId(null) } }}
      />
    </div>
  )
}

function SelectPlaylist({ playlists, value, onChange }: {
  playlists: PlaylistItem[]; value: string; onChange: (v: string) => void
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="rounded-xl bg-muted px-3 py-2.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all">
      <option value="">未分类</option>
      {playlists.map(pl => (
        <option key={pl.id} value={pl.id}>{pl.name}</option>
      ))}
    </select>
  )
}
