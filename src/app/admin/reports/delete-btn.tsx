"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function ReportDeleteBtn({ id }: { id: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleDelete() {
    const res = await fetch("/api/admin/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) {
      toast.success("举报已删除")
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
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-red-500/10 hover:text-red-500"
        title="删除"
      >
        <Trash2 className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="删除举报"
        description="确定要删除这条举报记录吗？删了就找不回来了。"
        confirmText="删除"
        variant="destructive"
        onConfirm={handleDelete}
      />
    </>
  )
}