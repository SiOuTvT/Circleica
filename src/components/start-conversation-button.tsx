"use client"

import { logger } from "@/lib/logger"
import { apiFetchSafe } from "@/lib/api-client"
import { Loader2, MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"

/** 私聊成本（与 services/message.ts MESSAGE_COST 保持一致） */
const MESSAGE_COST = 5

export function StartConversationButton({ targetUserId, username }: { targetUserId: string; username: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const start = async () => {
    if (loading) return
    setLoading(true)
    try {
      // apiFetchSafe 成功时 data 为完整响应体 { success, data }；失败时 error 为真实错误文案（平级字段）
      const { ok, data, error } = await apiFetchSafe<{
        success?: boolean
        data?: { conversation?: { id: string }, cost?: number }
        error?: string
      }>("/api/messages", { method: "POST", body: { participantId: targetUserId } })
      const inner = data?.data
      if (ok && inner?.conversation) {
        if (inner.cost && inner.cost > 0) {
          toast.success(`已消耗 ${inner.cost} 印记发起会话`)
        }
        router.push("/messages")
      } else if (error) {
        // 印记不足 / 限流 / 未登录等真实错误：显示后端返回的具体原因
        toast.error(error)
      } else if (data?.error) {
        toast.error(data.error)
      } else {
        toast.error("发起失败，请稍后再试")
      }
    } catch (e) {
      logger.api.warn("[StartConversation] failed", { error: e instanceof Error ? e.message : String(e) })
      toast.error("网络好像断了，请重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={start}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:bg-accent disabled:opacity-50"
      title={`消耗 ${MESSAGE_COST} 印记给 ${username} 发起私聊（签到可得，同一人只扣一次）`}
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
      发起私聊
    </button>
  )
}
