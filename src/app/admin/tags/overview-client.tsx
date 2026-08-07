"use client"

import { Pencil, Search, Tag } from "lucide-react"
import { TAG_PRESET_COLORS } from "@/lib/tag-colors"
import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { AdminDeleteButton } from "@/components/admin-delete-button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"

/* ──────────────────── 类型 ──────────────────── */

export interface TagRow {
  id: string
  name: string
  color: string
  gameCount: number
  groupId: string | null
  groupName: string | null
  groupColor: string | null
}

interface GroupOption {
  id: string
  name: string
  color: string
}

/* ──────────────────── 主组件（扁平行表格，列出全部标签） ──────────────────── */

export function TagsOverviewClient({ tags, groups }: { tags: TagRow[]; groups: GroupOption[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [editing, setEditing] = useState<TagRow | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return tags
    return tags.filter((t) => t.name.toLowerCase().includes(q))
  }, [tags, query])

  return (
    <>
      {/* 搜索 */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索标签…"
          aria-label="搜索标签"
          className="rounded-xl border-2 border-input bg-transparent pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary w-full"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Tag} title={query ? "没有找到匹配的标签" : "暂无标签"} bordered />
      ) : (
        <div className="overflow-hidden rounded-xl bg-card ring-1 ring-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30 text-left text-xs text-muted-foreground">
                  <th className="px-5 py-3.5 font-semibold tracking-wide">标签</th>
                  <th className="hidden px-5 py-3.5 font-semibold tracking-wide sm:table-cell">分组</th>
                  <th className="px-5 py-3.5 font-semibold tracking-wide text-right">关联游戏</th>
                  <th className="px-5 py-3.5 font-semibold tracking-wide text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filtered.map((t) => (
                  <tr key={t.id} className="group transition-colors hover:bg-accent/30">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block h-3 w-3 shrink-0 rounded-full ring-1 ring-border"
                          style={{ background: t.color || "#6b7280" }}
                        />
                        <span className="font-medium text-foreground truncate">{t.name}</span>
                      </div>
                    </td>
                    <td className="hidden px-5 py-3.5 sm:table-cell">
                      {t.groupName ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: t.groupColor || "#6b7280" }}
                          />
                          {t.groupName}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">未分组</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-muted-foreground tabular-nums">
                      {t.gameCount}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditing(t)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground cursor-pointer"
                        >
                          <Pencil className="h-3.5 w-3.5" strokeWidth={2} />
                          编辑
                        </button>
                        <AdminDeleteButton
                          endpoint={`/api/admin/tags/${t.id}`}
                          title="删除标签"
                          description={`确定删除标签「${t.name}」？关联的标签关系会一并清除，此操作不可撤销。`}
                          successMessage="标签已删除"
                          buttonTitle={`删除 ${t.name}`}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <TagEditDialog
          tag={editing}
          groups={groups}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

/* ──────────────────── 行内编辑弹窗（名称 + 颜色 + 标签组） ──────────────────── */

function TagEditDialog({
  tag,
  groups,
  onClose,
  onSaved,
}: {
  tag: TagRow
  groups: GroupOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState(tag.name)
  const [color, setColor] = useState(tag.color || "#6b7280")
  const [groupId, setGroupId] = useState(tag.groupId ?? "")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!name.trim()) {
      toast.error("标签名不能为空")
      return
    }
    setSaving(true)
    try {
      const body: Record<string, unknown> = {}
      if (name.trim() !== tag.name) body.name = name.trim()
      if (color.toLowerCase() !== (tag.color || "").toLowerCase()) body.color = color
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
    <Dialog open onOpenChange={(v) => { if (!v && !saving) onClose() }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>编辑标签</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">名称</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border-2 border-input bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">颜色</label>
            <div className="flex flex-wrap items-center gap-1.5">
              {TAG_PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-6 w-6 rounded-full transition-all cursor-pointer ${
                    color.toLowerCase() === c.toLowerCase()
                      ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110"
                      : "hover:scale-110"
                  }`}
                  style={{ background: c }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-6 w-6 rounded-full cursor-pointer border-0 bg-transparent"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">标签组</label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              className="w-full rounded-lg border-2 border-input bg-transparent px-3 py-2.5 text-sm text-foreground outline-none transition-[border-radius,border-color] duration-300 ease-out focus:rounded-none focus:border-primary"
            >
              <option value="">未分组</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
            取消
          </Button>
          <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
