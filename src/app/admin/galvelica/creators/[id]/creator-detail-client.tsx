"use client"

import { useState } from "react"
import { Pencil } from "lucide-react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { adminInput, adminBtnPrimary } from "@/lib/admin-styles"
import { editGalvelicaCreator } from "../actions"

interface CreatorDetail {
  id: string
  name: string
  nameJa: string
  bio: string
  gender: string
  twitterUrl: string
  wikipediaUrl: string
}

export function CreatorDetailClient({ creator }: { creator: CreatorDetail }) {
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(form: HTMLFormElement) {
    setBusy(true)
    try {
      const fd = new FormData(form)
      fd.set("id", creator.id)
      await editGalvelicaCreator(fd)
      toast.success("已保存")
      setEditing(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败")
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

      <Dialog open={editing} onOpenChange={(v) => !busy && setEditing(v)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>编辑创作者</DialogTitle>
            <DialogDescription>修改 Galvelica 副站创作者信息。</DialogDescription>
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
              <input name="name" defaultValue={creator.name} className={adminInput} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">日文名</label>
              <input name="nameJa" defaultValue={creator.nameJa} className={adminInput} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">性别</label>
              <input name="gender" defaultValue={creator.gender} className={adminInput} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">简介</label>
              <textarea name="bio" defaultValue={creator.bio} className={adminInput} rows={3} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Twitter</label>
              <input name="twitterUrl" defaultValue={creator.twitterUrl} className={adminInput} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Wikipedia</label>
              <input name="wikipediaUrl" defaultValue={creator.wikipediaUrl} className={adminInput} />
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
    </>
  )
}
