"use client"

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"

interface TagInGroup {
  id: string
  name: string
  color: string
  gameCount: number
}

export interface TagGroup {
  id: string
  name: string
  description: string
  color: string
  tags: TagInGroup[]
}

const PRESET_COLORS = [
  "#7c8a9e", "#6b7280", "#9ca3af",
  "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8", "#22d3ee",
  "#34d399", "#4ade80", "#facc15", "#fb923c", "#f87171",
  "#e879f9", "#f472b6",
]

export function TagGroupsManager({ initialGroups }: { initialGroups: TagGroup[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editColor, setEditColor] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [expanded, setExpanded] = useState<string | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, color }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "创建失败"); setSaving(false); return }
      setGroups(prev => [...prev, { ...data, tags: [] }].sort((a, b) => a.name.localeCompare(b.name)))
      setName(""); setDescription("")
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/admin/tag-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), description: editDesc, color: editColor }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "更新失败"); setSaving(false); return }
      setGroups(prev => prev.map(g => g.id === id ? { ...g, name: data.name, description: data.description, color: data.color } : g))
      setEditing(null)
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除此标签组？组内标签不会被删除，但会变为未分组。")) return
    const res = await fetch(`/api/admin/tag-groups/${id}`, { method: "DELETE" })
    if (res.ok) setGroups(prev => prev.filter(g => g.id !== id))
  }

  const inputCls = "w-full rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
        标签组
      </h2>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* 新建标签组 */}
      <form onSubmit={handleCreate} className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="新标签组名称（如：题材、风格）"
            className={inputCls}
          />
          <button type="submit" disabled={saving || !name.trim()}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-violet-500/10 text-violet-400 px-4 py-2.5 text-xs font-semibold ring-1 ring-violet-500/20 hover:bg-violet-500/20 transition-all disabled:opacity-50">
            <Plus className="h-4 w-4" strokeWidth={2} />添加
          </button>
        </div>
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="描述（可选）"
          className={inputCls}
        />
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => setColor(c)}
              className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-110" : "hover:scale-110"}`}
              style={{ background: c }}
            />
          ))}
        </div>
      </form>

      {/* 标签组列表 */}
      <div className="rounded-xl bg-card ring-1 ring-border divide-y divide-border overflow-hidden">
        {groups.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">暂无标签组</p>
        )}
        {groups.map(group => (
          <div key={group.id}>
            <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50">
              {editing === group.id ? (
                <>
                  <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: editColor }} />
                  <input value={editName} onChange={e => setEditName(e.target.value)}
                    className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                  <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="描述"
                    className="w-40 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                  <div className="flex gap-1">
                    {PRESET_COLORS.slice(0, 8).map(c => (
                      <button key={c} type="button" onClick={() => setEditColor(c)}
                        className={`h-5 w-5 rounded-full transition-all ${editColor === c ? "ring-2 ring-violet-500" : ""}`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <button onClick={() => handleUpdate(group.id)} disabled={saving}
                    className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
                  </button>
                  <button onClick={() => setEditing(null)}
                    className="shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setExpanded(expanded === group.id ? null : group.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: group.color }} />
                    <span className="text-sm font-semibold text-foreground">{group.name}</span>
                    {group.description && (
                      <span className="text-xs text-muted-foreground truncate">{group.description}</span>
                    )}
                    <span className="shrink-0 text-xs text-muted-foreground">{group.tags.length} 个标签</span>
                  </button>
                  <button onClick={() => { setEditing(group.id); setEditName(group.name); setEditDesc(group.description); setEditColor(group.color) }}
                    className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(group.id)}
                    className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
            {/* 展开显示组内标签 */}
            {expanded === group.id && group.tags.length > 0 && (
              <div className="px-5 pb-3 pl-10 flex flex-wrap gap-1.5">
                {group.tags.map(tag => (
                  <span key={tag.id} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
                    style={{ background: tag.color + "18", color: tag.color, borderColor: tag.color + "30" }}>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: tag.color }} />
                    {tag.name}
                    <span className="text-[10px] opacity-60">{tag.gameCount}</span>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}