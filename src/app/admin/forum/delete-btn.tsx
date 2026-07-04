"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function ForumDeleteBtn({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    const res = await fetch(`/api/admin/forum/${id}`, { method: "DELETE" })
    if (res.ok) {
      toast.success("帖子已删除")
      router.refresh()
    } else {
      toast.error("删除失败")
      throw new Error("删除失败")
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="删除帖子"
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-400"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="删除帖子"
        description="确定要删除这篇帖子吗？所有评论也将一并删除，删了就找不回来了。"
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}