"use client"

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

interface Tag { id: string; name: string; color: string; gameCount: number }

export function TagsManager({ initialTags }: { initialTags: Tag[] }) {
  const [tags, setTags] = useState(initialTags)
  const [name, setName] = useState("")
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState("")

  async function addTag(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setAdding(true)
    const res = await fetch("/api/admin/tags", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), color: "theme" }),
    })
    const data = await res.json()
    setAdding(false)
    if (!res.ok) { setError(data.error); return }
    setTags((prev) => [...prev, { ...data, gameCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
    setName("")
  }

  async function deleteTag(id: string) {
    await fetch(`/api/admin/tags/${id}`, { method: "DELETE" })
    setTags((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <div className="space-y-4">
      {/* 新增表单 */}
      <div className="rounded-xl bg-zinc-900 p-5 ring-1 ring-white/[0.06]">
        <h2 className="mb-4 text-sm font-semibold text-zinc-300">新增标签</h2>
        {error && <p className="mb-3 text-xs text-red-400">{error}</p>}
        <form onSubmit={addTag} className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="标签名称"
            required
            className="w-full rounded-xl bg-zinc-800 px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 ring-1 ring-white/[0.06] outline-none focus:ring-zinc-600 transition-all"
          />
          {/* 预览 */}
          {name && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-500">预览：</span>
              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground/80">
                {name}
              </span>
            </div>
          )}
          <button type="submit" disabled={adding}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 px-4 py-2 text-sm text-zinc-300 ring-1 ring-white/[0.06] transition-all hover:bg-zinc-700 hover:text-white disabled:opacity-60">
            {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} /> : <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {adding ? "添加中…" : "添加标签"}
          </button>
        </form>
      </div>

      {/* 标签列表 */}
      <div className="rounded-xl bg-zinc-900 ring-1 ring-white/[0.06] overflow-hidden">
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs text-zinc-500">共 {tags.length} 个标签</p>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {tags.length === 0 && (
            <p className="px-4 py-8 text-center text-sm text-zinc-600">暂无标签</p>
          )}
          {tags.map((tag) => (
            <div key={tag.id} className="flex items-center justify-between px-4 py-3 hover:bg-zinc-800/50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary text-muted-foreground/80">
                  {tag.name}
                </span>
                <span className="text-xs text-zinc-600">{tag.gameCount} 个游戏</span>
              </div>
              <button onClick={() => deleteTag(tag.id)}
                className="rounded-lg p-1.5 text-zinc-600 transition-colors hover:bg-red-500/10 hover:text-red-400">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}