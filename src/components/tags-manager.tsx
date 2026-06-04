"use client"

import { Eye, EyeOff, GripVertical, Loader2, Pencil, Plus, Trash2, X } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import type { TagGroup } from "./tag-groups-manager"
import { ConfirmDialog } from "./ui/confirm-dialog"

interface Tag {
  id: string
  name: string
  description?: string
  color: string
  gameCount: number
  groupId: string | null
  groupName: string | null
  sortOrder?: number
  isVisible?: boolean
}

const PRESET_COLORS = [
  "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8", "#22d3ee",
  "#34d399", "#4ade80", "#facc15", "#fb923c", "#f87171",
  "#e879f9", "#f472b6",
]

export function TagsManager({ initialTags, initialGroups }: { initialTags: Tag[]; initialGroups: TagGroup[] }) {
  const [tags, setTags] = useState(initialTags)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [groupId, setGroupId] = useState("")
  const [sortOrder, setSortOrder] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [colorLocked, setColorLocked] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDescription, setEditDescription] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editGroupId, setEditGroupId] = useState("")
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editIsVisible, setEditIsVisible] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string; gameCount?: number; forceEndpoint?: boolean } | null>(null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true); setError("")
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description, color, groupId: groupId || null, sortOrder, isVisible }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "创建失败"); setSaving(false); return }
      const groupName = initialGroups.find(g => g.id === data.groupId)?.name ?? null
      setTags(prev => [...prev, { ...data, gameCount: 0, groupName }].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name)))
      setName(""); setDescription(""); setSortOrder(0); setIsVisible(true)
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
        body: JSON.stringify({ name: editName.trim(), description: editDescription, color: editColor, groupId: editGroupId || null, sortOrder: editSortOrder, isVisible: editIsVisible }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "更新失败"); setSaving(false); return }
      const groupName = initialGroups.find(g => g.id === data.groupId)?.name ?? null
      setTags(prev => prev.map(t => t.id === id ? { ...t, name: data.name, description: data.description, color: data.color, groupId: data.groupId, groupName, sortOrder: data.sortOrder, isVisible: data.isVisible } : t))
      setEditing(null)
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleDelete(id: string, forceDelete = false) {
    const endpoint = forceDelete ? `/api/admin/tags/${id}` : `/api/admin/tags/${id}`
    const method = forceDelete ? "PATCH" : "DELETE"
    const body = forceDelete ? JSON.stringify({ forceDelete: true }) : undefined
    const res = await fetch(endpoint, {
      method,
      headers: forceDelete ? { "Content-Type": "application/json" } : undefined,
      body,
    })
    const data = await res.json()
    if (res.ok) {
      setTags(prev => prev.filter(t => t.id !== id))
      toast.success("已删除")
    } else if (data.confirm) {
      setDeleteConfirm({ id, name: data.error, gameCount: data.gameCount, forceEndpoint: true })
    } else {
      toast.error(data.error || "删除失败")
    }
  }

  function startEditing(tag: Tag) {
    setEditing(tag.id)
    setEditName(tag.name)
    setEditDescription(tag.description ?? "")
    setEditColor(tag.color)
    setEditGroupId(tag.groupId ?? "")
    setEditSortOrder(tag.sortOrder ?? 0)
    setEditIsVisible(tag.isVisible !== false)
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
          <input value={name} onChange={e => setName(e.target.value)} placeholder="新标签名称" className={inputCls} />
          <select value={groupId} onChange={e => { const g = e.target.value; setGroupId(g); const gr = initialGroups.find(x => x.id === g); if (gr) { setColor(gr.color); setColorLocked(true) } else { setColorLocked(false) } }}
            className="w-36 shrink-0 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring">
            <option value="">未分组</option>
            {initialGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <input type="number" value={sortOrder} onChange={e => setSortOrder(Number(e.target.value))} placeholder="排序" title="排序值（小的在前）"
            className="w-20 shrink-0 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
          <button type="button" onClick={() => setIsVisible(!isVisible)} title={isVisible ? "可见" : "隐藏"}
            className={`shrink-0 rounded-xl p-2.5 ring-1 ring-border transition-colors ${isVisible ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
            {isVisible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
          <button type="submit" disabled={saving || !name.trim()}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-4 py-2.5 text-xs font-semibold ring-1 ring-primary/20 hover:bg-primary/20 transition-all disabled:opacity-50">
            <Plus className="h-4 w-4" strokeWidth={2} />添加
          </button>
        </div>
        <input value={description} onChange={e => setDescription(e.target.value)} placeholder="标签描述（可选）" className={inputCls + " text-xs"} />
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map(c => (
            <button key={c} type="button" onClick={() => { setColor(c); setColorLocked(false) }}
              className={`h-7 w-7 rounded-full transition-all ${color === c ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "hover:scale-110"}`}
              style={{ background: c }} />
          ))}
          {colorLocked && groupId && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-1">
              <span className="h-3 w-3 rounded-full ring-1 ring-border" style={{ background: color }} />颜色已同步自标签组
            </span>
          )}
        </div>
      </form>

      {/* 标签列表 */}
      <div className="rounded-xl bg-card ring-1 ring-border divide-y divide-border overflow-hidden">
        {tags.length === 0 && <p className="px-5 py-8 text-center text-sm text-muted-foreground">暂无标签</p>}
        {tags.map(tag => (
          <div key={tag.id} className={`flex items-center gap-3 px-5 py-3 transition-colors hover:bg-accent/50 ${tag.isVisible === false ? "opacity-50" : ""}`}>
            {editing === tag.id ? (
              <>
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: editColor }} />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input value={editName} onChange={e => setEditName(e.target.value)} placeholder="标签名称"
                      className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                    <select value={editGroupId} onChange={e => setEditGroupId(e.target.value)}
                      className="w-28 shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring">
                      <option value="">未分组</option>
                      {initialGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                    </select>
                    <input type="number" value={editSortOrder} onChange={e => setEditSortOrder(Number(e.target.value))} placeholder="排序" title="排序值"
                      className="w-16 shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                    <button type="button" onClick={() => setEditIsVisible(!editIsVisible)} title={editIsVisible ? "可见" : "隐藏"}
                      className={`shrink-0 rounded-lg p-1.5 ring-1 ring-border transition-colors ${editIsVisible ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"}`}>
                      {editIsVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                  <input value={editDescription} onChange={e => setEditDescription(e.target.value)} placeholder="标签描述（可选）"
                    className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring" />
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map(c => (
                      <button key={c} type="button" onClick={() => setEditColor(c)}
                        className={`h-5 w-5 rounded-full transition-all ${editColor === c ? "ring-2 ring-primary" : ""}`}
                        style={{ background: c }} />
                    ))}
                  </div>
                </div>
                <button onClick={() => handleUpdate(tag.id)} disabled={saving}
                  className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50">
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "保存"}
                </button>
                <button onClick={() => setEditing(null)} title="取消编辑" aria-label="取消编辑"
                  className="shrink-0 rounded-lg bg-secondary px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3.5 w-3.5" />
                </button>
              </>
            ) : (
              <>
                <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: tag.color }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
                    {tag.groupName && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary ring-1 ring-primary/20">{tag.groupName}</span>
                    )}
                    {tag.isVisible === false && (
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">隐藏</span>
                    )}
                  </div>
                  {tag.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{tag.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{tag.gameCount} 个游戏</span>
                <span className="shrink-0 text-[10px] text-muted-foreground/60">#{tag.sortOrder ?? 0}</span>
                <button onClick={() => startEditing(tag)} title="编辑标签" aria-label="编辑标签"
                  className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => setDeleteConfirm({ id: tag.id, name: tag.name, gameCount: tag.gameCount })} title="删除标签" aria-label="删除标签"
                  className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-red-400 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => { if (!v) setDeleteConfirm(null) }}
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm.forceEndpoint) {
              handleDelete(deleteConfirm.id, true)
            } else {
              handleDelete(deleteConfirm.id)
            }
          }
          setDeleteConfirm(null)
        }}
        title="删除标签"
        description={deleteConfirm?.gameCount && deleteConfirm.gameCount > 0
          ? `标签「${deleteConfirm.name}」正被 ${deleteConfirm.gameCount} 个游戏使用，删除后将解除所有关联。`
          : `确定删除标签「${deleteConfirm?.name}」？`}
        confirmText="删除"
        variant="destructive"
      />
    </div>
  )
}