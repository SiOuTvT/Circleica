"use client"

import { Card } from "@/components/ui/card"
import { ArrowLeft, Layers, Search, X } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"

interface TagItem {
  id: string
  name: string
  color: string
  gameCount: number
  isVisible: boolean
  groupId: string | null
  groupName: string | null
  groupColor: string | null
}

interface GroupOption {
  id: string
  name: string
  color: string
}

export function AllTagsClient({ tags, groups }: { tags: TagItem[]; groups: GroupOption[] }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"name" | "count">("name")
  const [editingTagId, setEditingTagId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let list = tags
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      list = list.filter((t) => t.name.toLowerCase().includes(q))
    }
    if (sortBy === "count") {
      list = [...list].sort((a, b) => b.gameCount - a.gameCount)
    }
    return list
  }, [tags, searchQuery, sortBy])

  // 按标签组分组统计
  const groupStats = useMemo(() => {
    const map = new Map<string, { name: string; color: string; count: number }>()
    for (const t of tags) {
      const key = t.groupName ?? "未分组"
      const color = t.groupColor ?? "#6b7280"
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { name: key, color, count: 1 })
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [tags])

  return (
    <div className="space-y-6">
      {/* ── 顶部 ── */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/admin/tags")}
          className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border hover:ring-primary/40 hover:bg-primary/5 transition-all cursor-pointer"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回
        </button>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold text-foreground">全部标签</h1>
          <span className="text-sm text-muted-foreground">{tags.length} 个</span>
        </div>
      </div>

      {/* ── 标签组分布 ── */}
      <Card size="default" radius="xl">
        <p className="text-xs text-muted-foreground mb-3">标签组分布</p>
        <div className="flex flex-wrap gap-2">
          {groupStats.map((g) => (
            <span
              key={g.name}
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1"
              style={{ color: g.color, background: `${g.color}15`, borderColor: `${g.color}30` }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
              {g.name}
              <span className="opacity-60">{g.count}</span>
            </span>
          ))}
        </div>
      </Card>

      {/* ── 搜索 + 排序 ── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索标签…" aria-label="搜索标签"
            className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring transition-all w-full"
          />
        </div>
        <div className="flex rounded-lg bg-secondary ring-1 ring-border overflow-hidden">
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
      </div>

      {/* ── 标签列表 ── */}
      {filtered.length === 0 ? (
        <Card size="default" radius="xl" className="p-8 text-center">
          <p className="text-sm text-muted-foreground">没有找到匹配的标签</p>
        </Card>
      ) : (
        <div className="rounded-xl bg-card ring-1 ring-border overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((tag) => (
              <div key={tag.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => setEditingTagId(editingTagId === tag.id ? null : tag.id)}
                  onKeyDown={(e) => e.key === "Enter" && setEditingTagId(editingTagId === tag.id ? null : tag.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 hover:bg-accent/30 transition-colors cursor-pointer ${tag.isVisible ? "" : "opacity-50"}`}
                >
                  <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: tag.color }} />
                  <span className="flex-1 text-sm text-foreground truncate">{tag.name}</span>
                  {!tag.isVisible && (
                    <Badge variant="secondary" size="sm">隐藏</Badge>
                  )}
                  {tag.groupName && (
                    <Badge variant="default" size="sm">
                      {tag.groupName}
                    </Badge>
                  )}
                  <span className="shrink-0 text-xs tabular-nums font-medium text-muted-foreground min-w-[2rem] text-right">
                    {tag.gameCount}
                  </span>
                </div>
                {editingTagId === tag.id && (
                  <InlineTagEdit
                    tag={tag}
                    groups={groups}
                    onClose={() => setEditingTagId(null)}
                    onSaved={() => {
                      setEditingTagId(null)
                      router.refresh()
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

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

      const res = await fetch(`/api/admin/tags/${tag.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "保存失败")
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
    <div className="px-4 py-3 bg-muted/50 border-t border-border" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-end gap-3 flex-wrap">
        <div className="space-y-1">
          <label className="text-micro text-muted-foreground">名称</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="block w-40 rounded-lg bg-card px-2.5 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
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
            className="block w-36 rounded-lg bg-card px-2.5 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
          >
            <option value="">未分组</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={!hasChanges || saving}
            className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium hover:opacity-90 disabled:opacity-50 cursor-pointer"
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
