"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { Tag } from "@/components/ui/tag"
import { adminInput, adminBtnPrimary, adminBtnSubtle, adminBtnDanger } from "@/lib/admin-styles"
import { GAL_PRESET_TAG_COLORS, GAL_TAG_COLOR_DEFAULT } from "@/lib/galvelica-palette"
import { createGalvelicaTag, editGalvelicaTag, deleteGalvelicaTag, setGalvelicaTagColor } from "./actions"

/**
 * 副站标签统一配色面板：单一站点级颜色，统一控制副站后台与前台所有标签，
 * 不区分标签分类，不与主站共享或关联。保存后写入 SiteSetting[galvelica:tagColor]，
 * 并由 actions 端 revalidatePath + revalidateTag 实现前台实时同步。
 */
export function TagColorPalette({ initialColor }: { initialColor: string }) {
  const router = useRouter()
  const [color, setColor] = useState(initialColor || GAL_TAG_COLOR_DEFAULT)
  const [pending, startTransition] = useTransition()

  function save() {
    startTransition(async () => {
      try {
        const fd = new FormData()
        fd.set("color", color)
        await setGalvelicaTagColor(fd)
        toast.success("已保存副站标签统一配色")
        router.refresh()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "保存失败")
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">副站标签统一配色（兜底）</h3>
      <p className="mb-3 mt-1 text-xs text-muted-foreground">
        作为副站标签的默认/兜底色，不区分分类、不与主站共享。保存后立即在前台生效，并级联到仍用上一版统一色的标签；已单独自定义的标签不受影响。
      </p>
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
      </div>
      <div className="mt-3 flex items-center gap-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="h-9 w-12 cursor-pointer rounded-lg border-2 border-input bg-transparent"
        />
        <Tag color={color} className="px-2.5 py-1">预览</Tag>
        <Button type="button" size="sm" disabled={pending} onClick={save} className="ml-auto">
          {pending ? "保存中…" : "保存配色"}
        </Button>
      </div>
    </div>
  )
}

export function TagCreateForm() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)

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
            <DialogDescription>
              标签仅存在于副站（source=galvelica），不会进入主站。标签颜色由「副站标签统一配色」统一控制，此处无需设置。
            </DialogDescription>
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

export function TagRowActions({ tag }: { tag: { id: string; name: string } }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submitEdit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("id", tag.id)
      await editGalvelicaTag(fd)
      toast.success("已保存")
      setEditing(false)
      router.refresh()
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
            <DialogDescription>修改副站标签名称。颜色由「副站标签统一配色」统一控制，此处无需设置。</DialogDescription>
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
