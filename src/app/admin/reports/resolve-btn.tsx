"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function ReportResolveBtn({ gameId }: { id: string; gameId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleResolve() {
    // 删除该游戏的所有举报（视为已处理）
    const res = await fetch("/api/admin/reports", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
    if (res.ok) {
      toast.success("举报已标记为已处理")
      router.refresh()
    } else {
      toast.error("操作失败")
      throw new Error("操作失败")
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition-all hover:bg-emerald-500/10 hover:text-emerald-500"
        title="标记为已处理"
      >
        <CheckCircle className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="处理举报"
        description="确定要将这条举报标记为已处理吗？该操作会删除此举报记录。"
        confirmText="确认处理"
        variant="default"
        onConfirm={handleResolve}
      />
    </>
  )
}
