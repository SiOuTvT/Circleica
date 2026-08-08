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
      const { ok, data } = await apiFetchSafe<{ conversation?: { id: string }, cost?: number, error?: string }>(
        "/api/messages",
        { method: "POST", body: { participantId: targetUserId } }
      )
      if (ok && data?.conversation) {
        if (data.cost && data.cost > 0) {
          toast.success(`已消耗 ${data.cost} 印记发起会话`)
        }
        router.push("/messages")
      } else if (data?.error) {
        // 印记不足等业务错误：走 toast 提示，不跳转
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
