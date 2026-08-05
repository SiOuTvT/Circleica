"use client"

import { useState } from "react"
import { Trash2, Merge } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Button } from "@/components/ui/button"
import { adminInput, adminBtnSubtle, adminBtnDanger } from "@/lib/admin-styles"
import { deleteGalvelicaCreator, mergeGalvelicaCreator } from "./actions"

export function CreatorRowActions({ creator }: { creator: { id: string; name: string } }) {
  const [merging, setMerging] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [busy, setBusy] = useState(false)

  async function doDelete() {
    setBusy(true)
    try {
      const fd = new FormData()
      fd.set("id", creator.id)
      await deleteGalvelicaCreator(fd)
      toast.success("已删除创作者")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "删除失败")
    } finally {
      setBusy(false)
    }
  }

  async function doMerge(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("fromId", creator.id)
      await mergeGalvelicaCreator(fd)
      toast.success("已合并到目标创作者")
      setMerging(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "合并失败")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" className={adminBtnSubtle} onClick={() => setMerging(true)} disabled={busy}>
        <Merge className="h-3.5 w-3.5" /> 合并
      </button>
      <button type="button" className={adminBtnDanger} onClick={() => setDeleting(true)} disabled={busy}>
        <Trash2 className="h-3.5 w-3.5" /> 删除
      </button>

      <Dialog open={merging} onOpenChange={(v) => !busy && setMerging(v)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>合并创作者</DialogTitle>
            <DialogDescription>
              将「{creator.name}」的作品/资源关系转移到另一副站创作者，随后删除原条目。重复关系自动去重。
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              doMerge(e.currentTarget)
            }}
            className="space-y-3"
          >
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">目标创作者 ID（精确）</label>
              <input name="toId" className={adminInput} placeholder="留空则用名称匹配" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">或目标创作者名称</label>
              <input name="toName" className={adminInput} placeholder="副站内已存在的创作者名" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" size="sm" onClick={() => setMerging(false)} disabled={busy}>
                取消
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "合并中…" : "合并"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="删除创作者"
        description={`确定删除「${creator.name}」？其作品/资源关系会一并清除。`}
        confirmText="删除"
        variant="destructive"
        onConfirm={doDelete}
      />
    </div>
  )
}
