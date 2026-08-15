"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { Pencil, Search, Tags, Trash2, X } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

/* ──────────────────── 类型 ──────────────────── */

export interface TagItem {
  id: string
  name: string
  color: string
  gameCount: number
  isVisible: boolean
  description?: string | null
  groupId: string | null
}

export interface GroupTab {
  id: string
  name: string
  color: string
  description?: string | null
  tags: TagItem[]
}

interface GroupOption {
  id: string
  name: string
  color: string
}

interface AllTagsClientProps {
  tabs: GroupTab[]
  groups: GroupOption[]
  total: number
}

/* ──────────────────── 主组件 ──────────────────── */

export function AllTagsClient({ tabs, groups, total }: AllTagsClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<string>(
    () => tabs.find((t) => t.tags.length > 0)?.id ?? tabs[0]?.id ?? ""
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "count">("name")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [deletingTag, setDeletingTag] = useState<TagItem | null>(null)
  const [, setSaving] = useState(false)

  const active = tabs.find((t) => t.id === activeTab) ?? tabs[0]
  const activeTags = useMemo(() => active?.tags ?? [], [active])

  const filtered = useMemo(() => {
    let list = activeTags
    const q = searchQuery.trim().toLowerCase()
    if (q) list = list.filter((t) => t.name.toLowerCase().includes(q))
    list = [...list]
    if (sortBy === "count") list.sort((a, b) => b.gameCount - a.gameCount)
    else list.sort((a, b) => a.name.localeCompare(b.name))
    return list
  }, [activeTags, searchQuery, sortBy])

  // 首页卡片 / 资源标签组由前台或专用管理页控制，资源伪标签只读 → 均不显示编辑/删除
  const canManage = (tab: GroupTab, tag: TagItem) =>
    tab.id !== "preset_home_card" &&
    tab.id !== "preset_resource_tab" &&
    !tag.id.startsWith("resource:")

  const editingTag = tabs.flatMap((t) => t.tags).find((t) => t.id === editingTagId) ?? null

  async function handleDelete() {
    if (!deletingTag) return
    setSaving(true)
    try {
      const { ok, error } = await apiFetchSafe(`/api/admin/tags/${deletingTag.id}`, { method: "DELETE" })
      if (!ok) { toast.error(error || "删除失败"); setSaving(false); return }
      toast.success("标签已删除")
      setDeletingTag(null)
      router.refresh()
    } catch {
      toast.error("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* ── Tab 栏（按标签组） ── */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => { setActiveTab(t.id); setEditingTagId(null) }}
            aria-pressed={activeTab === t.id}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium ring-1 transition-all cursor-pointer ${
              activeTab === t.id
                ? "bg-primary text-primary-foreground ring-primary"
                : "bg-card text-muted-foreground ring-border hover:text-foreground hover:ring-foreground/20"
            }`}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
            {t.name}
            <span className="opacity-60 tabular-nums">{t.tags.length}</span>
          </button>
        ))}
      </div>

      {/* ── 搜索 + 排序 ── */}
      <div className="flex items-center gap-2">
        <div className="relative max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索当前标签组…" aria-label="搜索标签"
            className="w-full rounded-xl border-2 border-input bg-transparent pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
          />
        </div>
        <div className="flex overflow-hidden rounded-lg bg-secondary ring-1 ring-border">
          <button
            type="button"
            aria-pressed={sortBy === "name"}
            onClick={() => setSortBy("name")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              sortBy === "name" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            默认
          </button>
          <button
            type="button"
            aria-pressed={sortBy === "count"}
            onClick={() => setSortBy("count")}
            className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
              sortBy === "count" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            数量
          </button>
        </div>
        <span className="ml-auto text-xs text-muted-foreground">共 {total} 个标签</span>
      </div>

      {/* ── 当前标签组的标签卡片（副站样式） ── */}
      {!active ? (
        <EmptyState icon={Tags} title="没有标签" description="尚未创建任何标签" bordered />
      ) : filtered.length === 0 ? (
        <EmptyState icon={Tags} title={searchQuery ? "没有找到匹配的标签" : "该标签组暂无标签"} bordered />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((tag) => (
            <div
              key={tag.id}
              className="flex flex-col rounded-xl border border-border bg-card p-3 transition-colors hover:border-[color:var(--admin-accent,var(--primary))]"
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-border"
                  style={{ background: tag.color || active.color }}
                />
                <span className="block min-w-0 flex-1 truncate font-medium text-foreground" title={tag.name}>
                  {tag.name}
                </span>
                {tag.isVisible === false && (
                  <span className="shrink-0 rounded bg-secondary px-1 py-0.5 text-micro text-muted-foreground">隐藏</span>
                )}
              </div>
              {tag.description && (
                <p className="mt-1 truncate text-xs text-muted-foreground">{tag.description}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-2">
                <span className="text-xs text-muted-foreground">关联作品 {tag.gameCount}</span>
                {canManage(active, tag) && (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingTagId(tag.id)}
                      title="编辑"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                    >
                      <Pencil className="h-3 w-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingTag(tag)}
                      title="删除"
                      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground ring-1 ring-border transition-all hover:bg-red-500/10 hover:text-red-400 cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editingTag && (
        <InlineTagEdit
          tag={editingTag}
          groups={groups}
          onClose={() => setEditingTagId(null)}
          onSaved={() => {
            setEditingTagId(null)
            router.refresh()
          }}
        />
      )}

      <ConfirmDialog
        open={!!deletingTag}
        onOpenChange={(v) => { if (!v) setDeletingTag(null) }}
        title="删除标签"
        description={`确定删除标签「${deletingTag?.name ?? ""}」？关联的标签关系将一并清除。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </div>
  )
}

/* ──────────────────── 内联编辑 ──────────────────── */

function InlineTagEdit({
  tag,
  groups,
  onClose,
  onSaved,
}: {
  tag: TagItem
  groups: GroupOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color)
  const [groupId, setGroupId] = useState(tag.groupId ?? "")
  const [saving, setSaving] = useState(false)

  const hasChanges =
    name.trim() !== tag.name ||
    color.toLowerCase() !== tag.color.toLowerCase() ||
    (groupId || null) !== tag.groupId

  async function handleSave() {
    if (!name.trim()) {
      toast.error("标签名不能为空")
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (name.trim() !== tag.name) body.name = name.trim()
      if (color.toLowerCase() !== tag.color.toLowerCase()) body.color = color
      if ((groupId || null) !== tag.groupId) body.groupId = groupId || null

      const { ok, error } = await apiFetchSafe(`/api/admin/tags/${tag.id}`, {
        method: "PUT",
        body,
      })
      if (!ok) {
        toast.error(error || "保存失败")
      } else {
        toast.success("已保存")
        onSaved()
      }
    } catch {
      toast.error("网络错误")
    }
    setSaving(false)
  }

  return (
    <div className="rounded-xl bg-muted/50 px-4 py-3 ring-1 ring-border" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-micro text-muted-foreground">名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-40 rounded-lg border-2 border-input bg-transparent px-2.5 py-2 text-[15px] text-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
          />
        </div>

        <div className="space-y-1">
          <label className="text-micro text-muted-foreground">颜色</label>
          <div className="flex items-center gap-1.5">
            {TAG_PRESET_COLORS.slice(0, 8).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full transition-all cursor-pointer ${
                  color.toLowerCase() === c.toLowerCase()
                    ? "ring-2 ring-primary ring-offset-1 ring-offset-background scale-110"
                    : "hover:scale-110"
                }`}
                style={{ background: c }}
              />
            ))}
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="h-5 w-5 rounded-full cursor-pointer border-0 bg-transparent"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-micro text-muted-foreground">标签组</label>
          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="block w-36 rounded-lg border-2 border-input bg-transparent px-2.5 py-2 text-[15px] text-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
          >
            <option value="">未分组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 cursor-pointer"
          >
            {saving ? "保存中…" : "保存"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-secondary px-2 py-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
