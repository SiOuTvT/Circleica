"use client"

import { Flag } from "lucide-react"
import { useState } from "react"
import { ReportDialog } from "./game-detail/report-dialog"
import { toast } from "sonner"

export function FeedbackBtn({ gameId, isLoggedIn }: { gameId: string; isLoggedIn: boolean }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  if (!isLoggedIn) return null

  async function handleSubmit(reason: string) {
    if (!reason || submitting) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/games/${gameId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      })
      if (res.ok) {
        toast.success("反馈已提交，感谢")
        setOpen(false)
      } else {
        toast.error("提交失败，请稍后重试")
      }
    } catch {
      toast.error("提交失败，请稍后重试")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto shrink-0"
      >
        <Flag className="w-3.5 h-3.5" strokeWidth={1.5} />
        <span>反馈</span>
      </button>
      <ReportDialog
        show={open}
        onClose={() => setOpen(false)}
        reportSubmitting={submitting}
        onSubmit={handleSubmit}
      />
    </>
  )
}
