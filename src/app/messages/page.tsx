"use client"


import { logger } from "@/lib/logger"
import { apiFetchSafe } from "@/lib/api-client"
import { cn } from "@/lib/utils"
import { useSession } from "next-auth/react"
import { useCallback, useEffect, useRef, useState } from "react"
import { Loader2, MessageCircle, Send } from "lucide-react"
import Image from "next/image"

interface ConversationSummary {
  id: string
  initiatorId: string
  participantId: string
  initiatorMarkSpent: number
  lastMessageAt: string
  createdAt: string
  initiator: { id: string; username: string; avatar: string }
  participant: { id: string; username: string; avatar: string }
  messages: Array<{ id: string; content: string; senderId: string; createdAt: string }>
  _count: { messages: number }
}

interface MessageItem {
  id: string
  conversationId: string
  senderId: string
  content: string
  isRead: boolean
  createdAt: string
  sender: { id: string; username: string; avatar: string }
}

function otherUser(conv: ConversationSummary, myId: string) {
  return conv.initiatorId === myId ? conv.participant : conv.initiator
}

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const hm = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`
  if (sameDay) return hm
  const y = d.getFullYear() === now.getFullYear()
  return y ? `${d.getMonth() + 1}月${d.getDate()}日 ${hm}` : `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`
}

export default function MessagesPage() {
  const { data: session } = useSession()
  const me = session?.user as { id?: string } | undefined
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<MessageItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [draft, setDraft] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [refreshTick, setRefreshTick] = useState(0)
  const [oldestCursor, setOldestCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [loadingEarlier, setLoadingEarlier] = useState(false)

  const loadList = useCallback(async () => {
    try {
      // apiFetchSafe 返回完整响应体 { success, data }，data 字段才是会话数组
      const { ok, data } = await apiFetchSafe<{ success?: boolean; data?: ConversationSummary[] }>("/api/messages")
      if (ok) setConversations(data?.data ?? [])
    } catch (e) {
      logger.api.warn("[Messages] load list failed", { error: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoadingList(false)
    }
  }, [])

  useEffect(() => { loadList() }, [loadList, refreshTick])

  // 轮询：有活跃会话时每 10 秒刷新消息
  useEffect(() => {
    if (!activeId) return
    const timer = setInterval(async () => {
      const { ok, data } = await apiFetchSafe<{ success?: boolean; data?: { messages?: MessageItem[] } }>(`/api/messages/${activeId}`)
      if (ok) {
        const incoming = data?.data?.messages ?? []
        setMessages(prev => {
          const map = new Map<string, MessageItem>()
          for (const m of prev) map.set(m.id, m)
          for (const m of incoming) map.set(m.id, m)
          return [...map.values()].sort((a, b) => +new Date(a.createdAt) - +new Date(b.createdAt))
        })
      }
    }, 10_000)
    return () => clearInterval(timer)
  }, [activeId])

  // 有新消息滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages.length, activeId])

  async function openConversation(id: string) {
    setActiveId(id)
    setLoadingDetail(true)
    try {
      const { ok, data } = await apiFetchSafe<{ success?: boolean; data?: { messages?: MessageItem[]; hasMore?: boolean; nextCursor?: string | null } }>(`/api/messages/${id}`)
      if (ok) {
        const msgs = data?.data?.messages ?? []
        setMessages(msgs)
        setOldestCursor(data?.data?.nextCursor ?? null)
        setHasMore(data?.data?.hasMore ?? false)
      }
    } catch (e) {
      logger.api.warn("[Messages] load detail failed", { error: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoadingDetail(false)
      setRefreshTick(t => t + 1)
    }
  }

  async function loadEarlier() {
    if (!activeId || !oldestCursor || loadingEarlier) return
    setLoadingEarlier(true)
    try {
      const { ok, data } = await apiFetchSafe<{ success?: boolean; data?: { messages?: MessageItem[]; hasMore?: boolean; nextCursor?: string | null } }>(`/api/messages/${activeId}?cursor=${encodeURIComponent(oldestCursor)}`)
      if (ok) {
        const msgs = data?.data?.messages ?? []
        setMessages(prev => [...msgs, ...prev])
        setOldestCursor(data?.data?.nextCursor ?? null)
        setHasMore(data?.data?.hasMore ?? false)
      }
    } catch (e) {
      logger.api.warn("[Messages] load earlier failed", { error: e instanceof Error ? e.message : String(e) })
    } finally {
      setLoadingEarlier(false)
    }
  }

  async function handleSend() {
    const text = draft.trim()
    if (!text || !activeId || sending) return
    setSending(true)
    try {
      const { ok, data } = await apiFetchSafe<{ success?: boolean; data?: MessageItem }>(`/api/messages/${activeId}`, {
        method: "POST",
        body: { content: text },
      })
      if (ok && data?.data) {
        setMessages(prev => [...prev, data.data!])
        setDraft("")
        setRefreshTick(t => t + 1)
      }
    } catch (e) {
      logger.api.warn("[Messages] send failed", { error: e instanceof Error ? e.message : String(e) })
    } finally {
      setSending(false)
    }
  }

  const activeConv = conversations.find(c => c.id === activeId)

  return (
    <div className="pt-1">
      <header className="mb-6 flex flex-col gap-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-fit shrink-0 items-center justify-center text-primary">
            <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">MESSAGES</p>
            <h1 className="font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">私信</h1>
            <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              与圈内同好私聊，会话与消息实时同步。
            </p>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[320px_1fr]">
        {/* 会话列表 */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-semibold text-foreground">会话</span>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {loadingList ? (
              <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
            ) : conversations.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                还没有会话
                <div className="mt-1 text-xs text-muted-foreground/70">去用户主页点「发起私聊」即可开始</div>
              </div>
            ) : conversations.map(conv => {
              const other = otherUser(conv, me?.id ?? "")
              const lastMsg = conv.messages[0]
              const unread = conv._count?.messages ?? 0
              return (
                <button
                  key={conv.id}
                  onClick={() => openConversation(conv.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60",
                    activeId === conv.id && "bg-muted"
                  )}
                >
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-full bg-primary/80 overflow-hidden flex items-center justify-center">
                      {other.avatar ? (
                        <Image src={other.avatar} alt={other.username} width={40} height={40} className="h-full w-full object-cover" unoptimized />
                      ) : (
                        <span className="text-sm font-bold text-white">{other.username[0]?.toUpperCase()}</span>
                      )}
                    </div>
                    {unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium text-foreground">{other.username}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground/70">{formatTime(conv.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {lastMsg ? (lastMsg.senderId === me?.id ? "我: " : "") + lastMsg.content : "发条消息打个招呼吧"}
                    </p>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* 会话详情 */}
        <div className="flex min-h-[70vh] flex-col rounded-2xl border border-border bg-card overflow-hidden">
          {!activeConv ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <MessageCircle className="h-10 w-10 opacity-40" />
              <p className="text-sm">选择一个会话开始聊天</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 border-b border-border px-4 py-3">
                <div className="h-9 w-9 rounded-full bg-primary/80 overflow-hidden flex items-center justify-center">
                  {activeConv && (() => {
                    const other = otherUser(activeConv, me?.id ?? "")
                    return other.avatar ? (
                      <Image src={other.avatar} alt={other.username} width={36} height={36} className="h-full w-full object-cover" unoptimized />
                    ) : (
                      <span className="text-sm font-bold text-white">{other.username[0]?.toUpperCase()}</span>
                    )
                  })()}
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    {activeConv && otherUser(activeConv, me?.id ?? "").username}
                  </div>
                  <div className="text-[10px] text-muted-foreground/70">
                    {activeConv.initiatorId === me?.id ? "我发起的会话" : "对方发起的会话"}
                  </div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {hasMore && (
                  <div className="flex justify-center pb-2">
                    <button
                      onClick={loadEarlier}
                      disabled={loadingEarlier}
                      className="rounded-full border border-border bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                    >
                      {loadingEarlier ? "加载中…" : "加载更早的消息"}
                    </button>
                  </div>
                )}
                {loadingDetail ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
                ) : messages.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">还没有消息，说点什么吧</div>
                ) : messages.map(msg => {
                  const mine = msg.senderId === me?.id
                  return (
                    <div key={msg.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                      <div className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      )}>
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className={cn("mt-1 text-right text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground/70")}>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              <div className="border-t border-border p-3">
                <div className="flex items-end gap-2">
                  <textarea
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    rows={2}
                    placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
                    className="flex-1 resize-none rounded-xl border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !draft.trim()}
                    className="flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    发送
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
