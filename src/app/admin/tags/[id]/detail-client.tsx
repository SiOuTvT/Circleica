"use client"

import { Card } from "@/components/ui/card"
import { ArrowLeft, Loader2, Pencil, Plus, Search, X } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

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
        {TAG_PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setHexInput(c); onChange(c) }}
            className={`h-7 w-7 rounded-full transition-all cursor-pointer ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                : "hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input type="color" value={value} onChange={(e) => { setHexInput(e.target.value); onChange(e.target.value) }} className="h-8 w-8 rounded-lg cursor-pointer border-0 bg-transparent" />
        <input type="text" value={hexInput} onChange={(e) => handleHexChange(e.target.value)} placeholder="#000000" className="w-28 rounded-lg bg-muted px-3 py-1.5 text-xs text-foreground font-mono ring-1 ring-border outline-none focus:ring-ring" />
        <div className="h-6 w-6 rounded-full ring-1 ring-border" style={{ background: value }} />
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
  const [newTagColor, setNewTagColor] = useState(group.color || TAG_PRESET_COLORS[0])

  // 编辑标签
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editDesc, setEditDesc] = useState("")
  const [editColor, setEditColor] = useState("")
  const [editGroupId, setEditGroupId] = useState("")
  const [editSortOrder, setEditSortOrder] = useState(0)
  const [editVisible, setEditVisible] = useState(true)
  const editPanelRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭编辑面板
  useEffect(() => {
    if (!editingTag) return
    function handleClick(e: PointerEvent) {
      if (editPanelRef.current && !editPanelRef.current.contains(e.target as Node)) {
        setEditingTag(null)
      }
    }
    document.addEventListener("pointerdown", handleClick)
    return () => document.removeEventListener("pointerdown", handleClick)
  }, [editingTag])

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
      const { ok, data, error } = await apiFetchSafe<any>("/api/admin/tags", {
        method: "POST",
        body: {
          name: newTagName.trim(),
          color: newTagColor,
          groupId: group.id,
          sortOrder: 0,
          isVisible: true,
        },
      })
      if (!ok) { setError(error ?? "创建失败"); setSaving(false); return }
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
      const { ok, data, error } = await apiFetchSafe<any>(`/api/admin/tags/${editingTag}`, {
        method: "PUT",
        body: {
          name: editName.trim(),
          description: editDesc,
          color: editColor,
          groupId: editGroupId || group.id,
          sortOrder: editSortOrder,
          isVisible: editVisible,
        },
      })
      if (!ok) { setError(error ?? "更新失败"); setSaving(false); return }
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

  const inputCls = "w-full rounded-lg bg-muted px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"

  return (
    <div className="space-y-5">
      {/* ── 顶部卡片 ── */}
      <Card size="comfortable" radius="xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/admin/tags")}
              className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-2.5">
              <div className="h-4 w-4 rounded-full" style={{ background: group.color }} />
              <h1 className="text-lg font-bold text-foreground">{group.name}</h1>
            </div>
            <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{tags.length} 个标签</span>
          </div>
          {!group.isPreset && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 transition-all cursor-pointer"
            >
              {showCreate ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              {showCreate ? "收起" : "新建标签"}
            </button>
          )}
        </div>

        {/* 搜索 */}
        <div className="relative max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签…" aria-label="搜索标签"
            className="rounded-lg bg-muted pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full"
          />
        </div>
      </Card>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* ── 新建标签表单 ── */}
      {showCreate && (
        <Card size="comfortable" radius="xl" className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">新建标签</h3>
          <input
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            placeholder="输入标签名称"
            className={inputCls}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateTag(); if (e.key === "Escape") setShowCreate(false) }}
          />
          <ColorPicker value={newTagColor} onChange={setNewTagColor} />
          <div className="flex gap-2">
            <button
              onClick={handleCreateTag}
              disabled={saving || !newTagName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-4 py-2 text-xs font-medium hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              创建标签
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg bg-secondary px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </Card>
      )}

      {/* ── 标签列表 ── */}
      {filteredTags.length === 0 ? (
        <Card size="comfortable" radius="xl" className="p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {searchQuery ? "没有找到匹配的标签" : "该标签组暂无标签"}
          </p>
        </Card>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {filteredTags.map((tag) => (
            <div key={tag.id} className="group relative">
              {/* 标签卡片 */}
              <div
                className="flex items-center gap-3 rounded-xl bg-card p-3.5 ring-1 ring-border transition-all duration-200 hover:ring-primary/40 hover:shadow-2 cursor-default"
              >
                {/* 颜色条 */}
                <div className="h-10 w-1.5 rounded-full shrink-0" style={{ background: tag.color || group.color }} />

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">{tag.name}</span>
                    {tag.isVisible === false && (
                      <span className="text-micro text-muted-foreground bg-secondary rounded px-1 py-0.5">隐藏</span>
                    )}
                  </div>
                  {tag.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{tag.description}</p>
                  )}
                </div>

                {/* 游戏数 */}
                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-foreground">{tag.gameCount}</span>
                  <p className="text-micro text-muted-foreground">个游戏</p>
                </div>

                {/* 编辑按钮 */}
                {!tag.id.startsWith("resource:") && (
                  <button
                    onClick={(e) => { e.stopPropagation(); openEdit(tag) }}
                    title="编辑"
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer opacity-0 group-hover:opacity-100"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                )}
              </div>

              {/* 内联编辑面板 */}
              {editingTag === tag.id && (
                <Card ref={editPanelRef} size="default" radius="xl" className="mt-2 shadow-3 space-y-3">
                  <div className="flex gap-2">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="标签名称"
                      className="flex-1 rounded-lg bg-muted px-3 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                      autoFocus
                    />
                    <select
                      value={editGroupId}
                      onChange={(e) => setEditGroupId(e.target.value)}
                      className="w-32 shrink-0 rounded-lg bg-muted px-2 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
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
                    className="w-full rounded-lg bg-muted px-3 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editSortOrder}
                      onChange={(e) => setEditSortOrder(Number(e.target.value))}
                      title="排序值"
                      className="w-16 rounded-lg bg-muted px-2 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => setEditVisible(!editVisible)}
                      className={`rounded-lg px-3 py-2 text-xs ring-1 ring-border transition-colors cursor-pointer ${
                        editVisible ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {editVisible ? "可见" : "隐藏"}
                    </button>
                  </div>
                  <ColorPicker value={editColor} onChange={setEditColor} />
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={handleUpdateTag}
                      disabled={saving || !editName.trim()}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      保存
                    </button>
                    <button
                      onClick={() => setEditingTag(null)}
                      className="rounded-lg bg-secondary px-4 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    >
                      取消
                    </button>
                  </div>
                </Card>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
