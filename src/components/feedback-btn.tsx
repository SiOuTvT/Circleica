"use client"

import { Flag } from "lucide-react"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { cn } from "@/lib/utils"
import { ReportDialog } from "./game-detail/report-dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip"
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

  const button = (
    <button
      type="button"
      onClick={() => isLoggedIn && setOpen(true)}
      disabled={!isLoggedIn}
      className={cn(
        "flex items-center justify-center gap-1 transition-colors",
        // globals.css 的全局 cursor 规则已收进 @layer base，utilities 层的工具类现在压得住，
        // 不再需要 !important（禁用态另有 base 层的 button:disabled{cursor:default} 兜底）。
        // 禁用态加 pointer-events-none：让外层 span 收到事件，站内 tooltip 才出得来。
        isLoggedIn ? "cursor-pointer" : "opacity-60 disabled:cursor-not-allowed pointer-events-none",
        className ?? "min-h-[28px] px-2 text-xs text-muted-foreground hover:text-foreground ml-auto shrink-0",
      )}
    >
      <Flag className="h-3.5 w-3.5" strokeWidth={1.5} />
      <span>反馈问题</span>
    </button>
  )

  return (
    <>
      {isLoggedIn ? (
        button
      ) : (
        <Tooltip>
          {/* 禁用按钮不派发指针事件，外面这层负责接事件 */}
          <TooltipTrigger asChild>
            <span className="flex w-full cursor-not-allowed">{button}</span>
          </TooltipTrigger>
          <TooltipContent>登录后才能反馈</TooltipContent>
        </Tooltip>
      )}
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
