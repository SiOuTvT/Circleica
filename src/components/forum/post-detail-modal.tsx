"use client"

import { useState, useRef, useCallback, useEffect, memo } from "react"
import Image from "next/image"
import { CheckCircle2, ChevronLeft, Edit3, Eye, Heart, ImageIcon, Lock, MessageSquare, Send, Share2, Smile, Trash2, X } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Tag } from "@/components/ui/tag"
import { RichTextContent } from "../rich-text-content-wrapper"
import type { Post, Comment, User } from "./forum-client-root"
import { logger } from "@/lib/logger"
import { apiFetchSafe } from "@/lib/api-client"
import { EMOJI_LIST } from "@/lib/emoji"
import { timeAgo } from "@/lib/time-ago"
import { UserAvatar } from "@/components/user-avatar"

// fmtDate 已统一为 timeAgo（H1 迁移至 @/lib/time-ago）
// Avatar 已统一为用户头像组件 UserAvatar（H3 消除 4 处本地定义）


// EMOJI_LIST 已迁移至 @/lib/emoji（L1 统一为单一来源）

// 表情面板组件 - 使用 memo 避免不必要的重渲染
const EmojiPanel = memo(function EmojiPanel({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute bottom-10 left-0 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-card p-3 ring-1 ring-border shadow-4"
        role="dialog"
        aria-label="表情选择器"
      >
        <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
          {EMOJI_LIST.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => onSelect(emoji)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-secondary transition-colors active:scale-90"
              aria-label={`插入表情 ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </>
  )
})

interface PostDetailModalProps {
  post: (Post & { comments: Comment[] }) | null
  onClose: () => void
  isLoggedIn: boolean
  currentUserId?: string
  isAdmin?: boolean
  onLikePost: (id: string) => void
  onToggleSolve: (id: string) => void
  onStartEdit: (post: Post) => void
  onDelete: (id: string) => void
  setImageError: (msg: string | null) => void
  commentInputRef: React.RefObject<HTMLInputElement | null>
  onLikeComment?: (id: string) => void
  onDeleteComment?: (id: string) => void
}

export function PostDetailModal({
  post,
  onClose,
  isLoggedIn,
  currentUserId,
  isAdmin,
  onLikePost,
  onToggleSolve,
  onStartEdit,
  onDelete,
  setImageError,
  commentInputRef,
  onLikeComment,
  onDeleteComment,
}: PostDetailModalProps) {
  const [commentText, setCommentText] = useState("")
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [showCommentEmoji, setShowCommentEmoji] = useState(false)
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const commentFileRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)

  // 本地评论列表，支持提交/编辑后即时更新
  const [localComments, setLocalComments] = useState<Comment[]>(post?.comments ?? [])
  // 当 post 变化时同步评论
  useEffect(() => {
    setLocalComments(post?.comments ?? [])
    setEditingComment(null)
  }, [post?.id])

  // Esc 键关闭表情面板
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && showCommentEmoji) {
        setShowCommentEmoji(false)
      }
    }
    if (showCommentEmoji) {
      window.addEventListener("keydown", handleEsc)
      return () => window.removeEventListener("keydown", handleEsc)
    }
  }, [showCommentEmoji])

  // 弹窗打开时的焦点管理与键盘可达性（Esc 关闭 + Tab 焦点陷阱）
  useEffect(() => {
    if (!post) return
    const node = dialogRef.current
    node?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return }
      if (e.key === "Tab" && node) {
        const focusables = node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
        )
        if (focusables.length === 0) return
        const first = focusables[0]
        const last = focusables[focusables.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [post, onClose])

  if (!post) return null

  const isAuthor = currentUserId === post.user.id

  const handleCommentImage = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      setImageError("图片太大啦，最多 5MB 哦")
      setTimeout(() => setImageError(null), 3000)
      return
    }
    setCommentImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCommentImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }, [setImageError])

  const insertCommentEmoji = useCallback((emoji: string) => {
    const input = commentInputRef.current
    if (input) {
      const start = input.selectionStart ?? commentText.length
      const end = input.selectionEnd ?? commentText.length
      const newText = commentText.slice(0, start) + emoji + commentText.slice(end)
      setCommentText(newText)
      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length
        input.focus()
      }, 0)
    } else {
      setCommentText(commentText + emoji)
    }
  }, [commentText, commentInputRef])

  const handleSubmitComment = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    if (!commentText.trim() && !commentImageFile) return
    setCommentSubmitting(true)
    try {
      const fd = new FormData()
      const text = replyTo ? `${replyTo} ${commentText.trim()}` : commentText.trim()
      fd.append("content", text)
      if (commentImageFile) fd.append("image", commentImageFile)
      const res = await fetch(`/api/forum/posts/${post.id}/comments`, { method: "POST", body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        toast.error(err?.error || "评论发送失败，请稍后再试")
        return
      }
      const json = await res.json()
      const data = json.data ?? json
      setCommentText("")
      setCommentImagePreview(null)
      setCommentImageFile(null)
      setShowCommentEmoji(false)
      setReplyTo(null)
      // 追加新评论到本地列表
      const newComment: Comment = {
        id: data.id,
        content: data.content ?? "",
        imageUrl: data.imageUrl ?? "",
        likeCount: data.likeCount ?? 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt ?? data.createdAt,
        user: data.user ?? { id: currentUserId ?? "", username: "", avatar: "" },
      }
      setLocalComments((prev) => [...prev, newComment])
    } catch {
      toast.error("网络错误，请检查网络后重试")
    } finally {
      setCommentSubmitting(false)
    }
  }, [commentText, commentImageFile, replyTo, post.id, currentUserId])

  const handleLikeComment = useCallback((id: string) => {
    onLikeComment?.(id)
  }, [onLikeComment])

  const handleDeleteComment = useCallback((id: string) => {
    onDeleteComment?.(id)
    setLocalComments((prev) => prev.filter((c) => c.id !== id))
  }, [onDeleteComment])

  const startEditComment = useCallback((id: string, text: string) => {
    setEditingComment(id)
    setEditCommentText(text)
  }, [])

  const submitEditComment = useCallback(async (id: string) => {
    if (!editCommentText.trim()) return
    try {
      const { ok, data } = await apiFetchSafe<{ data?: Comment; content?: string; updatedAt?: string }>(`/api/forum/comments/${id}`, {
        method: "PUT",
        body: { content: editCommentText.trim() },
      })
      if (ok) {
        const updated = (data?.data ?? data) as Partial<Comment> | undefined
        setEditingComment(null)
        // 更新本地评论内容
        setLocalComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, content: updated?.content ?? editCommentText.trim(), updatedAt: updated?.updatedAt } : c))
        )
      }
    } catch (err) { logger.forum.warn("[PostDetailModal] editComment failed", { error: err instanceof Error ? err.message : String(err) }) }
  }, [editCommentText])

  return (
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-label="帖子详情" className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onClose} aria-label="返回帖子列表" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{post.title}</span>
        {post.isSolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={1.5} />}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          <div className="p-5">
            {/* 帖子元信息 */}
            <div className="mb-3 flex items-center gap-2.5">
              <UserAvatar user={post.user} size={32} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{post.user.username}</p>
                <p className="text-micro text-muted-foreground">
                  {timeAgo(post.createdAt)}
                  {post.updatedAt !== post.createdAt && " · 已编辑"}
                  {post.viewCount != null && ` · 浏览 ${post.viewCount}`}
                </p>
              </div>
              {post.isSolved && (
                <Tag color="#10b981" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />已解决
                </Tag>
              )}
              {post.isLocked && (
                <Tag color="#f59e0b" className="gap-1">
                  <Lock className="h-3 w-3" strokeWidth={2} />已锁定
                </Tag>
              )}
            </div>

            <h2 className="mb-3 text-base font-semibold text-foreground">{post.title}</h2>
            <RichTextContent html={post.content} />
            {post.imageUrl && (
              <Image src={post.imageUrl} alt={post.title} width={480} height={320} className="mt-3 max-w-full rounded-xl object-cover" sizes="(max-width: 640px) 100vw, 480px" />
            )}

            {/* 帖子操作 */}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => onLikePost(post.id)} disabled={!isLoggedIn}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-primary disabled:opacity-40">
                <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}
              </button>
              <button onClick={() => { const url = window.location.href; if (navigator.clipboard) { navigator.clipboard.writeText(url); toast.success("链接已复制") } }}
                className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground">
                <Share2 className="h-3.5 w-3.5" strokeWidth={1.5} />分享
              </button>
              {isAuthor && (
                <>
                  <button onClick={() => onToggleSolve(post.id)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs ring-1 transition-all",
                      post.isSolved
                        ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20 hover:bg-emerald-500/20"
                        : "bg-secondary text-muted-foreground ring-border hover:text-foreground"
                    )}>
                    <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                    {post.isSolved ? "取消已解决" : "标记已解决"}
                  </button>
                  {!post.isLocked && (
                    <button onClick={() => onStartEdit(post)}
                      className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground">
                      <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />编辑
                    </button>
                  )}
                </>
              )}
              {(isAuthor || isAdmin) && (
                <button onClick={() => onDelete(post.id)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20">
                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />删除
                </button>
              )}
            </div>
          </div>

          {/* 评论区 */}
          <div className="border-t border-border p-5">
            <p className="mb-3 text-xs font-semibold text-muted-foreground">评论 {localComments.length}</p>
            <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {localComments.length === 0 && <p className="text-xs text-muted-foreground">还没有人回复，来说点什么吧~</p>}
              {localComments.map(c => (
                <div key={c.id} className="flex gap-2.5">
                  <UserAvatar user={c.user} size={24} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">{c.user.username}</span>
                      <span className="text-micro text-muted-foreground">{timeAgo(c.createdAt)}</span>
                      {c.updatedAt && c.updatedAt !== c.createdAt && <span className="text-micro text-muted-foreground/50">已编辑</span>}
                    </div>
                    {editingComment === c.id ? (
                      <div className="space-y-2">
                        <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                        <div className="flex gap-2">
                          <button onClick={() => submitEditComment(c.id)}
                            className="rounded-lg bg-primary px-2.5 py-1 text-micro font-medium text-primary-foreground hover:opacity-90">保存</button>
                          <button onClick={() => setEditingComment(null)}
                            className="rounded-lg bg-secondary px-2.5 py-1 text-micro font-medium text-muted-foreground hover:text-foreground">取消</button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs leading-relaxed text-muted-foreground break-words">{c.content}</p>
                    )}
                    {c.imageUrl && (
                      <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 block max-w-[200px]">
                        <Image src={c.imageUrl} alt="评论图片" width={200} height={128} className="rounded-lg object-cover ring-1 ring-border max-h-32 hover:ring-border transition-all" unoptimized />
                      </a>
                    )}
                    <div className="mt-1 flex items-center gap-2">
                      <button onClick={() => handleLikeComment(c.id)} disabled={!isLoggedIn}
                        className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40">
                        <Heart className="h-3 w-3" strokeWidth={1.5} />{c.likeCount > 0 && c.likeCount}
                      </button>
                      <button onClick={() => { setReplyTo(`@${c.user.username} `); commentInputRef.current?.focus() }}
                        className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                        <MessageSquare className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                      {currentUserId === c.user.id && editingComment !== c.id && (
                        <button onClick={() => startEditComment(c.id, c.content)}
                          className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                          <Edit3 className="h-3 w-3" strokeWidth={1.5} />
                        </button>
                      )}
                      {(currentUserId === c.user.id || isAdmin) && (
                        <button onClick={() => handleDeleteComment(c.id)}
                          className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-red-400">
                          <Trash2 className="h-3 w-3" strokeWidth={1.5} />删除
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 评论输入 */}
            {isLoggedIn ? (
              <div>
                {commentImagePreview && (
                  <div className="mb-2 relative inline-block group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={commentImagePreview} alt="预览" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" />
                    <button type="button" onClick={() => { setCommentImageFile(null); setCommentImagePreview(null) }}
                      aria-label="移除图片"
                      className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                      <X className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
                    </button>
                  </div>
                )}
                {replyTo && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>回复 {replyTo.replace(/^@/, "").replace(/\s$/, "")}</span>
                    <button type="button" onClick={() => setReplyTo(null)}
                      className="text-muted-foreground/50 hover:text-foreground">
                      <X className="h-3 w-3" strokeWidth={2} />
                    </button>
                  </div>
                )}
                <form onSubmit={handleSubmitComment} className="flex gap-2 items-center">
                  <div className="relative flex items-center gap-1">
                    <button type="button" onClick={() => commentFileRef.current?.click()}
                      className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
                      aria-label="上传图片">
                      <ImageIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                    </button>
                    <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={handleCommentImage} />

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowCommentEmoji(!showCommentEmoji)}
                        className={cn(
                          "flex h-11 w-11 items-center justify-center rounded-lg transition-colors shrink-0",
                          showCommentEmoji
                            ? "bg-secondary text-primary"
                            : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                        )}
                        aria-label="表情"
                        aria-expanded={showCommentEmoji}
                      >
                        <Smile className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                      </button>

                      {/* 表情选择器 */}
                      {showCommentEmoji && (
                        <EmojiPanel
                          onSelect={(emoji) => {
                            insertCommentEmoji(emoji)
                            setShowCommentEmoji(false)
                            commentInputRef.current?.focus()
                          }}
                          onClose={() => setShowCommentEmoji(false)}
                        />
                      )}
                    </div>
                  </div>
                  <input ref={commentInputRef} value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="写下评论…"
                    className="flex-1 rounded-xl bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all min-h-[44px]" />
                  <button type="submit" disabled={commentSubmitting || (!commentText.trim() && !commentImagePreview)}
                    aria-label="发送评论"
                    className="flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground disabled:opacity-40">
                    <Send className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                </form>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground"><a href="/login" className="text-primary hover:text-primary/80">登录</a>后发表评论</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}