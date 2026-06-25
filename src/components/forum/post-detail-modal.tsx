"use client"

import { useState, useRef, useCallback, useEffect, memo } from "react"
import Image from "next/image"
import { CheckCircle2, ChevronLeft, Edit3, Heart, ImageIcon, MessageSquare, Send, Smile, Trash2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { RichTextContent } from "../rich-text-content-wrapper"
import type { Post, Comment, User } from "./forum-client-root"

function fmtDate(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

const Avatar = memo(function Avatar({ user, size = 6 }: { user: User; size?: number }) {
  const s = `h-${size} w-${size}`
  if (user.avatar) return <Image src={user.avatar} alt={user.username} width={size * 4} height={size * 4} className={`${s} rounded-full object-cover shrink-0`} />
  return <div className={`${s} rounded-full bg-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0`}>{user.username[0].toUpperCase()}</div>
})

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😋", "🤔", "😎", "🥺",
  "😭", "😤", "🤯", "🥳", "🤩", "😴", "🤮", "👻", "💀", "🤡",
  "👍", "👎", "❤️", "🔥", "⭐", "🎉", "🎮", "🎵", "✨", "💯",
]

// 表情面板组件 - 使用 memo 避免不必要的重渲染
const EmojiPanel = memo(function EmojiPanel({ onSelect, onClose }: { onSelect: (emoji: string) => void; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        className="absolute bottom-10 left-0 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-card p-3 ring-1 ring-border shadow-2xl"
        role="dialog"
        aria-label="表情选择器"
      >
        <div className="grid grid-cols-10 gap-1">
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
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")
  const commentFileRef = useRef<HTMLInputElement>(null)

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
    const fd = new FormData()
    fd.append("content", commentText.trim())
    if (commentImageFile) fd.append("image", commentImageFile)
    const res = await fetch(`/api/forum/posts/${post.id}/comments`, { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok && data) {
      setCommentText("")
      setCommentImagePreview(null)
      setCommentImageFile(null)
      setShowCommentEmoji(false)
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
    }
  }, [commentText, commentImageFile, post.id, currentUserId])

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
      const res = await fetch(`/api/forum/comments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentText.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setEditingComment(null)
        // 更新本地评论内容
        setLocalComments((prev) =>
          prev.map((c) => (c.id === id ? { ...c, content: updated.content ?? editCommentText.trim(), updatedAt: updated.updatedAt } : c))
        )
      }
    } catch { /* ignore */ }
  }, [editCommentText])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
      {/* 顶部栏 */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <button onClick={onClose} aria-label="返回帖子列表" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
        <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{post.title}</span>
        {post.isSolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={1.5} />}
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
          <div className="p-5">
            {/* 帖子元信息 */}
            <div className="mb-3 flex items-center gap-2.5">
              <Avatar user={post.user} size={8} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{post.user.username}</p>
                <p className="text-[10px] text-muted-foreground">
                  {fmtDate(post.createdAt)}
                  {post.updatedAt !== post.createdAt && " · 已编辑"}
                </p>
              </div>
              {post.isSolved && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500 ring-1 ring-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" strokeWidth={2} />已解决
                </span>
              )}
            </div>

            <h2 className="mb-3 text-base font-bold text-foreground">{post.title}</h2>
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
              {isAuthor && (
                <>
                  <button onClick={() => onToggleSolve(post.id)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 py-2 text-xs ring-1 transition-all",
                      post.isSolved
                        ? "bg-emerald-500/10 text-emerald-500 ring-emerald-500/20 hover:bg-emerald-500/20"
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
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20">
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
                  <Avatar user={c.user} size={6} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-medium text-foreground">{c.user.username}</span>
                      <span className="text-[10px] text-muted-foreground">{fmtDate(c.createdAt)}</span>
                      {c.updatedAt && c.updatedAt !== c.createdAt && <span className="text-[10px] text-muted-foreground/50">已编辑</span>}
                    </div>
                    {editingComment === c.id ? (
                      <div className="space-y-2">
                        <input value={editCommentText} onChange={(e) => setEditCommentText(e.target.value)}
                          className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                        <div className="flex gap-2">
                          <button onClick={() => submitEditComment(c.id)}
                            className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">保存</button>
                          <button onClick={() => setEditingComment(null)}
                            className="rounded-lg bg-secondary px-2.5 py-1 text-[10px] font-medium text-muted-foreground hover:text-foreground">取消</button>
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
                      className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                      <X className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
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
                  <button type="submit" disabled={!commentText.trim() && !commentImagePreview}
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