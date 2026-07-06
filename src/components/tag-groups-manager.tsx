"use client"

import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { TAG_POSITIONS } from "@/lib/tag-positions"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, ChevronDown, ChevronRight, Loader2, Lock, Pencil, Plus, Search, Trash2, X } from "lucide-react"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { ColorPicker } from "./color-picker"
import { TagInlineEditor } from "./tag-inline-editor"
import { PositionCheckboxGroup } from "./tag-position-checkbox"
import { ConfirmDialog } from "./ui/confirm-dialog"

/* ──────────────────── 类型 ──────────────────── */

export interface TagInGroup {
  id: string
  name: string
  color: string
  gameCount: number
  groupId?: string | null
  description?: string
  sortOrder?: number
  isVisible?: boolean
}

export interface TagGroup {
  id: string
  name: string
  description: string
  color: string
  positions: string[]
  isPreset?: boolean
  tags: TagInGroup[]
}

/* ──────────────────── 常量 ──────────────────── */

const PRESET_COLORS = TAG_PRESET_COLORS

/* ──────────────────── 主组件 ──────────────────── */

export function TagGroupsManager({ initialGroups, initialUngroupedTags }: { initialGroups: TagGroup[]; initialUngroupedTags?: TagInGroup[] }) {
  const [groups, setGroups] = useState(initialGroups)
  const [ungroupedTags, setUngroupedTags] = useState<TagInGroup[]>(initialUngroupedTags ?? [])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editingTag, setEditingTag] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showCreateGroup, setShowCreateGroup] = useState(false)
  const [showCreateTag, setShowCreateTag] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "group" | "tag"
    id: string
    name: string
    count?: number
    forceEndpoint?: boolean
  } | null>(null)

  // 新建标签组表单
  const [newGroupName, setNewGroupName] = useState("")
  const [newGroupDesc, setNewGroupDesc] = useState("")
  const [newGroupColor, setNewGroupColor] = useState(PRESET_COLORS[0])
  const [newGroupPositions, setNewGroupPositions] = useState<string[]>([])

  // 编辑标签组表单
  const [editGroupName, setEditGroupName] = useState("")
  const [editGroupDesc, setEditGroupDesc] = useState("")
  const [editGroupColor, setEditGroupColor] = useState("")
  const [editGroupPositions, setEditGroupPositions] = useState<string[]>([])

  // 新建标签表单
  const [newTagName, setNewTagName] = useState("")
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0])

  /* ── 过滤逻辑 ── */
  const filteredGroups = useMemo(() => {
    if (!searchQuery.trim()) return groups
    const q = searchQuery.toLowerCase()
    return groups.filter(
      (g) =>
        g.name.toLowerCase().includes(q) ||
        g.tags.some((t) => t.name.toLowerCase().includes(q))
    )
  }, [groups, searchQuery])

  /* ── 标签组 CRUD ── */

  async function handleCreateGroup(e: React.FormEvent) {
    e.preventDefault()
    if (!newGroupName.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/admin/tag-groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName.trim(),
          description: newGroupDesc,
          color: newGroupColor,
          positions: newGroupPositions,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "创建失败")
        setSaving(false)
        return
      }
      setGroups((prev) =>
        [...prev, { ...data, tags: [] }].sort((a, b) => {
          if (a.isPreset && !b.isPreset) return -1
          if (!a.isPreset && b.isPreset) return 1
          return a.name.localeCompare(b.name)
        })
      )
      setNewGroupName("")
      setNewGroupDesc("")
      setNewGroupPositions([])
      setShowCreateGroup(false)
      toast.success("标签组创建成功")
    } catch {
      setError("网络错误")
    }
    setSaving(false)
  }

  async function handleUpdateGroup(id: string) {
    if (!editGroupName.trim()) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/tag-groups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDesc,
          color: editGroupColor,
          positions: editGroupPositions,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "更新失败")
        setSaving(false)
        return
      }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === id
            ? { ...g, name: data.name, description: data.description, color: data.color, positions: data.positions }
            : g
        )
      )
      setEditingGroup(null)
      toast.success("已保存")
    } catch {
      setError("网络错误")
    }
    setSaving(false)
  }

  async function handleDeleteGroup(id: string, forceDelete = false) {
    const method = forceDelete ? "PATCH" : "DELETE"
    const body = forceDelete ? JSON.stringify({ forceDelete: true }) : undefined
    const res = await fetch(`/api/admin/tag-groups/${id}`, {
      method,
      headers: forceDelete ? { "Content-Type": "application/json" } : undefined,
      body,
    })
    const data = await res.json()
    if (res.ok) {
      setGroups((prev) => prev.filter((g) => g.id !== id))
      toast.success("已删除")
    } else if (data.confirm) {
      setDeleteConfirm({
        type: "group",
        id,
        name: data.error,
        count: data.tagCount,
        forceEndpoint: true,
      })
    } else {
      toast.error(data.error || "删除失败")
    }
  }

  function startEditGroup(group: TagGroup) {
    setEditingGroup(group.id)
    setEditGroupName(group.name)
    setEditGroupDesc(group.description)
    setEditGroupColor(group.color)
    setEditGroupPositions(group.positions || [])
  }

  /* ── 标签 CRUD ── */

  async function handleCreateTag(groupId: string) {
    if (!newTagName.trim()) return
    setSaving(true)
    setError("")
    try {
      const group = groups.find((g) => g.id === groupId)
      const res = await fetch("/api/admin/tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTagName.trim(),
          color: newTagColor || group?.color || PRESET_COLORS[0],
          groupId,
          sortOrder: 0,
          isVisible: true,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "创建失败")
        setSaving(false)
        return
      }
      setGroups((prev) =>
        prev.map((g) =>
          g.id === groupId
            ? { ...g, tags: [...g.tags, { ...data, gameCount: 0 }].sort((a, b) => a.name.localeCompare(b.name)) }
            : g
        )
      )
      setNewTagName("")
      setShowCreateTag(null)
      toast.success("标签创建成功")
    } catch {
      setError("网络错误")
    }
    setSaving(false)
  }

  async function handleUpdateTag(tagId: string, data: { name: string; description: string; color: string; groupId: string | null; sortOrder: number; isVisible: boolean }) {
    if (!data.name) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? "更新失败")
        setSaving(false)
        return
      }
      // 更新标签，如果换了组就移动
      setGroups((prev) => {
        const newGroups = prev.map((g) => ({
          ...g,
          tags: g.tags.filter((t) => t.id !== tagId),
        }))
        const targetGroupId = result.groupId
        return newGroups.map((g) =>
          g.id === targetGroupId
            ? {
                ...g,
                tags: [
                  ...g.tags,
                  {
                    id: result.id,
                    name: result.name,
                    color: result.color,
                    gameCount: result.gameCount ?? 0,
                    description: result.description,
                    groupId: result.groupId,
                    sortOrder: result.sortOrder,
                    isVisible: result.isVisible,
                  },
                ].sort((a, b) => a.name.localeCompare(b.name)),
              }
            : g
        )
      })
      setEditingTag(null)
      toast.success("已保存")
    } catch {
      setError("网络错误")
    }
    setSaving(false)
  }

  async function handleUpdateUngroupedTag(tagId: string, data: { name: string; description: string; color: string; groupId: string | null; sortOrder: number; isVisible: boolean }) {
    if (!data.name) return
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/admin/tags/${tagId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error ?? "更新失败")
        setSaving(false)
        return
      }
      // 从未分组列表中移除
      setUngroupedTags((prev) => prev.filter((t) => t.id !== tagId))
      // 如果分配了组，添加到对应组
      if (result.groupId) {
        setGroups((prev) =>
          prev.map((g) =>
            g.id === result.groupId
              ? {
                  ...g,
                  tags: [
                    ...g.tags,
                    {
                      id: result.id,
                      name: result.name,
                      color: result.color,
                      gameCount: result.gameCount ?? 0,
                      description: result.description,
                      groupId: result.groupId,
                      sortOrder: result.sortOrder,
                      isVisible: result.isVisible,
                    },
                  ].sort((a, b) => a.name.localeCompare(b.name)),
                }
              : g
          )
        )
      } else {
        // 未分配组，放回未分组列表
        setUngroupedTags((prev) =>
          [
            ...prev,
            {
              id: result.id,
              name: result.name,
              color: result.color,
              gameCount: result.gameCount ?? 0,
              description: result.description,
              groupId: result.groupId,
              sortOrder: result.sortOrder,
              isVisible: result.isVisible,
            },
          ].sort((a, b) => a.name.localeCompare(b.name))
        )
      }
      setEditingTag(null)
      toast.success("已保存")
    } catch {
      setError("网络错误")
    }
    setSaving(false)
  }

  async function handleDeleteTag(tagId: string, forceDelete = false) {
    const method = forceDelete ? "PATCH" : "DELETE"
    const body = forceDelete ? JSON.stringify({ forceDelete: true }) : undefined
    const res = await fetch(`/api/admin/tags/${tagId}`, {
      method,
      headers: forceDelete ? { "Content-Type": "application/json" } : undefined,
      body,
    })
    const data = await res.json()
    if (res.ok) {
      setGroups((prev) =>
        prev.map((g) => ({ ...g, tags: g.tags.filter((t) => t.id !== tagId) }))
      )
      setUngroupedTags((prev) => prev.filter((t) => t.id !== tagId))
      toast.success("已删除")
    } else if (data.confirm) {
      setDeleteConfirm({
        type: "tag",
        id: tagId,
        name: data.error,
        count: data.gameCount,
        forceEndpoint: true,
      })
    } else {
      toast.error(data.error || "删除失败")
    }
  }

  /* ── 统计 ── */
  const totalTags = groups.reduce((sum, g) => sum + g.tags.length, 0)
  const totalGames = groups.reduce((sum, g) => sum + g.tags.reduce((s, t) => s + t.gameCount, 0), 0)

  const inputCls =
    "w-full rounded-xl bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 ring-1 ring-border outline-none focus:ring-ring transition-all"

  return (
    <div className="space-y-4">
      {/* ── 顶部标题栏 ── */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-primary" />
          标签管理
          <span className="text-xs font-normal text-muted-foreground">
            {groups.length} 个组 · {totalTags} 个标签 · {totalGames} 次关联
          </span>
        </h2>
        <div className="flex items-center gap-2">
          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索标签…"
              className="rounded-lg bg-secondary pl-8 pr-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring w-36 transition-all"
            />
          </div>
          <button
            onClick={() => setShowCreateGroup(!showCreateGroup)}
            className="flex items-center gap-1.5 rounded-xl bg-primary/10 text-primary px-3 py-1.5 text-xs font-semibold ring-1 ring-primary/20 hover:bg-primary/20 transition-all"
          >
            {showCreateGroup ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showCreateGroup ? "收起" : "新建标签组"}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-500/10 px-4 py-2.5 text-sm text-red-400 ring-1 ring-red-500/20">
          {error}
        </div>
      )}

      {/* ── 新建标签组表单 ── */}
      {showCreateGroup && (
        <form
          onSubmit={handleCreateGroup}
          className="rounded-xl bg-card p-5 ring-1 ring-border space-y-4"
        >
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="标签组名称（如：题材、风格、制作商）"
            className={inputCls}
          />
          <input
            value={newGroupDesc}
            onChange={(e) => setNewGroupDesc(e.target.value)}
            placeholder="描述（可选）"
            className={inputCls}
          />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">标签组颜色</p>
            <ColorPicker value={newGroupColor} onChange={setNewGroupColor} />
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              绑定展示方位
              <span className="ml-1 text-muted-foreground/60">（选择该标签组在前台哪些位置展示）</span>
            </p>
            <PositionCheckboxGroup selected={newGroupPositions} onChange={setNewGroupPositions} />
          </div>
          <button
            type="submit"
            disabled={saving || !newGroupName.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            创建标签组
          </button>
        </form>
      )}

      {/* ── 标签组卡片列表 ── */}
      <div className="grid grid-cols-1 gap-4">
        {filteredGroups.length === 0 && (
          <div className="col-span-full rounded-xl bg-card p-8 text-center ring-1 ring-border">
            <p className="text-sm text-muted-foreground">
              {searchQuery ? "没有找到匹配的标签" : "暂无标签组，点击上方「新建标签组」开始创建"}
            </p>
          </div>
        )}

        {filteredGroups.map((group) => {
          const isExpanded = expanded === group.id
          const isEditingGroup = editingGroup === group.id
          const isAddingTag = showCreateTag === group.id

          return (
              <div
                key={group.id}
                className="rounded-xl bg-card ring-1 ring-border transition-all duration-200 hover:ring-primary/40 hover:shadow-lg hover:shadow-primary/5"
              >
              {/* ── 标签组头部 ── */}
              {isEditingGroup ? (
                /* 编辑模式 */
                <div className="p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 shrink-0 rounded-full" style={{ background: editGroupColor }} />
                    <input
                      value={editGroupName}
                      onChange={(e) => setEditGroupName(e.target.value)}
                      placeholder="标签组名称"
                      className="flex-1 rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
                      autoFocus
                    />
                    {group.isPreset && (
                      <Badge variant="warning" size="sm">
                        <Lock className="h-3 w-3" strokeWidth={2} /> 内置
                      </Badge>
                    )}
                  </div>
                  <input
                    value={editGroupDesc}
                    onChange={(e) => setEditGroupDesc(e.target.value)}
                    placeholder="描述（可选）"
                    className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                  />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">颜色</p>
                    <ColorPicker value={editGroupColor} onChange={setEditGroupColor} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">展示方位</p>
                    <PositionCheckboxGroup selected={editGroupPositions} onChange={setEditGroupPositions} />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateGroup(group.id)}
                      disabled={saving}
                      className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
                    >
                      {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                      保存
                    </button>
                    <button
                      onClick={() => setEditingGroup(null)}
                      className="rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                /* 展示模式 */
                <div className="p-5">
                  <div className="flex items-center gap-3">
                    {/* 展开/收起按钮 */}
                    <button
                      onClick={() => setExpanded(isExpanded ? null : group.id)}
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                    >
                      <div className="h-4 w-4 shrink-0 rounded-full" style={{ background: group.color }} />
                      <span className="text-base font-semibold text-foreground">{group.name}</span>
                      {group.isPreset && (
                        <Badge variant="warning" size="sm">
                          内置
                        </Badge>
                      )}
                      {group.description && (
                        <span className="text-xs text-muted-foreground truncate hidden sm:inline">
                          {group.description}
                        </span>
                      )}
                      <span className="shrink-0 text-sm text-muted-foreground">
                        {group.tags.length} 个标签
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      )}
                    </button>

                    {/* 操作按钮 */}
                    <button
                      onClick={() => startEditGroup(group)}
                      title="编辑标签组"
                      className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {!group.isPreset && (
                      <button
                        onClick={() =>
                          setDeleteConfirm({
                            type: "group",
                            id: group.id,
                            name: group.name,
                            count: group.tags.length,
                          })
                        }
                        title="删除标签组"
                        className="shrink-0 rounded-lg bg-secondary p-1.5 text-muted-foreground hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {/* 方位标签行 */}
                  {group.positions && group.positions.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {group.positions.map((posKey) => {
                        const def = TAG_POSITIONS.find((p) => p.key === posKey)
                        if (!def) return null
                        return (
                          <Badge variant="secondary" size="sm" title={def.description}>
                            {def.icon} {def.label}
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ── 展开的标签区域 ── */}
              {isExpanded && !isEditingGroup && (
                <div className="px-5 pb-5 space-y-4">
                  {/* 标签网格 */}
                  {group.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {group.tags.map((tag) => (
                        <div key={tag.id} className="group/tag relative">
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 cursor-default select-none"
                            style={{
                              background: tag.color + "18",
                              color: tag.color,
                              borderColor: tag.color + "30",
                            }}
                          >
                            <span
                              className="h-1.5 w-1.5 rounded-full shrink-0"
                              style={{ background: tag.color }}
                            />
                            {tag.name}
                            <span
                              className="text-micro opacity-60 ml-0.5"
                              title={`绑定 ${tag.gameCount} 个游戏`}
                            >
                              {tag.gameCount}
                            </span>

                            {/* 悬停显示的操作按钮 */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingTag(tag.id)
                              }}
                              title="编辑"
                              className="opacity-0 group-hover/tag:opacity-100 ml-0.5 p-0.5 rounded hover:bg-white/10 transition-all"
                            >
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setDeleteConfirm({
                                  type: "tag",
                                  id: tag.id,
                                  name: tag.name,
                                  count: tag.gameCount,
                                })
                              }}
                              title="删除"
                              className="opacity-0 group-hover/tag:opacity-100 p-0.5 rounded hover:bg-red-500/20 hover:!text-red-400 transition-all"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </span>

                          {/* 标签内联编辑 */}
                          {editingTag === tag.id && (
                            <div className="absolute left-0 top-full mt-1 z-20 w-80">
                              <TagInlineEditor
                                tag={tag}
                                groups={groups}
                                saving={saving}
                                onSave={(data) => handleUpdateTag(tag.id, data)}
                                onCancel={() => setEditingTag(null)}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground/60 italic">该标签组暂无标签</p>
                  )}

                  {/* 添加标签到该组 */}
                  {isAddingTag ? (
                    <div className="flex gap-2">
                      <input
                        value={newTagName}
                        onChange={(e) => setNewTagName(e.target.value)}
                        placeholder="新标签名称"
                        className="flex-1 rounded-lg bg-secondary px-3 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateTag(group.id)
                          if (e.key === "Escape") setShowCreateTag(null)
                        }}
                      />
                      <ColorPicker value={newTagColor} onChange={setNewTagColor} />
                      <button
                        onClick={() => handleCreateTag(group.id)}
                        disabled={saving || !newTagName.trim()}
                        className="shrink-0 flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:opacity-50"
                      >
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                        添加
                      </button>
                      <button
                        onClick={() => setShowCreateTag(null)}
                        className="shrink-0 rounded-lg bg-secondary px-2 py-2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setNewTagColor(group.color)
                        setShowCreateTag(group.id)
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground ring-1 ring-border hover:ring-violet-500/30 transition-all"
                    >
                      <Plus className="h-3 w-3" />
                      添加标签到「{group.name}」
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* ── 未分组标签 ── */}
      {(() => {
        if (ungroupedTags.length === 0) return null
        return (
          <div className="rounded-xl bg-card ring-1 ring-border p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" strokeWidth={2} /> 未分组标签（{ungroupedTags.length}）
            </h3>
            <div className="flex flex-wrap gap-2">
            {ungroupedTags.map((tag) => (
                <span
                  key={tag.id}
                  className="group/utag inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 bg-amber-500/10 text-amber-400 ring-amber-500/20"
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: tag.color }} />
                  {tag.name}
                  <span className="text-micro opacity-60">{tag.gameCount}</span>
                  <button
                    onClick={() => setEditingTag(tag.id)}
                    title="编辑并分配到标签组"
                    className="opacity-0 group-hover/utag:opacity-100 ml-0.5 p-0.5 rounded hover:bg-white/10 transition-all"
                  >
                    <Pencil className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={() =>
                      setDeleteConfirm({
                        type: "tag",
                        id: tag.id,
                        name: tag.name,
                        count: tag.gameCount,
                      })
                    }
                    title="删除"
                    className="opacity-0 group-hover/utag:opacity-100 p-0.5 rounded hover:bg-red-500/20 hover:!text-red-400 transition-all"
                  >
                    <Trash2 className="h-2.5 w-2.5" />
                  </button>

                  {/* 标签内联编辑（浮动弹窗） */}
                  {editingTag === tag.id && (
                    <div className="absolute left-0 top-full mt-1 z-20 w-80">
                      <TagInlineEditor
                        tag={tag}
                        groups={groups}
                        saving={saving}
                        onSave={(data) => handleUpdateUngroupedTag(tag.id, data)}
                        onCancel={() => setEditingTag(null)}
                      />
                    </div>
                  )}
                </span>
              ))}
            </div>
          </div>
        )
      })()}

      {/* ── 删除确认弹窗 ── */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(v) => {
          if (!v) setDeleteConfirm(null)
        }}
        onConfirm={() => {
          if (deleteConfirm) {
            if (deleteConfirm.type === "group") {
              if (deleteConfirm.forceEndpoint) {
                handleDeleteGroup(deleteConfirm.id, true)
              } else {
                handleDeleteGroup(deleteConfirm.id)
              }
            } else {
              if (deleteConfirm.forceEndpoint) {
                handleDeleteTag(deleteConfirm.id, true)
              } else {
                handleDeleteTag(deleteConfirm.id)
              }
            }
          }
          setDeleteConfirm(null)
        }}
        title={deleteConfirm?.type === "group" ? "删除标签组" : "删除标签"}
        description={
          deleteConfirm?.count && deleteConfirm.count > 0
            ? deleteConfirm.type === "group"
              ? `标签组「${deleteConfirm.name}」包含 ${deleteConfirm.count} 个标签，删除后这些标签将变为未分组状态。`
              : `标签「${deleteConfirm.name}」正被 ${deleteConfirm.count} 个游戏使用，删除后将解除所有关联。`
            : `确定删除${deleteConfirm?.type === "group" ? "标签组" : "标签"}「${deleteConfirm?.name}」？`
        }
        confirmText="删除"
        variant="destructive"
      />
    </div>
  )
}