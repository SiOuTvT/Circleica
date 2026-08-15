"use client"

import { useState } from "react"
import { Pencil, Merge } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { adminInput } from "@/lib/admin-styles"
import { GAL_PRESET_TAG_COLORS } from "@/lib/galvelica-palette"
import { editGalvelicaTag, mergeGalvelicaTag } from "../actions"

interface TagDetail {
  id: string
  name: string
  color: string
  description: string | null
}

export function TagDetailClient({ tag, candidates, unifiedColor }: { tag: TagDetail; candidates: { id: string; name: string; color: string }[]; unifiedColor: string }) {
  const [editing, setEditing] = useState(false)
  const [merging, setMerging] = useState(false)
  const [busy, setBusy] = useState(false)
  const [color, setColor] = useState(tag.color || unifiedColor)

  async function submitEdit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("id", tag.id)
      fd.set("color", color)
      await editGalvelicaTag(fd)
      toast.success("已保存")
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setBusy(false)
    }
  }

  async function submitMerge(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("fromId", tag.id)
      await mergeGalvelicaTag(fd)
      toast.success("已合并标签")
      setMerging(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "合并失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary ring-1 ring-primary/20 transition-colors hover:bg-primary/20"
        onClick={() => setEditing(true)}
      >
        <Pencil className="h-3.5 w-3.5" /> 编辑
      </button>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs font-medium text-foreground ring-1 ring-border transition-colors hover:bg-muted"
        onClick={() => setMerging(true)}
      >
        <Merge className="h-3.5 w-3.5" /> 合并重复
      </button>

      <Dialog open={editing} onOpenChange={(v) => !busy && setEditing(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>
              修改 Galvelica 副站标签的名称、描述，或单独指定颜色。留空/选「用统一色」则回退到副站统一配色（兜底）。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitEdit(e.currentTarget) }} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">名称</label>
              <input name="name" defaultValue={tag.name} className={adminInput} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">描述</label>
              <textarea name="description" defaultValue={tag.description || ""} className={adminInput} rows={3} />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">标签颜色（单独自定义，不填则用统一色）</label>
              <div className="flex flex-wrap items-center gap-1.5">
                {GAL_PRESET_TAG_COLORS.map((c) => (
                  <button
                    type="button"
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`设为 ${c}`}
                    title={c}
                    className="h-6 w-6 rounded-md ring-1 ring-border transition-transform hover:scale-110"
                    style={{
                      backgroundColor: c,
                      outline: c.toLowerCase() === color.toLowerCase() ? "2px solid var(--foreground)" : "none",
                      outlineOffset: "1px",
                    }}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setColor(unifiedColor)}
                  className="ml-1 inline-flex h-6 items-center rounded-md border border-border px-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  style={{ boxShadow: `inset 0 0 0 2px ${unifiedColor}` }}
                >
                  用统一色
                </button>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded-md border border-input bg-transparent"
                  aria-label="自定义颜色"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>取消</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "保存中…" : "保存"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={merging} onOpenChange={(v) => !busy && setMerging(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>合并到目标标签</DialogTitle>
            <DialogDescription>把本标签的关联作品转移给目标标签，然后删除本标签（去重）。</DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => { e.preventDefault(); submitMerge(e.currentTarget) }} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">选择目标标签</label>
              <select name="toId" defaultValue="" className={adminInput}>
                <option value="">— 输入名称匹配 —</option>
                {candidates.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">或输入目标标签名称</label>
              <input name="toName" className={adminInput} placeholder="留空则用上方下拉" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setMerging(false)} disabled={busy}>取消</Button>
              <Button type="submit" size="sm" disabled={busy}>{busy ? "合并中…" : "合并"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
