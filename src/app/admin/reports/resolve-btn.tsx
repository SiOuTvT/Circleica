"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

export function ReportResolveBtn({ gameId, reportCount }: { gameId: string; reportCount: number }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  async function handleResolve() {
    // 删除该游戏的所有举报（视为已处理）
    const { ok } = await apiFetchSafe("/api/admin/reports", {
      method: "DELETE",
      body: { gameId },
    })
    if (ok) {
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
        className="shrink-0 rounded-lg p-2 text-muted-foreground transition duration-150 ease-in-out hover:bg-emerald-500/10 hover:text-emerald-400"
        title="处理该游戏的全部举报"
      >
        <CheckCircle className="h-4 w-4" />
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="处理举报"
        description={
          reportCount > 1
            ? `这部游戏当前共有 ${reportCount} 条举报，确认全部标记为已处理？这 ${reportCount} 条记录都会被删除，游戏本身不受影响。`
            : "确认将这条举报标记为已处理？该记录会被删除，游戏本身不受影响。"
        }
        confirmText="确认处理"
        variant="default"
        onConfirm={handleResolve}
      />
    </>
  )
}
