"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2, Link2, Unlink } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { adminInput, adminBtnPrimary, adminBtnSecondary, adminBtnDanger, adminBtnSubtle } from "@/lib/admin-styles"
import { editWork, deleteWork, toggleInclusion } from "./actions"

interface WorkRow {
  id: string
  title: string
  studioName: string | null
  releaseDate: string | null
  status: string | null
  isNsfw: boolean
  gameId: string | null
}

export function WorkRowActions({ work }: { work: WorkRow }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)
  const included = Boolean(work.gameId)

  async function submitEdit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("id", work.id)
      await editWork(fd)
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
      fd.set("id", work.id)
      await deleteWork(fd)
      toast.success("已删除作品")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  async function doToggle() {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("id", work.id)
      await toggleInclusion(fd)
      toast.success(included ? "已取消收录" : "已创建收录草稿")
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "操作失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5">
      <button type="button" className={adminBtnSubtle} onClick={() => setEditing(true)} disabled={busy}>
        <Pencil className="h-3.5 w-3.5" /> 编辑
      </button>
      <button
        type="button"
        className={included ? adminBtnSecondary : adminBtnPrimary}
        onClick={doToggle}
        disabled={busy}
      >
        {included ? <Unlink className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
        {included ? "取消收录" : "收录"}
      </button>
      <button type="button" className={adminBtnDanger} onClick={() => setDeleting(true)} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" /> 删除
      </button>

      <Dialog open={editing} onOpenChange={(v) => !busy && setEditing(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑作品</DialogTitle>
            <DialogDescription>修改 Galvelica 资料馆中的作品信息。</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitEdit(e.currentTarget)
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">标题</label>
              <input name="title" defaultValue={work.title} className={adminInput} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">制作组</label>
              <input name="studioName" defaultValue={work.studioName || ""} className={adminInput} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">状态</label>
              <input name="status" defaultValue={work.status || ""} className={adminInput} placeholder="完结 / 连载中 …" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">发售日</label>
              <input
                name="releaseDate"
                type="date"
                defaultValue={work.releaseDate ? new Date(work.releaseDate).toISOString().slice(0, 10) : ""}
                className={adminInput}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input type="checkbox" name="isNsfw" defaultChecked={work.isNsfw} className="h-4 w-4" />
              NSFW 内容
            </label>
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
        title="删除作品"
        description={`确定删除「${work.title}」？其子表（来源/标签/创作者/收录申请）会一并清除，且不可恢复。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={doDelete}
      />
    </div>
  )
}
