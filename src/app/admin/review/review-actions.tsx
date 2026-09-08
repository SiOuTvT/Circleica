"use client"

import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"
import { adminInput, adminBtnDanger } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"

export function ReviewActions({ gameId }: { gameId: string }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)

  async function approve() {
    setApproving(true)
    const { ok } = await apiFetchSafe("/api/admin/review", {
      method: "POST",
      body: { gameId, action: "approve" },
    })
    if (ok) { toast.success("已发布"); router.refresh() }
    else toast.error("操作失败")
    setApproving(false)
  }

  async function reject() {
    setRejecting(true)
    const { ok } = await apiFetchSafe("/api/admin/review", {
      method: "POST",
      body: { gameId, action: "reject", reason: rejectReason },
    })
    if (ok) { toast.success("已拒回"); setShowReject(false); router.refresh() }
    else toast.error("操作失败")
    setRejecting(false)
  }

  return (
    <div className="flex items-center gap-1.5">
      <button onClick={approve} disabled={approving}
        className="flex items-center gap-1 rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 ring-1 ring-emerald-500/20 hover:bg-emerald-500/20 disabled:opacity-50">
        {approving ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
        通过
      </button>
      {showReject ? (
        <div className="flex items-center gap-1">
          <input
            autoFocus
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="拒回原因…" className={cn(adminInput, "w-32 text-xs")}
            onKeyDown={e => { if (e.key === "Escape") setShowReject(false) }}
          />
          <button onClick={reject} disabled={rejecting}
            className={cn(adminBtnDanger, "px-2 text-xs")}>
            {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "确认"}
          </button>
        </div>
      ) : (
        <button onClick={() => setShowReject(true)} disabled={approving}
          className={cn(adminBtnDanger, "text-xs disabled:opacity-50")}>
          <XCircle className="h-3 w-3" />
          拒回
        </button>
      )}
    </div>
  )
}