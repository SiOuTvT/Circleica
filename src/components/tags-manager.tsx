"use client"

import { Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { TagGroup } from "./tag-groups-manager"

interface Tag {
  id: string
  name: string
  color: string
  gameCount: number
  groupId: string | null
  groupName: string | null
}

const PRESET_COLORS = [
  "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8", "#22d3ee",
  "#34d399", "#4ade80", "#facc15", "#fb923c", "#f87171",
  "#e879f9", "#f472b6",
]

export function TagsManager({ initialTags, initialGroups }: { initialTags: Tag[]; initialGroups: TagGroup[] }) {
  const [tags, setTags] = useState(initialTags)
  const [name, setName] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [groupId, setGroupId] = useState("")
  const [colorLocked, setColorLocked] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editGroupId, setEditGroupId] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), color, groupId: groupId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "创建失败"); setSaving(false); return }
      const groupName = initialGroups.find(g => g.id === data.groupId)?.name ?? null
      setTags(prev => [...prev, { ...data, gameCount: 0, groupName }].sort((a, b) => a.name.localeCompare(b.name)))
      setName("")
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleUpdate(id: string) {
    if (!editName.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch(`/api/admin/tags/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), color: editColor, groupId: editGroupId || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "更新失败"); setSaving(false); return }
      const groupName = initialGroups.find(g => g.id === data.groupId)?.name ?? null
      setTags(prev => prev.map(t => t.id === id ? { ...t, name: data.name, color: data.color, groupId: data.groupId, groupName } : t))
      setEditing(null)
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/tags/${id}`, { method: "DELETE" })
    if (res.ok) { setTags(prev => prev.filter(t => t.id !== id)); toast.success("已删除") }
    else toast.error("删除失败")
  }

  const inputCls = "w-full rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
        <span className="inline-block h-2 w-2 rounded-full bg-primary" />
        标签
      </h2>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* 新建标签 */}
      <form onSubmit={handleCreate} className="rounded-xl bg-card p-5 ring-1 ring-border space-y-3">
        <div className="flex gap-2">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="新标签名称"
            className={inputCls}
          />
          <select
            value={groupId}
            onChange={e => {
              const newGroupId = e.target.value
              setGroupId(newGroupId)
              // 自动继承标签组颜色
              const group = initialGroups.find(g => g.id === newGroupId)
              if (group) {
                setColor(group.color)
                setColorLocked(true)
              } else {
                setColorLocked(false)
              }
            }}
            className="w-40 shrink-0 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
          >
            <option value="">未分组</option>
            {initialGroups.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
          <button type="submit" disabled={saving || !name.trim()}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-4 py-2.5 text-xs font-semibold ring-1 ring-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50">
            <Plus className="h-4 w-4" strokeWidth={2} />添加
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => { setColor(c); setColorLocked(false) }}
              className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-110"}`}
              style={{ background: c }}
            />
          ))}
          {colorLocked && groupId && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
              <span className="h-3 w-3 rounded-full ring-1 ring-border" style={{ background: color }} />
              颜色已同步自标签组
            </span>
          )}
        </div>
      </form>

      {/* 标签列表 */}
      <div className="rounded-xl bg-card ring-1 ring-border divide-y divide-border overflow-hidden">
        {tags.length === 0 && (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">暂无标签</p>
        )}
        {tags.map(tag => (
          <div key={tag.id} className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50">
            {editing === tag.id ? (
              <>
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: editColor }} />
                <input value={editName} onChange={e => setEditName(e.target.value)}
                  className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                <select
                  value={editGroupId}
                  onChange={e => setEditGroupId(e.target.value)}
                  className="w-32 shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                >
                  <option value="">未分组</option>
                  {initialGroups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  {PRESET_COLORS.map(c => (
                    <button key={c} type="button" onClick={() => setEditColor(c)}
                      className={`h-5 w-5 rounded-full transition-all ${editColor === c ? "ring-2 ring-primary" : ""}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button onClick={() => handleUpdate(tag.id)} disabled={saving}
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
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: tag.color }} />
                <span className="flex-1 text-sm font-medium text-foreground">{tag.name}</span>
                {tag.groupName && (
                  <span className="shrink-0 rounded-full bg-violet-500/10 px-2 py-0.5 text-[10px] font-medium text-violet-400 ring-1 ring-violet-500/20">
                    {tag.groupName}
                  </span>
                )}
                <span className="shrink-0 text-xs text-muted-foreground">{tag.gameCount} 个游戏</span>
                <button onClick={() => { setEditing(tag.id); setEditName(tag.name); setEditColor(tag.color); setEditGroupId(tag.groupId ?? "") }}
                  className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => handleDelete(tag.id)}
                  className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}