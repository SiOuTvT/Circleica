"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Inbox } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * 收录申请按钮（Stage E，客户端组件）
 * 未收录的 Galvelica 资料页显示此按钮：提交后创建 InclusionRequest(PENDING)，
 * 馆方在 /admin/inclusion-requests 审核通过即生成 Circleica 资源草稿。
 */
export function RequestInclusionButton({ workId, title }: { workId: string; title: string }) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    setLoading(true)
    try {
      const res = await fetch(`/api/galvelica/${workId}/request-inclusion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        setDone(true)
        toast.success(`已为《${title}》提交收录申请，馆方审核通过后将建立资源页`)
      } else {
        const d = (await res.json().catch(() => ({}))) as { error?: string }
        if (res.status === 401) {
          // 提交收录要求登录（2026-08-07 决策）：引导去登录后回到当前页
          window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`
          return
        }
        if (res.status === 409) {
          setDone(true)
          toast.info(d.error || "该作品已在审核中或已被收录")
        } else {
          toast.error(d.error || "提交失败，请稍后再试")
        }
      }
    } catch {
      toast.error("网络错误，请稍后再试")
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="galvelica-cta galvelica-cta-done h-8">
        <Inbox className="h-4 w-4" />
        已提交收录申请
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={submit}
      disabled={loading}
      className={cn("galvelica-cta galvelica-cta-primary", "h-8 disabled:opacity-60")}
    >
      <Inbox className="h-4 w-4" />
      {loading ? "提交中…" : "申请收录到 Circleica"}
    </button>
  )
}
