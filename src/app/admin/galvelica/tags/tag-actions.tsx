"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { adminInput, adminBtnPrimary, adminBtnSubtle, adminBtnDanger } from "@/lib/admin-styles"
import { GAL_PRESET_TAG_COLORS } from "@/lib/galvelica-palette"
import { createGalvelicaTag, editGalvelicaTag, deleteGalvelicaTag, resetGalvelicaTagColors } from "./actions"

/** 副站标签取色：预设色板 + 取色器 + 实时预览 pill（统一复用站点 Tag 组件做对比度安全渲染） */
function TagColorField({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        {GAL_PRESET_TAG_COLORS.map((c) => (
          <button
            type="button"
            key={c}
            onClick={() => onChange(c)}
            aria-label={`设为 ${c}`}
            title={c}
            className="h-6 w-6 rounded-md ring-1 ring-border transition-transform hover:scale-110"
            style={{
              backgroundColor: c,
              outline: c.toLowerCase() === value.toLowerCase() ? "2px solid var(--foreground)" : "none",
              outlineOffset: "1px",
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-3">
        <input
          type="color"
          name="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border-2 border-input bg-transparent"
        />
        <Tag color={value || undefined} className="px-2.5 py-1">预览</Tag>
      </div>
    </div>
  )
}

export function TagCreateForm() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [color, setColor] = useState("#a78bfa")

  async function submit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      await createGalvelicaTag(fd)
      toast.success("已新建标签")
      form.reset()
      setOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "新建失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button type="button" className={adminBtnPrimary} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> 新建标签
      </button>
      <Dialog open={open} onOpenChange={(v) => !busy && setOpen(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>新建 Galvelica 标签</DialogTitle>
            <DialogDescription>标签仅存在于副站（source=galvelica），不会进入主站。</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit(e.currentTarget)
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">名称</label>
              <input name="name" className={adminInput} required placeholder="如：东方Project" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">颜色</label>
              <TagColorField value={color} onChange={setColor} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Slug（可选）</label>
              <input name="slug" className={adminInput} placeholder="留空则无可读路由" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "创建中…" : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function TagRowActions({ tag }: { tag: { id: string; name: string; color: string } }) {
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const [color, setColor] = useState(tag.color)

  async function submitEdit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("id", tag.id)
      await editGalvelicaTag(fd)
      toast.success("已保存")
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
    } finally {
      setBusy(false)
    }
  }

  async function doDelete() {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("id", tag.id)
      await deleteGalvelicaTag(fd)
      toast.success("已删除标签")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" className={adminBtnSubtle} onClick={() => setEditing(true)} disabled={busy}>
        <Pencil className="h-3.5 w-3.5" /> 编辑
      </button>
      <button type="button" className={adminBtnDanger} onClick={() => setDeleting(true)} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" /> 删除
      </button>

      <Dialog open={editing} onOpenChange={(v) => !busy && setEditing(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>编辑标签</DialogTitle>
            <DialogDescription>修改副站标签的名称与颜色。</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitEdit(e.currentTarget)
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">名称</label>
              <input name="name" defaultValue={tag.name} className={adminInput} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">颜色</label>
              <TagColorField value={color} onChange={setColor} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)} disabled={busy}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "保存中…" : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="删除标签"
        description={`确定删除标签「${tag.name}」？关联的副站作品标签关系会一并清除。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={doDelete}
      />
    </div>
  )
}

/**
 * 「重置为调色板」：把仍为默认紫色（#a78bfa）的副站标签按 round-robin 重新赋予
 * 副站专属低饱和调色板色。已手动设置颜色的标签不受影响。仅作用 source=galvelica。
 */
export function TagResetColorsButton() {
  const [pending, startTransition] = useTransition()
  return (
    <form
      action={() => {
        if (typeof window !== "undefined" && !window.confirm("将仍为默认紫色（#a78bfa）的副站标签重置为铜绿调色板？已手动设置颜色的标签不受影响。")) {
          return
        }
        startTransition(async () => {
          await resetGalvelicaTagColors()
        })
      }}
    >
      <button type="submit" className={adminBtnSubtle} disabled={pending}>
        {pending ? "重置中…" : "重置为调色板"}
      </button>
    </form>
  )
}
