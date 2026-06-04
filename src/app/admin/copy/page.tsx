"use client"

import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { RotateCcw, Save } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface CopyEntry {
  key: string
  label: string
  category: string
  default: string
  value: string
  isOverridden: boolean
}

export default function CopyEditorPage() {
  const [entries, setEntries] = useState<CopyEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [changedKeys, setChangedKeys] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/admin/copy")
      .then(r => r.json())
      .then(data => { setEntries(data.entries || []); setLoading(false) })
      .catch(() => { toast.error("加载失败"); setLoading(false) })
  }, [])

  const handleChange = useCallback((key: string, newValue: string) => {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, value: newValue } : e))
    setChangedKeys(prev => new Set(prev).add(key))
  }, [])

  const handleResetOne = useCallback((key: string) => {
    setEntries(prev => prev.map(e => e.key === key ? { ...e, value: "", isOverridden: false } : e))
    setChangedKeys(prev => new Set(prev).add(key))
  }, [])

  const hasChanges = changedKeys.size > 0

  const handleSave = useCallback(async () => {
    const updates = entries
      .filter(e => changedKeys.has(e.key))
      .map(e => ({ key: e.key, value: e.value }))

    if (updates.length === 0) return

    setSaving(true)
    try {
      const res = await fetch("/api/admin/copy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      })
      if (res.ok) {
        toast.success("文案已保存")
        setChangedKeys(new Set())
        // 重新加载以获取最新状态
        const data = await fetch("/api/admin/copy").then(r => r.json())
        setEntries(data.entries || [])
      } else {
        toast.error("保存失败")
      }
    } catch {
      toast.error("保存失败")
    } finally {
      setSaving(false)
    }
  }, [entries, changedKeys])

  const handleResetAll = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/copy", { method: "DELETE" })
      if (res.ok) {
        toast.success("已恢复全部默认文案")
        setChangedKeys(new Set())
        const data = await fetch("/api/admin/copy").then(r => r.json())
        setEntries(data.entries || [])
      } else {
        toast.error("重置失败")
      }
    } catch {
      toast.error("重置失败")
    } finally {
      setSaving(false)
      setShowResetConfirm(false)
    }
  }, [])

  // 按分类分组
  const categories = entries.reduce<Record<string, CopyEntry[]>>((acc, entry) => {
    if (!acc[entry.category]) acc[entry.category] = []
    acc[entry.category].push(entry)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold text-foreground">文案管理</h1>
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">文案管理</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            自定义前台显示的文字，留空则使用默认值
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowResetConfirm(true)}
            disabled={saving}
          >
            <RotateCcw className="h-4 w-4 mr-1.5" /> 恢复全部默认
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <span className="h-4 w-4 mr-1.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            保存修改
          </Button>
        </div>
      </div>

      {Object.entries(categories).map(([category, items]) => (
        <div key={category} className="rounded-xl bg-card ring-1 ring-border p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">{category}</h2>
          <div className="space-y-3">
            {items.map(entry => {
              const effectiveValue = entry.value || entry.default
              const isChanged = changedKeys.has(entry.key)
              const isOverridden = entry.isOverridden || (isChanged && entry.value !== "")

              return (
                <div key={entry.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                      {entry.label}
                    </label>
                    {isOverridden && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                        已自定义
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={effectiveValue}
                      onChange={e => handleChange(entry.key, e.target.value)}
                      placeholder={entry.default}
                      className="flex-1 rounded-lg bg-muted px-3 py-2 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring transition-all"
                    />
                    {isOverridden && (
                      <button
                        onClick={() => handleResetOne(entry.key)}
                        className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-colors hover:bg-accent hover:text-foreground"
                        title="恢复默认"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  {isOverridden && (
                    <p className="text-[10px] text-muted-foreground/60">
                      默认：{entry.default}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}

      <ConfirmDialog
        open={showResetConfirm}
        onOpenChange={setShowResetConfirm}
        title="恢复全部默认"
        description="所有自定义文案将被清除，恢复为系统默认值。"
        variant="destructive"
        confirmText="确认恢复"
        onConfirm={handleResetAll}
      />
    </div>
  )
}
