"use client"

import { Flag } from "lucide-react"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ReportDialog } from "./game-detail/report-dialog"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

export function FeedbackBtn({ gameId, className }: { gameId: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const { status } = useSession()
  const isLoggedIn = status === "authenticated"

  async function handleSubmit(reason: string) {
    if (!reason || submitting) return
    setSubmitting(true)
    try {
      const { ok, error } = await apiFetchSafe(`/api/games/${gameId}/report`, {
        method: "POST",
        body: { reason },
      })
      if (ok) {
        toast.success("反馈已提交，感谢")
        setOpen(false)
      } else {
        toast.error(error ?? "提交失败，请稍后重试")
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
        type="button"
        onClick={() => isLoggedIn && setOpen(true)}
        disabled={!isLoggedIn}
        title={isLoggedIn ? undefined : "登录后才能反馈"}
        className={cn(
          "flex items-center justify-center gap-1 transition-colors",
          isLoggedIn ? "cursor-pointer" : "opacity-60 cursor-not-allowed",
          className ?? "min-h-[28px] px-2 text-xs text-muted-foreground hover:text-foreground ml-auto shrink-0",
        )}
      >
        <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
        <span>反馈问题</span>
      </button>
      {isLoggedIn && (
        <ReportDialog
          show={open}
          onClose={() => setOpen(false)}
          reportSubmitting={submitting}
          onSubmit={handleSubmit}
        />
      )}
    </>
  )
}
