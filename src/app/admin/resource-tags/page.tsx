"use client"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { GripVertical, Plus, RotateCcw, Save, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface TagGroup {
  group: string
  key: string
  label: string
  options: string[]
}

export default function ResourceTagsPage() {
  const [groups, setGroups] = useState<TagGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changedGroups, setChangedGroups] = useState<Set<string>>(new Set())
  const [newValues, setNewValues] = useState<Record<string, string>>({})
  const [resetTarget, setResetTarget] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/admin/resource-tags")
      .then(r => r.json())
      .then(data => { setGroups(data.tags || []); setLoading(false) })
      .catch(() => { toast.error("加载失败"); setLoading(false) })
  }, [])

  const markChanged = useCallback((group: string) => {
    setChangedGroups(prev => new Set(prev).add(group))
  }, [])

  const handleAdd = useCallback((group: string) => {
    const val = newValues[group]?.trim()
    if (!val) return
    setGroups(prev => prev.map(g =>
      g.group === group ? { ...g, options: [...g.options, val] } : g
    ))
    setNewValues(prev => ({ ...prev, [group]: "" }))
    markChanged(group)
  }, [newValues, markChanged])

  const handleRemove = useCallback((group: string, index: number) => {
    setGroups(prev => prev.map(g =>
      g.group === group ? { ...g, options: g.options.filter((_, i) => i !== index) } : g
    ))
    markChanged(group)
  }, [markChanged])

  const handleMove = useCallback((group: string, from: number, to: number) => {
    setGroups(prev => prev.map(g => {
      if (g.group !== group) return g
      const arr = [...g.options]
      const [item] = arr.splice(from, 1)
      arr.splice(to, 0, item)
      return { ...g, options: arr }
    }))
    markChanged(group)
  }, [markChanged])

  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      for (const group of changedGroups) {
        const g = groups.find(x => x.group === group)
        if (!g) continue
        const res = await fetch("/api/admin/resource-tags", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ group: g.group, options: g.options }),
        })
        if (!res.ok) {
          const data = await res.json()
          toast.error(`保存「${g.label}」失败: ${data.error}`)
          setSaving(false)
          return
        }
      }
      toast.success("资源标签已保存")
      setChangedGroups(new Set())
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [groups, changedGroups])

  const handleReset = useCallback(async (group: string) => {
    try {
      const res = await fetch("/api/admin/resource-tags", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ group }),
      })
      if (res.ok) {
        const data = await res.json()
        setGroups(prev => prev.map(g =>
          g.group === group ? { ...g, options: data.options } : g
        ))
        setChangedGroups(prev => { const next = new Set(prev); next.delete(group); return next })
        toast.success("已恢复默认")
      }
    } catch {
      toast.error("重置失败")
    }
    setResetTarget(null)
  }, [])

  const hasChanges = changedGroups.size > 0

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-lg font-bold text-foreground">资源标签管理</h1>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">资源标签管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            管理发布资源时可选的平台、语言、运行方式等标签
          </p>
        </div>
        <Button size="sm" onClick={handleSave} disabled={!hasChanges || saving}>
          {saving ? (
            <span className="h-4 w-4 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Save className="h-4 w-4 mr-1.5" />
          )}
          保存修改
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {groups.map(g => (
          <div key={g.group} className="rounded-2xl bg-card ring-1 ring-border p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-foreground">{g.label}</h2>
              <button
                onClick={() => setResetTarget(g.group)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RotateCcw className="h-3 w-3" /> 恢复默认
              </button>
            </div>

            {/* 标签列表 */}
            <div className="flex flex-wrap gap-2">
              {g.options.map((opt, i) => (
                <div
                  key={`${opt}-${i}`}
                  className="group flex items-center gap-1 rounded-full bg-muted px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border"
                >
                  {i > 0 && (
                    <button
                      onClick={() => handleMove(g.group, i, i - 1)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                      title="上移"
                    >
                      <GripVertical className="h-3 w-3" />
                    </button>
                  )}
                  <span>{opt}</span>
                  <button
                    onClick={() => handleRemove(g.group, i)}
                    className="ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-red-500"
                    title="删除"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {g.options.length === 0 && (
                <p className="text-xs text-muted-foreground">暂无选项</p>
              )}
            </div>

            {/* 添加新标签 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={newValues[g.group] || ""}
                onChange={e => setNewValues(prev => ({ ...prev, [g.group]: e.target.value }))}
                onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAdd(g.group) } }}
                placeholder="输入新标签…"
                className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
              />
              <Button size="sm" onClick={() => handleAdd(g.group)} disabled={!newValues[g.group]?.trim()}>
                <Plus className="h-4 w-4 mr-1" /> 添加
              </Button>
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!resetTarget}
        onOpenChange={(open) => { if (!open) setResetTarget(null) }}
        title="恢复默认标签"
        description={`确定要将「${groups.find(g => g.group === resetTarget)?.label || ""}」恢复为默认选项吗？自定义的标签会丢失。`}
        variant="destructive"
        confirmText="恢复默认"
        onConfirm={() => { if (resetTarget) handleReset(resetTarget) }}
      />
    </div>
  )
}
