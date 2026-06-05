"use client"

import { ChevronDown, ExternalLink, FolderInput, Gamepad2, Layers, List, Tags } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"

/* ──────────────────── 类型 ──────────────────── */

interface GroupCard {
  id: string
  name: string
  description: string
  color: string
  positions: string[]
  isPreset: boolean
  tagCount: number
  totalGames: number
}

interface UngroupedTag {
  id: string
  name: string
  color: string
  gameCount: number
  description: string | null
  sortOrder: number
  isVisible: boolean
}

interface GroupOption {
  id: string
  name: string
  color: string
}

/* ──────────────────── 颜色编辑弹窗 ──────────────────── */

function ColorEditPopover({
  color,
  groupId,
  onSaved,
  onClose,
}: {
  color: string
  groupId: string
  onSaved: (newColor: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(color)
  const [saving, setSaving] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/tag-groups/${groupId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ color: value }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "保存失败")
      } else {
        onSaved(value)
        toast.success("颜色已更新")
      }
    } catch {
      toast.error("网络错误")
    }
    setSaving(false)
  }

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full mt-2 z-30 rounded-xl bg-card p-4 ring-1 ring-border shadow-xl shadow-black/30 space-y-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-wrap gap-1.5">
        {TAG_PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setValue(c)}
            className={`h-6 w-6 rounded-full transition-all cursor-pointer ${
              value.toLowerCase() === c.toLowerCase()
                ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                : "hover:scale-110"
            }`}
            style={{ background: c }}
          />
        ))}
        <input
          type="color"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="h-6 w-6 rounded-full cursor-pointer border-0 bg-transparent"
        />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded-full ring-1 ring-border shrink-0" style={{ background: value }} />
        <span className="text-xs font-mono text-muted-foreground">{value}</span>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || value.toLowerCase() === color.toLowerCase()}
          className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
        >
          {saving ? "保存中…" : "保存"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          取消
        </button>
      </div>
    </div>
  )
}

/* ──────────────────── 主组件 ──────────────────── */

export function TagsOverviewClient({
  groups,
  ungroupedTags,
  allGroups,
}: {
  groups: GroupCard[]
  ungroupedTags: UngroupedTag[]
  allGroups: GroupOption[]
}) {
  const router = useRouter()
  const [editingColorId, setEditingColorId] = useState<string | null>(null)
  const [groupColors, setGroupColors] = useState<Record<string, string>>(
    Object.fromEntries(groups.map((g) => [g.id, g.color]))
  )

  const handleColorSaved = useCallback((groupId: string, newColor: string) => {
    setGroupColors((prev) => ({ ...prev, [groupId]: newColor }))
    setEditingColorId(null)
  }, [])

  return (
    <div className="space-y-6">
      {/* ── 页面标题 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">标签组颜色</h1>
          <span className="text-sm text-muted-foreground">{groups.length} 个标签组</span>
        </div>
        <button
          onClick={() => router.push("/admin/tags/all")}
          className="flex items-center gap-1.5 rounded-lg bg-secondary text-foreground px-3 py-1.5 text-xs font-medium ring-1 ring-border hover:ring-primary/40 transition-all cursor-pointer"
        >
          <List className="h-3.5 w-3.5" />
          全部标签
        </button>
      </div>

      {/* ── 标签组卡片网格 ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((g) => (
          <div
            key={g.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/admin/tags/${g.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/tags/${g.id}`)}
            className="group/card relative text-left rounded-xl bg-card p-4 ring-1 ring-border transition-all duration-200 hover:ring-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            {/* 顶部：色块 + 组名 */}
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <button
                  type="button"
                  className="h-8 w-8 rounded-lg shrink-0 transition-transform duration-200 group-hover/card:scale-110 cursor-pointer"
                  style={{ background: groupColors[g.id] }}
                  title="编辑颜色"
                  onClick={(e) => {
                    e.stopPropagation()
                    setEditingColorId(editingColorId === g.id ? null : g.id)
                  }}
                />
                {editingColorId === g.id && (
                  <ColorEditPopover
                    color={groupColors[g.id]}
                    groupId={g.id}
                    onSaved={(c) => handleColorSaved(g.id, c)}
                    onClose={() => setEditingColorId(null)}
                  />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{g.name}</h3>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
            </div>

            {/* 统计行 */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Layers className="h-3.5 w-3.5 text-primary" />
                {g.tagCount} 个标签
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Gamepad2 className="h-3.5 w-3.5" />
                {g.totalGames} 次关联
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* ── 未分组标签区域 ── */}
      {ungroupedTags.length > 0 && (
        <UngroupedTagsSection
          tags={ungroupedTags}
          groups={allGroups}
          onAssigned={() => router.refresh()}
        />
      )}
    </div>
  )
}

/* ──────────────────── 未分组标签组件 ──────────────────── */

function UngroupedTagsSection({
  tags,
  groups,
  onAssigned,
}: {
  tags: UngroupedTag[]
  groups: GroupOption[]
  onAssigned: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState("")
  const [assignLoading, setAssignLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const VISIBLE = 12
  const visible = expanded ? tags : tags.slice(0, VISIBLE)

  // 点击外部关闭分配下拉
  useEffect(() => {
    if (!assigningId) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAssigningId(null)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [assigningId])

  async function handleAssign(tagId: string) {
    if (!assignTarget) return
    setAssignLoading(true)
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: assignTarget }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || "分配失败")
      } else {
        toast.success("已分配到标签组")
        setAssigningId(null)
        setAssignTarget("")
        onAssigned()
      }
    } catch { toast.error("网络错误") }
    setAssignLoading(false)
  }

  return (
    <div className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-sm font-semibold text-foreground">未分组标签</h2>
          <span className="text-xs text-muted-foreground bg-secondary rounded-full px-2 py-0.5">{tags.length} 个</span>
        </div>
        {tags.length > VISIBLE && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            {expanded ? "收起" : `展开全部`}
            <ChevronDown className="h-3 w-3 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          </button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {visible.map((t) => (
          <div key={t.id} ref={assigningId === t.id ? dropdownRef : undefined} className="relative group/tag">
            <button
              type="button"
              onClick={() => {
                setAssigningId(assigningId === t.id ? null : t.id)
                setAssignTarget("")
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all hover:ring-primary/50 cursor-pointer"
              style={{ color: t.color, background: `${t.color}15`, borderColor: `${t.color}30` }}
            >
              {t.name}
              <span className="text-[10px] opacity-60">({t.gameCount})</span>
              <FolderInput className="h-3 w-3 opacity-40 group-hover/tag:opacity-100 transition-opacity" />
            </button>
            {assigningId === t.id && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-popover rounded-xl p-3 ring-1 ring-border shadow-xl min-w-[200px] space-y-2">
                <select
                  value={assignTarget}
                  onChange={(e) => setAssignTarget(e.target.value)}
                  className="w-full rounded-lg bg-secondary px-3 py-2 text-xs text-foreground ring-1 ring-border outline-none"
                >
                  <option value="">-- 选择标签组 --</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAssign(t.id)}
                    disabled={!assignTarget || assignLoading}
                    className="flex-1 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
                  >
                    {assignLoading ? "分配中…" : "确认分配"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssigningId(null)}
                    className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
