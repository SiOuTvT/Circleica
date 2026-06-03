"use client"

import { ImageUpload } from "@/components/image-upload"
import { cn } from "@/lib/utils"
import { Award, Edit2, Loader2, Plus, Save, Trash2, X } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  characterImage: string
  category: string
  conditionType: string
  conditionTarget: number
  points: number
  hidden: boolean
  isActive: boolean
  unlockCount: number
  createdAt: string
}

const CONDITION_TYPES = [
  { value: "favorite_count", label: "收藏数" },
  { value: "comment_count", label: "评论数" },
  { value: "play_count", label: "玩过数" },
  { value: "checkin_count", label: "签到天数" },
  { value: "forum_post_count", label: "论坛发帖数" },
  { value: "forum_like_received", label: "论坛被点赞数" },
  { value: "register_days", label: "注册天数" },
]

const CATEGORIES = [
  { value: "general", label: "通用" },
  { value: "collection", label: "收藏" },
  { value: "community", label: "社区" },
  { value: "loyalty", label: "忠诚" },
  { value: "special", label: "特殊" },
]

const inputCls = "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"

export default function AdminAchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Achievement> | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/achievements")
      if (res.ok) setAchievements(await res.json())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave() {
    if (!editing?.name?.trim()) { toast.error("名称不能为空"); return }
    if (!editing?.conditionType) { toast.error("请选择条件类型"); return }
    setSaving(true)
    try {
      const isEdit = editing.id
      const res = await fetch(
        isEdit ? `/api/admin/achievements/${editing.id}` : "/api/admin/achievements",
        { method: isEdit ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing) }
      )
      if (res.ok) { toast.success(isEdit ? "已更新" : "已创建"); setEditing(null); load() }
      else { toast.error("操作失败") }
    } finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm("确定删除？所有用户的解锁记录也会被删除。")) return
    const res = await fetch(`/api/admin/achievements/${id}`, { method: "DELETE" })
    if (res.ok) { toast.success("已删除"); load() }
  }

  function startCreate() {
    setEditing({
      name: "", description: "", icon: "", characterImage: "",
      category: "general", conditionType: "favorite_count",
      conditionTarget: 1, points: 10, hidden: true, isActive: true,
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">成就管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">管理用户可解锁的成就</p>
        </div>
        <button onClick={startCreate} className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-all hover:opacity-90">
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          新建成就
        </button>
      </div>

      {/* 编辑表单 */}
      {editing && (
        <div className="rounded-2xl bg-card ring-1 ring-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-foreground">{editing.id ? "编辑成就" : "新建成就"}</h2>
            <button onClick={() => setEditing(null)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
          </div>

          <div className="flex gap-5">
            {/* 左侧：立绘（固定宽度） */}
            <div className="w-[150px] shrink-0">
              <label className="mb-1.5 block text-sm font-medium text-foreground">解锁立绘</label>
              <ImageUpload
                value={editing.characterImage ?? ""}
                onChange={(url) => setEditing({ ...editing, characterImage: url })}
                aspectRatio={3 / 4}
                shape="rounded"
                placeholder="上传立绘"
              />
            </div>

            {/* 右侧：表单 */}
            <div className="flex-1 space-y-3 min-w-0">
              <div className="grid grid-cols-2 gap-3">
                <Field label="名称"><input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} className={inputCls} placeholder="成就名称" /></Field>
                <Field label="分类"><select value={editing.category ?? "general"} onChange={(e) => setEditing({ ...editing, category: e.target.value })} className={inputCls}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
                <Field label="条件类型"><select value={editing.conditionType ?? "favorite_count"} onChange={(e) => setEditing({ ...editing, conditionType: e.target.value })} className={inputCls}>{CONDITION_TYPES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></Field>
                <Field label="目标值"><input type="number" value={editing.conditionTarget ?? 1} onChange={(e) => setEditing({ ...editing, conditionTarget: Number(e.target.value) })} className={inputCls} min={1} /></Field>
                <Field label="积分"><input type="number" value={editing.points ?? 10} onChange={(e) => setEditing({ ...editing, points: Number(e.target.value) })} className={inputCls} min={1} /></Field>
                <Field label="图标 URL"><input value={editing.icon ?? ""} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} className={inputCls} placeholder="https://..." /></Field>
              </div>

              <Field label="描述"><textarea value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} className={cn(inputCls, "min-h-[56px] resize-y")} placeholder="成就描述" /></Field>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={editing.hidden !== false} onChange={(e) => setEditing({ ...editing, hidden: e.target.checked })} className="rounded" />隐藏</label>
                  <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" checked={editing.isActive !== false} onChange={(e) => setEditing({ ...editing, isActive: e.target.checked })} className="rounded" />启用</label>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditing(null)} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary">取消</button>
                  <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}保存
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 列表 */}
      <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">成就</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">条件</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">积分</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">解锁数</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">状态</th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground">操作</th>
            </tr>
          </thead>
          <tbody>
            {achievements.map((ach) => (
              <tr key={ach.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {ach.icon ? <img src={ach.icon} alt="" className="h-8 w-8 rounded-lg" /> : <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10"><Award className="h-4 w-4 text-amber-400" /></div>}
                    <div><p className="font-medium text-foreground">{ach.name}</p><p className="text-xs text-muted-foreground truncate max-w-[200px]">{ach.description}</p></div>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{CONDITION_TYPES.find((c) => c.value === ach.conditionType)?.label ?? ach.conditionType}{" ≥ "}{ach.conditionTarget}</td>
                <td className="px-4 py-3 text-amber-400 font-medium">{ach.points}</td>
                <td className="px-4 py-3 text-muted-foreground">{ach.unlockCount}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={cn("inline-block h-2 w-2 rounded-full", ach.isActive ? "bg-emerald-400" : "bg-zinc-500")} />
                    <span className="text-xs text-muted-foreground">{ach.isActive ? "启用" : "禁用"}</span>
                    {ach.hidden && <span className="rounded bg-zinc-500/20 px-1.5 py-0.5 text-[10px] text-zinc-400">隐藏</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => setEditing(ach)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"><Edit2 className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(ach.id)} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
            {achievements.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">暂无成就，点击上方"新建成就"创建第一个</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>{children}</div>
}
