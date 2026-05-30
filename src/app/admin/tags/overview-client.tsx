"use client"

import { ChevronDown, ExternalLink, FolderInput, Gamepad2, Layers, Plus, Tags } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
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

  // 新建标签组
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState("")
  const [newDesc, setNewDesc] = useState("")
  const [newColor, setNewColor] = useState("#6b7280")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function handleCreateGroup() {
    if (!newName.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          description: newDesc,
          color: newColor,
          positions: [],
        }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "创建失败"); setSaving(false); return }
      toast.success("标签组创建成功")
      router.refresh()
      setShowCreate(false)
      setNewName("")
      setNewDesc("")
      setNewColor("#6b7280")
    } catch { setError("网络错误") }
    setSaving(false)
  }

  const PRESET_COLORS = [
    "#6b7280", "#a78bfa", "#818cf8", "#60a5fa", "#38bdf8",
    "#22d3ee", "#34d399", "#4ade80", "#facc15", "#fb923c",
    "#f87171", "#e879f9", "#f472b6",
  ]

  return (
    <div className="space-y-8">
      {/* ── 页面标题 + 新建按钮 ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tags className="h-5 w-5 text-violet-400" />
          <h1 className="text-lg font-semibold text-foreground">标签组管理</h1>
          <span className="text-sm text-muted-foreground">{groups.length} 个标签组</span>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 rounded-lg bg-violet-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-violet-600 transition-all shadow-md shadow-violet-500/20 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          新建标签组
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20">{error}</div>
      )}

      {/* ── 新建标签组表单 ── */}
      {showCreate && (
        <div className="rounded-xl bg-card p-4 ring-1 ring-border space-y-3">
          <h2 className="text-sm font-semibold text-foreground">创建新标签组</h2>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="标签组名称"
            className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring"
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") handleCreateGroup(); if (e.key === "Escape") setShowCreate(false) }}
          />
          <input
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="描述（可选）"
            className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring"
          />
          <div className="flex flex-wrap gap-1.5">
            {PRESET_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={`h-6 w-6 rounded-full transition-all cursor-pointer ${
                  newColor.toLowerCase() === c.toLowerCase()
                    ? "ring-2 ring-violet-500 ring-offset-2 ring-offset-background scale-110"
                    : "hover:scale-110"
                }`}
                style={{ background: c }}
              />
            ))}
              <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="h-6 w-6 rounded-full cursor-pointer border-0 bg-transparent" />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleCreateGroup}
              disabled={saving || !newName.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-violet-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-violet-600 transition-all disabled:opacity-50 cursor-pointer"
            >
              {saving ? "创建中…" : "创建"}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* ── 标签组卡片网格 ── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => router.push(`/admin/tags/${g.id}`)}
            className="group/card text-left rounded-xl bg-card p-4 ring-1 ring-border transition-all duration-200 hover:ring-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-violet-500/50"
          >
            {/* 顶部：色条 + 组名 */}
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-8 w-8 rounded-lg shrink-0 transition-transform duration-200 group-hover/card:scale-110"
                style={{ background: g.color }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-foreground truncate">{g.name}</h3>
                {g.isPreset && (
                  <span className="text-xs text-amber-400/80 bg-amber-500/10 rounded-full px-1.5 py-0.5 ring-1 ring-amber-500/20">内置</span>
                )}
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover/card:opacity-100 transition-opacity" />
            </div>

            {/* 描述 */}
            {g.description && (
              <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{g.description}</p>
            )}

            {/* 统计行 */}
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Layers className="h-3.5 w-3.5 text-violet-400" />
                {g.tagCount} 个标签
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Gamepad2 className="h-3.5 w-3.5" />
                {g.totalGames} 次关联
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* ── 未分组标签区域（VNDB导入等产生的标签） ── */}
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
  const VISIBLE = 12
  const visible = expanded ? tags : tags.slice(0, VISIBLE)

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
    <div className="rounded-2xl bg-card p-5 ring-1 ring-border space-y-4">
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
            className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            {expanded ? "收起" : `展开全部`}
            <ChevronDown className="h-3 w-3 transition-transform" style={{ transform: expanded ? "rotate(180deg)" : "none" }} />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">这些标签由 VNDB 导入或手动创建时未分配到标签组，点击分配按钮将其归类。</p>
      <div className="flex flex-wrap gap-2">
        {visible.map((t) => (
          <div key={t.id} className="relative group/tag">
            <button
              type="button"
              onClick={() => {
                setAssigningId(assigningId === t.id ? null : t.id)
                setAssignTarget("")
              }}
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ring-1 transition-all hover:ring-violet-500/50 cursor-pointer"
              style={{ color: t.color, background: `${t.color}15`, borderColor: `${t.color}30` }}
            >
              {t.name}
              <span className="text-[10px] opacity-60">({t.gameCount})</span>
              <FolderInput className="h-3 w-3 opacity-40 group-hover/tag:opacity-100 transition-opacity" />
            </button>
            {/* 分配下拉 */}
            {assigningId === t.id && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-popover rounded-xl p-3 ring-1 ring-border shadow-xl min-w-[200px] space-y-2">
                <p className="text-[11px] text-muted-foreground">选择目标标签组：</p>
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
                    className="flex-1 rounded-lg bg-violet-500 text-white px-3 py-1.5 text-xs font-medium hover:bg-violet-600 disabled:opacity-50 cursor-pointer"
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
