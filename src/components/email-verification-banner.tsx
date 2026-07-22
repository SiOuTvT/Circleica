"use client"

import { useSession } from "next-auth/react"
import { useState } from "react"
import { toast } from "sonner"
import { X, Mail } from "lucide-react"
import { apiFetchSafe } from "@/lib/api-client"

export function EmailVerificationBanner() {
  const { data: session } = useSession()
  const [dismissed, setDismissed] = useState(false)
  const [sending, setSending] = useState(false)

  if (!session?.user || session.user.isEmailVerified || dismissed) return null

  async function handleResend() {
    setSending(true)
    try {
      const { ok, error } = await apiFetchSafe("/api/auth/verify-email", { method: "POST" })
      if (ok) {
        toast.success("验证邮件已发送，请检查收件箱")
      } else {
        toast.error(error || "发送失败")
      }
    } catch {
      toast.error("发送失败")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-amber-500/10 border-b border-amber-500/20 text-amber-700 dark:text-amber-400">
      <div className="max-w-[1400px] mx-auto px-4 py-2 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-2 min-w-0">
          <Mail className="h-4 w-4 shrink-0" />
          <span className="truncate">你的邮箱尚未验证，部分功能可能受限。</span>
          <button
            onClick={handleResend}
            disabled={sending}
            className="underline font-medium hover:text-amber-600 dark:hover:text-amber-300 whitespace-nowrap disabled:opacity-50"
          >
            {sending ? "发送中..." : "发送验证邮件"}
          </button>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="shrink-0 p-1 rounded hover:bg-amber-500/10 transition-colors"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
