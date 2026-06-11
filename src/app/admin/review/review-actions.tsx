"use client"

import { cn } from "@/lib/utils"
import { CheckCircle, Loader2, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

export function ReviewActions({ gameId }: { gameId: string }) {
  const router = useRouter()
  const [approving, setApproving] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [rejectReason, setRejectReason] = useState("")
  const [showReject, setShowReject] = useState(false)

  async function approve() {
    setApproving(true)
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, action: "approve" }),
    })
    if (res.ok) { toast.success("已发布"); router.refresh() }
    else toast.error("操作失败")
    setApproving(false)
  }

  async function reject() {
    setRejecting(true)
    const res = await fetch("/api/admin/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, action: "reject", reason: rejectReason }),
    })
    if (res.ok) { toast.success("已拒回"); setShowReject(false); router.refresh() }
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
            placeholder="拒回原因…" className="w-32 rounded-lg bg-muted px-2 py-1.5 text-xs text-foreground ring-1 ring-border outline-none"
            onKeyDown={e => { if (e.key === "Escape") setShowReject(false) }}
          />
          <button onClick={reject} disabled={rejecting}
            className="rounded-lg bg-rose-500/10 px-2 py-1.5 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20 hover:bg-rose-500/20">
            {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : "确认"}
          </button>
        </div>
      ) : (
        <button onClick={() => setShowReject(true)} disabled={approving}
          className="flex items-center gap-1 rounded-lg bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-400 ring-1 ring-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50">
          <XCircle className="h-3 w-3" />
          拒回
        </button>
      )}
    </div>
  )
}