"use client"

import { apiFetchSafe } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { timeAgo } from "@/lib/time-ago"
import { useCallback, useEffect, useState } from "react"
import { Loader2, Bell, CheckCheck, MessageSquare, User, Settings, Heart } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

interface NotificationItem {
  id: string
  type: string
  targetType: string
  targetId: string
  isRead: boolean
  createdAt: string
  postId?: string | null
  actor: { id: string; serialId: number | null; username: string; avatar: string }
  targetGame?: { id: string; title: string } | null
}

type CategoryKey = "all" | "likes" | "comments" | "follows" | "system"

interface Category {
  key: CategoryKey
  label: string
  icon: typeof Bell
  types: string[] // 对应 NotificationTypeEnum 的值
}

const CATEGORIES: Category[] = [
  { key: "all", label: "全部", icon: Bell, types: [] },
  { key: "likes", label: "点赞与收藏", icon: Heart, types: ["forum_post_like", "forum_comment_like", "game_comment_like"] },
  { key: "comments", label: "评论与回复", icon: MessageSquare, types: ["forum_comment_new", "game_comment_new"] },
  { key: "follows", label: "关注", icon: User, types: ["follow"] },
  { key: "system", label: "系统消息", icon: Settings, types: ["achievement_unlock"] },
]

const TYPE_LABELS: Record<string, string> = {
  forum_post_like: "赞了你的帖子",
  forum_comment_like: "赞了你的评论",
  forum_comment_new: "评论了你的帖子",
  game_comment_new: "评论了你的游戏",
  game_comment_like: "赞了你的评论",
  follow: "关注了你",
  achievement_unlock: "解锁了成就",
  private_message: "发来一条私信",
}

function getHref(n: NotificationItem): string {
  if (n.type === "follow") return n.actor.serialId ? `/user/${n.actor.serialId}` : `/user/${n.actor.id}`
  if (n.targetType === "forum_post") return `/forum/${n.targetId}`
  if (n.targetType === "forum_comment") return n.postId ? `/forum/${n.postId}` : "/forum"
  if (n.targetType === "game_comment") return n.targetGame ? `/games/${n.targetGame.id}` : "/games"
  return "#"
}

export default function NotificationsContent({ tabNav }: { tabNav?: React.ReactNode }) {
  const [activeCat, setActiveCat] = useState<CategoryKey>("all")
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { ok, data } = await apiFetchSafe<{ data?: { notifications?: NotificationItem[] } }>("/api/notifications")
      if (ok) setNotifications(data?.data?.notifications ?? [])
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const cat = CATEGORIES.find(c => c.key === activeCat) ?? CATEGORIES[0]
  const filtered = activeCat === "all"
    ? notifications
    : notifications.filter(n => cat.types.includes(n.type))

  async function markAllRead() {
    try {
      await apiFetchSafe("/api/notifications", { method: "PUT" })
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch {}
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr]" style={{ height: "calc(100vh - 200px)", minHeight: "500px" }}>
      {/* 左侧：通知分类 */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        {tabNav && <div className="px-3 pt-3 pb-1 shrink-0">{tabNav}</div>}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-2">
          {CATEGORIES.map((catItem) => (
            <button
              key={catItem.key}
              onClick={() => setActiveCat(catItem.key)}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                activeCat === catItem.key
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <catItem.icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {catItem.label}
            </button>
          ))}
        </div>
      </div>

      {/* 右侧：通知列表 */}
      <div className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-foreground">{cat.label}</span>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" strokeWidth={2} />
            全部已读
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Bell className="h-8 w-8 opacity-40 mb-2" />
              <p className="text-sm">暂无通知</p>
            </div>
          ) : (
            filtered.map((n) => (
              <Link
                key={n.id}
                href={getHref(n)}
                className={cn(
                  "flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 border-b border-border/40",
                  !n.isRead && "bg-primary/5"
                )}
              >
                {/* 头像 */}
                <div className="shrink-0 h-8 w-8 rounded-full bg-primary/80 overflow-hidden flex items-center justify-center">
                  {n.actor.avatar ? (
                    <Image src={n.actor.avatar} alt={n.actor.username} width={32} height={32} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <span className="text-xs font-bold text-white">{n.actor.username[0]?.toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-foreground">
                    <span className="font-medium">{n.actor.username}</span>{" "}
                    <span className="text-muted-foreground">{TYPE_LABELS[n.type] || n.type}</span>
                  </div>
                  {n.targetGame && (
                    <div className="text-xs text-muted-foreground mt-0.5">{n.targetGame.title}</div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                    {!n.isRead && <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
