"use client"

import { useState } from "react"
import { Plus, Trash2, Eye, EyeOff, Music, Loader2 } from "lucide-react"

interface MusicItem { id: string; title: string; url: string; filename: string; isActive: boolean }

export function MusicManager({ initialMusic }: { initialMusic: MusicItem[] }) {
  const [list, setList]   = useState(initialMusic)
  const [title, setTitle] = useState("")
  const [url, setUrl]     = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError]   = useState("")

  const inputCls = "w-full rounded-xl bg-zinc-800 light:bg-zinc-100 px-4 py-2.5 text-sm text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 ring-1 ring-white/[0.06] light:ring-black/[0.06] outline-none focus:ring-zinc-600 light:focus:ring-zinc-400 transition-all"

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

  async function remove(id: string) {
    await fetch(`/api/admin/music/${id}`, { method: "DELETE" })
    setList(p => p.filter(m => m.id !== id))
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-zinc-900 light:bg-white p-5 ring-1 ring-white/[0.06] light:ring-black/[0.06] space-y-3">
        <h2 className="text-sm font-semibold text-zinc-300 light:text-zinc-700">添加音乐</h2>
        <p className="text-xs text-zinc-600 light:text-zinc-400">填入音乐文件的直链 URL（mp3/ogg/flac），前台会循环播放所有激活的曲目</p>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <form onSubmit={add} className="space-y-2">
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="曲目名称" required className={inputCls} />
          <input value={url} onChange={e => setUrl(e.target.value)} placeholder="音乐直链 URL（https://...）" required className={inputCls} />
          <button type="submit" disabled={adding}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 light:bg-zinc-100 px-4 py-2 text-sm text-zinc-300 light:text-zinc-700 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-white disabled:opacity-60">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {adding ? "添加中…" : "添加"}
          </button>
        </form>
      </div>

      <div className="rounded-xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06] overflow-hidden">
        <div className="border-b border-white/[0.06] light:border-black/[0.06] px-4 py-3">
          <p className="text-xs text-zinc-500">共 {list.length} 首，{list.filter(m => m.isActive).length} 首激活</p>
        </div>
        <div className="divide-y divide-white/[0.04] light:divide-black/[0.04]">
          {list.length === 0 && <p className="px-4 py-8 text-center text-sm text-zinc-600 light:text-zinc-400">暂无音乐</p>}
          {list.map(m => (
            <div key={m.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/50 light:hover:bg-zinc-100/50 transition-colors">
              <Music className="h-4 w-4 shrink-0 text-zinc-600 light:text-zinc-400" strokeWidth={1.5} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-300 light:text-zinc-700 truncate">{m.title}</p>
                <p className="text-[10px] text-zinc-600 light:text-zinc-400 truncate">{m.url || m.filename}</p>
              </div>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${m.isActive ? "bg-emerald-500/10 text-emerald-400" : "bg-zinc-800 light:bg-zinc-100 text-zinc-500"}`}>
                {m.isActive ? "播放中" : "已停用"}
              </span>
              <button onClick={() => toggle(m.id, m.isActive)} className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-700 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-600">
                {m.isActive ? <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} /> : <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />}
              </button>
              <button onClick={() => remove(m.id)} className="rounded-lg p-1.5 text-zinc-600 light:text-zinc-400 transition-colors hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
