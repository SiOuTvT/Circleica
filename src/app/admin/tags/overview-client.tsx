"use client"

import { ExternalLink, Loader2 } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { TAG_POSITIONS } from "@/lib/tag-positions"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

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

  useEffect(() => {
    function handleClick(e: PointerEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose()
      }
    }
    document.addEventListener("pointerdown", handleClick)
    return () => document.removeEventListener("pointerdown", handleClick)
  }, [onClose])

  async function handleSave() {
    setSaving(true)
    try {
      const { ok, error } = await apiFetchSafe(`/api/admin/tag-groups/${groupId}`, {
        method: "PUT",
        body: { color: value },
      })
      if (!ok) {
        toast.error(error || "保存失败")
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
      className="absolute left-0 top-full mt-2 z-30 rounded-xl bg-card p-4 ring-1 ring-border shadow-3 shadow-black/30 space-y-3 max-w-[calc(100vw-2rem)]"
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
          {saving ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />保存中…</span> : "保存"}
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
}: {
  groups: GroupCard[]
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
      {/* ── 标签组列表 ── */}
      <div className="space-y-3">
        {groups.map((g, index) => (
          <div
            key={g.id}
            role="button"
            tabIndex={0}
            onClick={() => router.push(`/admin/tags/${g.id}`)}
            onKeyDown={(e) => e.key === 'Enter' && router.push(`/admin/tags/${g.id}`)}
            className="group relative flex items-center gap-5 rounded-xl bg-card p-5 ring-1 ring-border transition-all duration-200 hover:ring-foreground/10 hover:shadow-2 cursor-pointer"
          >
            {/* 序号 */}
            <span className="flex items-center justify-center h-8 w-8 rounded-lg bg-secondary text-xs font-bold text-muted-foreground shrink-0">
              {index + 1}
            </span>

            {/* 颜色块 */}
            <div className="relative">
              <button
                type="button"
                className="h-10 w-10 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 cursor-pointer"
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

            {/* 信息 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">{g.name}</h3>
                {g.isPreset && (
                  <span className="text-micro text-muted-foreground bg-secondary rounded px-1.5 py-0.5">内置</span>
                )}
              </div>
              {g.description && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{g.description}</p>
              )}
              {/* 位置标签 */}
              {g.positions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {g.positions.map((pos) => {
                    const def = TAG_POSITIONS.find((p) => p.key === pos)
                    return def ? (
                      <Badge key={pos} variant="secondary" size="sm">
                        {def.label}
                      </Badge>
                    ) : null
                  })}
                </div>
              )}
            </div>

            {/* 标签数 */}
            <div className="text-right shrink-0">
              <span className="text-2xl font-bold text-foreground">{g.tagCount}</span>
              <p className="text-xs text-muted-foreground">个标签</p>
            </div>

            {/* 箭头 */}
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
