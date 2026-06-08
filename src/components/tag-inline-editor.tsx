"use client"

import { Loader2 } from "lucide-react"
import { useState } from "react"
import { ColorPicker } from "./color-picker"
import type { TagGroup, TagInGroup } from "./tag-groups-manager"

export function TagInlineEditor({
  tag,
  groups,
  onSave,
  onCancel,
  saving,
}: {
  tag: TagInGroup & { description?: string; groupId?: string | null; sortOrder?: number; isVisible?: boolean }
  groups: TagGroup[]
  onSave: (data: { name: string; description: string; color: string; groupId: string | null; sortOrder: number; isVisible: boolean }) => void
  onCancel: () => void
  saving: boolean
}) {
  const [name, setName] = useState(tag.name)
  const [desc, setDesc] = useState(tag.description ?? "")
  const [color, setColor] = useState(tag.color)
  const [groupId, setGroupId] = useState(tag.groupId ?? "")
  const [sortOrder, setSortOrder] = useState(tag.sortOrder ?? 0)
  const [isVisible, setIsVisible] = useState(tag.isVisible !== false)

  return (
    <div className="rounded-xl bg-secondary/50 p-4 space-y-3 ring-1 ring-border">
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="标签名称"
          className="flex-1 rounded-lg bg-background px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring"
          autoFocus
        />
        <select
          value={groupId}
          onChange={(e) => setGroupId(e.target.value)}
          className="w-32 shrink-0 rounded-lg bg-background px-2 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
        >
          <option value="">未分组</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        <input
          type="number"
          value={sortOrder}
          onChange={(e) => setSortOrder(Number(e.target.value))}
          title="排序值（小的在前）"
          className="w-16 shrink-0 rounded-lg bg-background px-2 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
        />
        <button
          type="button"
          onClick={() => setIsVisible(!isVisible)}
          title={isVisible ? "可见" : "隐藏"}
          className={`shrink-0 rounded-lg px-2 py-1 text-xs ring-1 ring-border transition-colors ${
            isVisible ? "bg-primary/10 text-primary" : "bg-background text-muted-foreground"
          }`}
        >
          {isVisible ? "👁" : "🚫"}
        </button>
      </div>
      <input
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        placeholder="标签描述（可选）"
        className="w-full rounded-lg bg-background px-3 py-2 text-xs text-foreground ring-1 ring-border outline-none focus:ring-ring"
      />
      <ColorPicker value={color} onChange={setColor} />
      <div className="flex items-center gap-2">
        <button
          onClick={() => onSave({ name: name.trim(), description: desc, color, groupId: groupId || null, sortOrder, isVisible })}
          disabled={saving || !name.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
          保存
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-background px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          取消
        </button>
      </div>
    </div>
  )
}
