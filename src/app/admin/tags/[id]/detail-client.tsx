"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { TAG_POSITIONS } from "@/lib/tag-positions"
import { ArrowLeft, Loader2, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

/* ──────────────────── 类型 ──────────────────── */

interface TagItem {
  id: string
  name: string
  color: string
  gameCount: number
  description?: string | null
  groupId?: string | null
  sortOrder?: number
  isVisible?: boolean
}

interface GroupInfo {
  id: string
  name: string
  description: string
  color: string
  positions: string[]
  isPreset?: boolean
}

interface AllGroup {
  id: string
  name: string
  color: string
}

/* ──────────────────── 常量 ──────────────────── */

const PRESET_COLORS = [
  "#7c8a9e", "#6b7280", "#9ca3af",
  "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8", "#22d3ee",
  "#34d399", "#4ade80", "#facc15", "#fb923c", "#f87171",
  "#e879f9", "#f472b6",
]

/* ──────────────────── 颜色选择器 ──────────────────── */

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const [hexInput, setHexInput] = useState(value)

  function handleHexChange(v: string) {
    setHexInput(v)
    if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setHexInput(c); onChange(c) }}
            className={`h-8 w-8 rounded-full transition-all ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-110"
                : "hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(e) => { setHexInput(e.target.value); onChange(e.target.value) }} className="h-10 w-10 rounded-lg cursor-pointer border-0 bg-transparent" />
        <input type="text" value={hexInput} onChange={(e) => handleHexChange(e.target.value)} placeholder="#000000" className="w-32 rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground font-mono ring-1 ring-border outline-none focus:ring-ring" />
        <div className="h-8 w-8 rounded-full ring-1 ring-border" style={{ background: value }} />
      </div>
    </div>
  )
}

/* ──────────────────── 主组件 ──────────────────── */

export function TagGroupDetailClient({
  group,
  tags: initialTags,
  allGroups,
}: {
  group: GroupInfo
  tags: TagItem[]
  allGroups: AllGroup[]
}) {
  const router = useRouter()
  const [tags, setTags] = useState(initialTags)
  const [searchQuery, setSearchQuery] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // 新建标签
  const [showCreate, setShowCreate] = useState(false)
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(group.color || PRESET_COLORS[0])

  // 编辑标签
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editGroupId, setEditGroupId] = useState("")
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editVisible, setEditVisible] = useState(true)

  // 删除确认
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string; name: string; count?: number; forceDelete?: boolean
  } | null>(null)

  // 过滤
  const filteredTags = useMemo(() => {
    if (!searchQuery.trim()) return tags
    const q = searchQuery.toLowerCase()
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, searchQuery])

  /* ── CRUD ── */

  async function handleCreateTag() {
    if (!newTagName.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor,
          groupId: group.id,
          sortOrder: 0,
          isVisible: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "创建失败"); setSaving(false); return }
      setTags((prev) => [...prev, { ...data, gameCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)))
      setNewTagName("")
      setShowCreate(false)
      toast.success("标签创建成功")
    } catch { setError("网络错误") }
    setSaving(false)
  }

  function openEdit(tag: TagItem) {
    setEditingTag(tag.id)
    setEditName(tag.name)
    setEditDesc(tag.description ?? "")
    setEditColor(tag.color)
    setEditGroupId(tag.groupId ?? "")
    setEditSortOrder(tag.sortOrder ?? 0)
    setEditVisible(tag.isVisible !== false)
  }

  async function handleUpdateTag() {
    if (!editingTag || !editName.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/tags/${editingTag}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc,
          color: editColor,
          groupId: editGroupId || group.id,
          sortOrder: editSortOrder,
          isVisible: editVisible,
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "更新失败"); setSaving(false); return }
      // 如果移到别的组，从当前列表移除
      if (data.groupId && data.groupId !== group.id) {
        setTags((prev) => prev.filter((t) => t.id !== editingTag))
        toast.success("已移动到其他标签组")
      } else {
        setTags((prev) =>
          prev.map((t) =>
            t.id === editingTag
              ? { ...t, name: data.name, color: data.color, description: data.description, groupId: data.groupId, sortOrder: data.sortOrder, isVisible: data.isVisible }
              : t
          )
        )
        toast.success("已保存")
      }
      setEditingTag(null)
    } catch { setError("网络错误") }
    setSaving(false)
  }

  async function handleDeleteTag(id: string, forceDelete = false) {
    const method = forceDelete ? "PATCH" : "DELETE"
    const body = forceDelete ? JSON.stringify({ forceDelete: true }) : undefined
    const res = await fetch(`/api/admin/tags/${id}`, {
      method,
      headers: forceDelete ? { "Content-Type": "application/json" } : undefined,
      body,
    })
    const data = await res.json()
    if (res.ok) {
      setTags((prev) => prev.filter((t) => t.id !== id))
      toast.success("已删除")
    } else if (data.confirm) {
      setDeleteConfirm({ id, name: data.error, count: data.gameCount, forceDelete: true })
    } else {
      toast.error(data.error || "删除失败")
    }
  }

  const inputCls = "w-full rounded-xl bg-secondary px-5 py-3 text-base text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"

  return (
    <div className="space-y-6">
      {/* ── 顶部导航 ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/tags")}
          className="flex items-center gap-2.5 rounded-2xl bg-secondary px-6 py-3.5 text-base font-semibold text-foreground ring-1 ring-border hover:ring-violet-500/40 hover:bg-violet-500/5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-5 w-5" />
          返回标签组总览
        </button>
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 rounded-full" style={{ background: group.color }} />
          <h1 className="text-2xl font-bold text-foreground">{group.name}</h1>
          {group.isPreset && (
            <span className="text-xs text-amber-400/80 bg-amber-500/10 rounded-full px-3 py-1 ring-1 ring-amber-500/20">内置</span>
          )}
          <span className="text-base text-muted-foreground">
            {tags.length} 个标签 · {tags.reduce((s, t) => s + t.gameCount, 0)} 次关联
          </span>
        </div>
      </div>

      {group.description && (
        <p className="text-base text-muted-foreground">{group.description}</p>
      )}

      {Array.isArray(group.positions) && group.positions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {group.positions.map((posKey: string) => {
            const def = TAG_POSITIONS.find((p) => p.key === posKey)
            if (!def) return null
            return (
              <span key={posKey} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium bg-secondary text-muted-foreground ring-1 ring-border" title={def.description}>
                {def.icon} {def.label}
              </span>
            )
          })}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-500/10 px-5 py-3 text-base text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* ── 搜索 + 新建 ── */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签…"
            className="w-full rounded-xl bg-secondary pl-12 pr-4 py-3 text-base text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
          />
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 rounded-xl bg-violet-500/10 text-violet-400 px-5 py-3 text-base font-semibold ring-1 ring-violet-500/20 hover:bg-violet-500/20 transition-all cursor-pointer"
        >
          {showCreate ? <X className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
          {showCreate ? "收起" : "新建标签"}
        </button>
      </div>

      {/* ── 新建标签表单 ── */}
      {showCreate && (
        <div className="rounded-2xl bg-card p-6 ring-1 ring-border space-y-4">
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="输入标签名称"
            className={inputCls}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setShowCreate(false) }}
          />
          <ColorPicker value={newTagColor} onChange={setNewTagColor} />
          <button
            onClick={handleCreateTag}
            disabled={saving || !newTagName.trim()}
            className="flex items-center gap-2 rounded-xl bg-violet-500 text-white px-6 py-3 text-base font-semibold hover:bg-violet-600 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
            创建标签
          </button>
        </div>
      )}

      {/* ── 标签胶囊流 ── */}
      {filteredTags.length === 0 ? (
        <div className="rounded-2xl bg-card p-12 text-center ring-1 ring-border">
          <p className="text-lg text-muted-foreground">
            {searchQuery ? "没有找到匹配的标签" : "该标签组暂无标签，点击上方「新建标签」开始创建"}
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="group/capsule relative">
              {/* 胶囊主体 */}
              <div
                className="inline-flex items-center gap-3 rounded-2xl bg-secondary/60 px-5 py-3.5 ring-1 ring-border transition-all duration-200 hover:ring-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 cursor-default select-none"
              >
                {/* 标签色点 */}
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: tag.color }} />

                {/* 标签名 */}
                <span className="text-lg font-semibold text-foreground">{tag.name}</span>

                {/* 游戏数量徽章 */}
                <span
                  className="inline-flex items-center justify-center min-w-[2rem] h-7 rounded-full bg-muted/60 px-2.5 text-sm font-bold text-muted-foreground transition-all duration-200 group-hover/capsule:bg-violet-500 group-hover/capsule:text-white"
                >
                  {tag.gameCount}
                </span>

                {/* 隐藏标记 */}
                {tag.isVisible === false && (
                  <span className="text-sm text-muted-foreground/50">🚫</span>
                )}

                {/* 悬停操作按钮 */}
                <div className="flex items-center gap-1 opacity-0 group-hover/capsule:opacity-100 transition-opacity duration-200">
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(tag) }}
                    title="编辑"
                    className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteConfirm({ id: tag.id, name: tag.name, count: tag.gameCount })
                    }}
                    title="删除"
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* 内联编辑面板 */}
              {editingTag === tag.id && (
                <div className="absolute left-0 top-full mt-2 z-30 w-96 rounded-2xl bg-card p-5 ring-1 ring-border shadow-2xl shadow-black/30 space-y-3">
                  <div className="flex gap-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="标签名称"
                      className="flex-1 rounded-xl bg-secondary px-4 py-2.5 text-base text-foreground ring-1 ring-border outline-none focus:ring-ring"
                      autoFocus
                    />
                    <select
                      value={editGroupId}
                      onChange={(e) => setEditGroupId(e.target.value)}
                      className="w-40 shrink-0 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
                    >
                      {allGroups.map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="标签描述（可选）"
                    className="w-full rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
                  />
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(Number(e.target.value))}
                      title="排序值"
                      className="w-20 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setEditVisible(!editVisible)}
                      className={`rounded-xl px-4 py-2.5 text-sm ring-1 ring-border transition-colors cursor-pointer ${
                        editVisible ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {editVisible ? "👁 可见" : "🚫 隐藏"}
                    </button>
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex items-center gap-3">
                    <button
                      onClick={handleUpdateTag}
                      disabled={saving || !editName.trim()}
                      className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-base font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      保存
                    </button>
                    <button
                      onClick={() => setEditingTag(null)}
                      className="rounded-xl bg-secondary px-5 py-2.5 text-base text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── 删除确认 ── */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => { if (!v) setDeleteConfirm(null) }}
        onConfirm={() => {
          if (deleteConfirm) handleDeleteTag(deleteConfirm.id, !!deleteConfirm.forceDelete)
          setDeleteConfirm(null)
        }}
        title="删除标签"
        description={
          deleteConfirm?.count && deleteConfirm.count > 0
            ? `标签「${deleteConfirm.name}」正被 ${deleteConfirm.count} 个游戏使用，删除后将解除所有关联。`
            : `确定删除标签「${deleteConfirm?.name}」？`
        }
        confirmText="删除"
        variant="destructive"
      />
    </div>
  )
}