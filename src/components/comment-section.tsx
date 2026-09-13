"use client"

import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Textarea } from "@/components/ui/textarea"
import { useEmotionalMessage } from "@/hooks/use-emotional-messages"
import { cn } from "@/lib/utils"
import { logger } from "@/lib/logger"
import { api } from "@/lib/api-client"
import { formatZhDateTime } from "@/lib/date"
import { COMMENT_EMOJI_GROUPS } from "@/lib/emoji"
import { Heart, ImageIcon, MessageSquare, Send, Smile, Trash2, X } from "lucide-react"
import { EmotionalIcon } from "@/components/emotional-icon"
import { toast } from "sonner"
import Image from "next/image"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { UserAvatar } from "@/components/user-avatar"

interface Comment {
  id: string
  content: string
  imageUrl?: string | null
  likeCount: number
  createdAt: string
  /** 楼中楼：父评论 id，顶层评论为 null / undefined */
  parentId?: string | null
  user: { id: string; username: string; avatar: string | null }
}

/** 回复超过这个条数时折叠，只留最后 2 条 + 「查看全部 N 条回复」 */
const REPLIES_PREVIEW = 2

interface Props {
  gameId: string
  comments: Comment[]
  isLoggedIn: boolean
  currentUserId?: string
  onCountChange?: (count: number) => void
}

type SortMode = "newest" | "hottest"

// Avatar 已统一为用户头像组件 UserAvatar（H3 消除 4 处本地定义）

// 表情列表 - 分类（已统一为 @/lib/emoji 的 COMMENT_EMOJI_GROUPS 单一来源）


export function CommentSection({ gameId, comments: init, isLoggedIn, currentUserId, onCountChange }: Props) {
  const [comments, setComments] = useState(init)
  const [content, setContent] = useState("")
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [sortMode, setSortMode] = useState<SortMode>("newest")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  // 楼中楼：当前展开输入框的目标（父评论 id 或其某条回复 id），同一时刻只展开一处
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState("")
  const [replySubmitting, setReplySubmitting] = useState<string | null>(null)
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({})

  // 同步评论数量到父组件
  useEffect(() => {
    onCountChange?.(comments.length)
  }, [comments.length, onCountChange])
  const fileRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { message: emptyMsg } = useEmotionalMessage("empty_comments")
  const { message: commentMsg } = useEmotionalMessage("comment_success")

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      setSubmitError("图片太大啦，最多 5MB 哦")
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreviewUrl(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    if (fileRef.current) fileRef.current.value = ""
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  function autoResize(textarea: HTMLTextAreaElement) {
    textarea.style.height = "auto"
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + "px"
  }

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + emoji + content.slice(end)
      setContent(newContent)
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length
        textarea.focus()
      }, 0)
    } else {
      setContent(content + emoji)
    }
  }

  function removePreview() {
    setPreviewUrl(null)
    setSelectedFile(null)
    if (fileRef.current) fileRef.current.value = ""
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim() && !selectedFile) return
    setSubmitting(true)
    setSubmitError(null)
    const fd = new FormData()
    fd.append("content", content.trim())
    if (selectedFile) fd.append("image", selectedFile)

    try {
      const res = await fetch(`/api/games/${gameId}/comments`, { method: "POST", body: fd })
      if (res.ok) {
        const j = await res.json()
        const c = j.data ?? j
        setComments((prev) => sortMode === "newest" ? [c, ...prev] : [...prev, c])
        setContent("")
        removePreview()
        setShowEmoji(false)
        toast.success(commentMsg ? commentMsg.title : "评论成功！", { icon: commentMsg ? <EmotionalIcon emoji={commentMsg.emoji} className="h-4 w-4" /> : undefined })
      } else {
        const err = await res.json().catch(() => ({ error: "发送失败了，再试试？" }))
        setSubmitError(err.error || "发送失败了，再试试？")
      }
    } catch {
      setSubmitError("网络好像不太给力，检查一下？")
    } finally {
      setSubmitting(false)
    }
  }

  /**
   * 楼中楼回复：走同一个评论接口，body 里带 parentId（接口 :27/:34 已支持）。
   * 回复某条回复时也挂到这一串的顶层评论下（parentId = 顶层 id），让一层结构能收拢全部回复。
   */
  async function submitReply(threadRootId: string) {
    if (!replyContent.trim()) return
    setReplySubmitting(threadRootId)
    setSubmitError(null)
    const fd = new FormData()
    fd.append("content", replyContent.trim())
    fd.append("parentId", threadRootId)
    try {
      const res = await fetch(`/api/games/${gameId}/comments`, { method: "POST", body: fd })
      if (res.ok) {
        const j = await res.json()
        const c = j.data ?? j
        setComments((prev) => [...prev, c])
        setReplyContent("")
        setReplyTo(null)
        setExpandedReplies((prev) => ({ ...prev, [threadRootId]: true }))
        toast.success(commentMsg ? commentMsg.title : "回复成功！", { icon: commentMsg ? <EmotionalIcon emoji={commentMsg.emoji} className="h-4 w-4" /> : undefined })
      } else {
        const err = await res.json().catch(() => ({ error: "发送失败了，再试试？" }))
        setSubmitError(err.error || "发送失败了，再试试？")
      }
    } catch {
      setSubmitError("网络好像不太给力，检查一下？")
    } finally {
      setReplySubmitting(null)
    }
  }

  async function likeComment(commentId: string) {
    if (likingId === commentId) return
    setLikingId(commentId)
    try {
      const j = await api.post<{ data?: { count?: number }; count?: number }>(`/api/comments/${commentId}/like`)
      const d = j.data ?? j
      setComments((prev) => prev.map((c) => c.id === commentId ? { ...c, likeCount: d.count ?? c.likeCount } : c))
    } catch (err) {
      logger.forum.warn("[CommentSection] likeComment failed", { error: err instanceof Error ? err.message : String(err) })
    } finally {
      setLikingId(null)
    }
  }

  async function deleteComment(commentId: string) {
    try {
      await api.delete(`/api/comments/${commentId}`)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      logger.forum.warn("[CommentSection] deleteComment failed", { error: err instanceof Error ? err.message : String(err) })
    }
    setDeletingId(null)
  }

  // 楼中楼分组：只在前端按 parentId 归堆，接口返回结构与缓存一律不动。
  // 顶层评论按 createdAt 倒序（「最热」时按点赞倒序），每条下面的回复按 createdAt 正序。
  const threads = useMemo(() => {
    const roots = comments
      .filter((c) => !c.parentId)
      .sort((a, b) => {
        if (sortMode === "hottest") return b.likeCount - a.likeCount
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      })
    return roots.map((root) => ({
      root,
      replies: comments
        .filter((c) => c.parentId === root.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    }))
  }, [comments, sortMode])

  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="h-4 w-0.5 rounded-full bg-primary" />
        评论
        <span className="text-xs font-normal text-muted-foreground">{comments.length}</span>
      </h2>

      {/* 发评论 */}
      {isLoggedIn ? (
        <form onSubmit={submit} className="mb-6">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "rounded-2xl bg-card/80 border-2 border-border transition-[color,background-color,border-color,text-decoration-color,fill,stroke,opacity,box-shadow,transform,filter,backdrop-filter,border-radius] duration-150 ease-in-out overflow-hidden focus-within:rounded-none",
              isDragging ? "border-primary bg-primary/5" : "border-border focus-within:border-primary"
            )}
          >
            {/* 图片预览 */}
            {previewUrl && (
              <div className="px-3 pt-3">
                <div className="relative inline-block group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="预览" className="h-20 w-20 rounded-lg object-cover ring-1 ring-border" />
                  <button type="button" onClick={removePreview}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white"
                    aria-label="移除图片">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            )}

            {/* 输入区域 */}
            <Textarea
              variant="ghost"
              ref={textareaRef}
              value={content}
              onChange={(e) => { setContent(e.target.value); autoResize(e.target) }}
              placeholder={isDragging ? "释放以添加图片…" : "写下评论…"}
              rows={2}
              className="resize-none px-4 py-3 text-sm"
              style={{ minHeight: "3.5rem" }}
            />

            {/* 错误提示 */}
            {submitError && (
              <div className="flex items-center gap-2 border-t border-border/50 bg-red-500/5 px-4 py-2">
                <span className="text-xs text-red-400">{submitError}</span>
                <button type="button" onClick={() => submit({ preventDefault: () => {} } as React.FormEvent)}
                  className="ml-auto text-xs font-medium text-red-400 hover:text-red-300 transition-colors underline underline-offset-2">
                  重试
                </button>
                <button type="button" onClick={() => setSubmitError(null)}
                  className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* 工具栏 */}
            <div className="flex items-center gap-1 border-t border-border/50 px-2 py-1.5">
              <button type="button" onClick={() => fileRef.current?.click()}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                title="上传图片">
                <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileInput} />

              <div className="relative">
                <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                    showEmoji
                      ? "bg-secondary text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title="表情">
                  <Smile className="h-4 w-4" strokeWidth={1.5} />
                </button>
                {showEmoji && (
                  <>
                    <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setShowEmoji(false)} />
                    <div className="absolute bottom-10 left-0 z-50 w-72 rounded-xl bg-card p-3 ring-1 ring-border shadow-4">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-xs font-medium text-foreground">选择表情</p>
                        <button type="button" onClick={() => setShowEmoji(false)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      {COMMENT_EMOJI_GROUPS.map((cat) => (
                        <div key={cat.name} className="mb-2 last:mb-0">
                          <p className="mb-1.5 text-micro font-medium text-muted-foreground">{cat.name}</p>
                          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                            {cat.emojis.map((emoji) => (
                              <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg hover:bg-secondary transition-colors active:scale-90">
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1" />

              <button type="submit" disabled={submitting || (!content.trim() && !selectedFile)}
                className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition duration-150 ease-in-out hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
                {submitting ? "发送中…" : "发送"}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="mb-6 text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:text-primary/80 transition-colors">登录</a>后发表评论
        </p>
      )}

      {/* 排序切换 */}
      {comments.length > 1 && (
        <div className="mb-4 flex items-center gap-1">
          <button
            onClick={() => setSortMode("newest")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              sortMode === "newest"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            最新
          </button>
          <button
            onClick={() => setSortMode("hottest")}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-colors",
              sortMode === "hottest"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            最热
          </button>
        </div>
      )}

      {/* 评论列表 — 楼中楼：顶层评论 + 其下回复 */}
      <div className="space-y-4">
        {threads.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {emptyMsg ? <><EmotionalIcon emoji={emptyMsg.emoji} className="h-4 w-4" /> {emptyMsg.title}，{emptyMsg.subtitle}</> : "还没有评论，来说点什么吧~"}
          </p>
        )}
        {threads.map(({ root, replies }) => {
          const expanded = !!expandedReplies[root.id]
          const hiddenCount = replies.length - REPLIES_PREVIEW
          const shownReplies = hiddenCount > 0 && !expanded ? replies.slice(-REPLIES_PREVIEW) : replies

          return (
            <div key={root.id} className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-secondary/30">
              <UserAvatar user={root.user} size={32} />
              <div className="flex min-w-0 flex-1 flex-col">
                {/* 主评论 — 保持原有扁平样式 */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-foreground">{root.user.username}</span>
                  <span className="text-micro text-muted-foreground">
                    {formatZhDateTime(root.createdAt)}
                  </span>
                  {currentUserId === root.user.id && (
                    <div className="flex items-center gap-0.5 ml-auto sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setDeletingId(root.id)}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        aria-label="删除评论"
                      >
                        <Trash2 className="h-4 w-4" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
                {root.content && <p className="text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">{root.content}</p>}
                {root.imageUrl && (
                  <a href={root.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-xs">
                    <Image src={root.imageUrl} alt="评论图片" width={320} height={240} className="rounded-xl object-cover ring-1 ring-border max-h-60 hover:ring-border transition duration-150 ease-in-out" unoptimized />
                  </a>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => isLoggedIn && likingId !== root.id && likeComment(root.id)}
                    disabled={likingId === root.id}
                    className={cn(
                      "mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 -mx-1.5 -my-1 text-xs transition-colors",
                      isLoggedIn ? "text-muted-foreground hover:text-primary cursor-pointer" : "text-muted-foreground cursor-default"
                    )}
                    aria-label={root.likeCount > 0 ? `${root.likeCount} 个赞` : "点赞"}
                  >
                    <Heart className="h-4 w-4" strokeWidth={1.5} />
                    {root.likeCount > 0 && root.likeCount}
                  </button>
                  {isLoggedIn && (
                    <button
                      type="button"
                      onClick={() => setReplyTo(replyTo === root.id ? null : root.id)}
                      className="mt-1.5 flex items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors hover:text-primary"
                    >
                      <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                      回复
                    </button>
                  )}
                </div>

                {replyTo === root.id && (
                  <ReplyComposer
                    value={replyContent}
                    placeholder={`回复 @${root.user.username}…`}
                    submitting={replySubmitting === root.id}
                    onChange={setReplyContent}
                    onSubmit={() => submitReply(root.id)}
                  />
                )}

                {/* 回复：pl-6 + 2px 左竖线，不给卡片外壳 */}
                {replies.length > 0 && (
                  <div className="mt-2 border-l-2 border-border pl-6">
                    {hiddenCount > 0 && !expanded && (
                      <button
                        type="button"
                        onClick={() => setExpandedReplies((prev) => ({ ...prev, [root.id]: true }))}
                        className="mb-0.5 text-xs font-medium text-primary hover:opacity-80 transition-opacity"
                      >
                        查看全部 {replies.length} 条回复
                      </button>
                    )}
                    {shownReplies.map((r, i) => (
                      <div key={r.id} className={cn("flex gap-2 py-1.5", i > 0 && "border-t border-border/50")}>
                        <UserAvatar user={r.user} size={24} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">{r.user.username}</span>
                            <span className="text-xs text-muted-foreground">{formatZhDateTime(r.createdAt)}</span>
                          </div>
                          {r.content && (
                            <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground whitespace-pre-wrap break-words">{r.content}</p>
                          )}
                          {isLoggedIn && (
                            <button
                              type="button"
                              onClick={() => setReplyTo(replyTo === r.id ? null : r.id)}
                              className="flex items-center gap-1 rounded-md px-1.5 py-1 -mx-1.5 text-xs text-muted-foreground transition-colors hover:text-primary"
                            >
                              <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                              回复
                            </button>
                          )}
                          {replyTo === r.id && (
                            <ReplyComposer
                              value={replyContent}
                              placeholder={`回复 @${r.user.username}…`}
                              submitting={replySubmitting === r.id}
                              onChange={setReplyContent}
                              onSubmit={() => submitReply(root.id)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => { if (!open) setDeletingId(null) }}
        title="删除评论"
        description="确定要删除这条评论吗？删了就找不回来了。"
        variant="destructive"
        onConfirm={() => { if (deletingId) deleteComment(deletingId) }}
      />
    </section>
  )
}

/* ─────────── 回复输入框 ───────────
   主评论与其每条回复共用同一份（单行输入 + 发送，回车即发），
   不为楼中楼另开一套评论状态机。 */

function ReplyComposer({
  value,
  placeholder,
  submitting,
  onChange,
  onSubmit,
}: {
  value: string
  placeholder: string
  submitting: boolean
  onChange: (value: string) => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            if (value.trim() && !submitting) onSubmit()
          }
        }}
        placeholder={placeholder}
        className="flex min-h-8 flex-1 rounded-lg bg-secondary/60 px-3 py-1.5 text-[13px] text-foreground placeholder:text-muted-foreground outline-none ring-1 ring-border transition-colors focus:ring-primary"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={submitting || !value.trim()}
        className="flex min-h-8 shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition duration-150 ease-in-out hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
        {submitting ? "发送中…" : "发送"}
      </button>
    </div>
  )
}
