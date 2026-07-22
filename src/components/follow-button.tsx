"use client"

import { useEmotionalMessages } from "@/hooks/use-emotional-messages"
import { Loader2, UserMinus, UserPlus } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { apiFetchSafe } from "@/lib/api-client"

interface Props {
  targetUserId: string
  initialFollowing: boolean
}

const followMsgKeys = ["follow_success", "unfollow_success"]

export function FollowButton({ targetUserId, initialFollowing }: Props) {
  const [following, setFollowing] = useState(initialFollowing)
  const [loading, setLoading] = useState(false)
  const { messages: followMsgs } = useEmotionalMessages(followMsgKeys)

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    try {
      const { ok } = await apiFetchSafe(`/api/follow/${targetUserId}`, { method: "POST" })
      if (ok) {
        setFollowing(!following)
        toast.success(following
          ? (followMsgs.unfollow_success ? `${followMsgs.unfollow_success.emoji} ${followMsgs.unfollow_success.title}` : "已取消关注")
          : (followMsgs.follow_success ? `${followMsgs.follow_success.emoji} ${followMsgs.follow_success.title}` : "关注成功"))
      } else {
        toast.error("出了点问题，等一下再试试？")
      }
    } catch {
      toast.error("网络好像断了", {
        action: { label: "重试", onClick: () => toggle() },
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
        following
          ? "bg-secondary text-muted-foreground hover:bg-rose-500/10 hover:text-rose-400"
          : "bg-primary text-primary-foreground hover:opacity-90"
      } disabled:opacity-50`}
    >
      {loading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : following ? (
        <UserMinus className="h-3.5 w-3.5" />
      ) : (
        <UserPlus className="h-3.5 w-3.5" />
      )}
      {following ? "已关注" : "关注"}
    </button>
  )
}