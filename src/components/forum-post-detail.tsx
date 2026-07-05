"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, Edit3, Heart, Image as ImageIcon, Lock, MessageSquare, Send, Share2, Smile, Trash2, X } from "lucide-react"
import NextImage from "next/image"
import { Tag } from "@/components/ui/tag"
import { useEffect, useRef, useState } from "react"
import { toast } from "sonner"
import { useBreadcrumb } from "./breadcrumb-context"
import { ConfirmDialog } from "./ui/confirm-dialog"
import { RichTextContent } from "./rich-text-content-wrapper"
import { RichTextEditor } from "./rich-text-editor-wrapper"

interface User { id: string; username: string; avatar: string }
interface Comment { id: string; content: string; imageUrl: string; likeCount: number; createdAt: string; updatedAt?: string; user: User }
interface PostData {
  id: string; title: string; content: string; imageUrl: string
  likeCount: number; commentCount: number; viewCount?: number; isSolved: boolean; isLocked?: boolean
  createdAt: string; user: User
}

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😋", "🤔", "😎", "🥺",
  "😭", "😤", "🤯", "🥳", "🤩", "😴", "🤮", "👻", "💀", "🤡",
  "👍", "👎", "❤️", "🔥", "⭐", "🎉", "🎮", "🎵", "✨", "💯",
]

function Avatar({ user, size = "md" }: { user: User; size?: "sm" | "md" | "lg" }) {
  const cls = size === "sm" ? "h-8 w-8 text-[10px]" : size === "md" ? "h-10 w-10 text-xs" : "h-11 w-11 text-sm"
  if (user.avatar) return <NextImage src={user.avatar} alt={user.username} width={44} height={44} className={`${cls} rounded-full object-cover shrink-0`} />
  return <div className={`${cls} rounded-full bg-primary/80 flex items-center justify-center font-bold text-primary-foreground shrink-0`}>{user.username[0].toUpperCase()}</div>
}

function fmtDate(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  if (diff < 86_400_000 * 30) return `${Math.floor(diff / 86_400_000)}天前`
  return date.toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" })
}

function fmtFullDate(d: string) {
  return new Date(d).toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
}

export function ForumPostDetail({ post: initPost, comments: initComments, isLoggedIn, currentUserId, isAdmin }: {
  post: PostData; comments: Comment[]; isLoggedIn: boolean; currentUserId?: string; isAdmin?: boolean
}) {
  const [post, setPost] = useState(initPost)
  const [comments, setComments] = useState(initComments)
  const [commentText, setCommentText] = useState("")
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [showEmoji, setShowEmoji] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [imageError, setImageError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLInputElement>(null)
  const commentFileRef = useRef<HTMLInputElement>(null)
  const isAuthor = currentUserId === post.user.id

  // Edit states
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(post.title)
  const [editContent, setEditContent] = useState(post.content)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")

  // 注入面包屑动态标签
  const { setDynamicLabel } = useBreadcrumb()
  useEffect(() => {
    setDynamicLabel(post.id, post.title)
    return () => setDynamicLabel(post.id, null)
  }, [post.id, post.title, setDynamicLabel])

  // ── 点赞帖子 ──
  async function likePost() {
    const prev = post.likeCount
    setPost(p => ({ ...p, likeCount: p.likeCount + 1 }))
    try {
      const res = await fetch(`/api/forum/posts/${post.id}/like`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPost(p => ({ ...p, likeCount: data.likeCount }))
    } catch {
      setPost(p => ({ ...p, likeCount: prev }))
    }
  }

  // ── 点赞评论 ──
  async function likeComment(id: string) {
    if (!isLoggedIn) return
    try {
      const res = await fetch(`/api/forum/comments/${id}/like`, { method: "POST" })
      const data = await res.json()
      setComments(cs => cs.map(c => c.id === id ? { ...c, likeCount: data.likeCount } : c))
    } catch {}
  }

  // ── 标记已解决 ──
  async function toggleSolve() {
    try {
      const res = await fetch(`/api/forum/posts/${post.id}/solve`, { method: "POST" })
      const data = await res.json()
      if (res.ok) setPost(p => ({ ...p, isSolved: data.isSolved }))
    } catch {}
  }

  // ── 删除帖子 ──
  function confirmDeletePost() {
    setConfirmMessage("确定要删除这个帖子吗？")
    setConfirmCallback(() => async () => {
      try {
        const res = await fetch(`/api/forum/posts/${post.id}`, { method: "DELETE" })
        if (res.ok) window.location.href = "/forum"
      } catch {}
    })
    setConfirmOpen(true)
  }

  // ── 删除评论 ──
  function confirmDeleteComment(id: string) {
    setConfirmMessage("确定要删除这条评论吗？")
    setConfirmCallback(() => async () => {
      try {
        const res = await fetch(`/api/forum/comments/${id}`, { method: "DELETE" })
        if (res.ok) {
          setComments(cs => cs.filter(c => c.id !== id))
          setPost(p => ({ ...p, commentCount: Math.max(0, p.commentCount - 1) }))
        }
      } catch {}
    })
    setConfirmOpen(true)
  }

  // ── 提交评论 ──
  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() && !commentImageFile) return
    setSubmitting(true)
    try {
      const fd = new FormData()
      const text = replyTo ? `${replyTo} ${commentText.trim()}` : commentText.trim()
      fd.append("content", text)
      if (commentImageFile) fd.append("image", commentImageFile)
      const res = await fetch(`/api/forum/posts/${post.id}/comments`, { method: "POST", body: fd })
      if (res.ok) {
        const json = await res.json()
        const comment = json.data ?? json
        setComments(cs => [...cs, comment])
        setPost(p => ({ ...p, commentCount: p.commentCount + 1 }))
        setCommentText("")
        setCommentImagePreview(null)
        setCommentImageFile(null)
        setShowEmoji(false)
        setReplyTo(null)
      } else {
        const err = await res.json().catch(() => null)
        toast.error(err?.error || "评论发送失败，请稍后再试")
      }
    } catch {
      toast.error("网络错误，请检查网络后重试")
    } finally {
      setSubmitting(false)
    }
  }

  function handleCommentImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) {
      setImageError("图片太大啦，最多 5MB")
      setTimeout(() => setImageError(null), 3000)
      return
    }
    setCommentImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCommentImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function insertEmoji(emoji: string) {
    const input = commentInputRef.current
    if (input) {
      const start = input.selectionStart ?? commentText.length
      const end = input.selectionEnd ?? commentText.length
      setCommentText(commentText.slice(0, start) + emoji + commentText.slice(end))
      setTimeout(() => { input.selectionStart = input.selectionEnd = start + emoji.length; input.focus() }, 0)
    } else {
      setCommentText(commentText + emoji)
    }
  }

  function sharePost() {
    const url = window.location.href
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url)
      setImageError("链接已复制")
      setTimeout(() => setImageError(null), 2000)
    }
  }

  // ── 识别评论中的 @回复 ──
  function renderCommentContent(content: string) {
    const atMatch = content.match(/^@(\S+)\s/)
    if (atMatch) {
      const name = atMatch[1]
      const rest = content.slice(atMatch[0].length)
      return <><span className="text-primary/80">@{name}</span> {rest}</>
    }
    return content
  }

  return (
    <>
      {/* ── 帖子主体 ── */}
      <article className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        {/* 标题 + 作者信息 */}
        <div className="p-6 pb-0 md:p-8 md:pb-0">
          <h1 className="text-xl md:text-2xl font-bold text-foreground leading-snug">{post.title}</h1>

          <div className="mt-4 flex items-center gap-3">
            <Avatar user={post.user} size="md" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{post.user.username}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                {fmtFullDate(post.createdAt)} · 浏览 {post.viewCount ?? (post.commentCount + post.likeCount)}
              </p>
            </div>
            {post.isSolved && (
              <Tag color="#10b981" className="gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={2} />已解决
              </Tag>
            )}
            {post.isLocked && (
              <Tag color="#f43f5e" className="gap-1">
                <Lock className="h-3.5 w-3.5" strokeWidth={2} /> 已锁定
              </Tag>
            )}
          </div>
        </div>

        {/* 正文 */}
        <div className="p-6 md:p-8">
          <div className="prose prose-sm dark:prose-invert max-w-none text-foreground leading-relaxed">
            <RichTextContent html={post.content} />
          </div>
          {post.imageUrl && (
            <NextImage src={post.imageUrl} alt={post.title} width={640} height={400}
              className="mt-4 max-w-full rounded-xl object-cover ring-1 ring-border" sizes="(max-width: 768px) 100vw, 640px" />
          )}
        </div>

        {/* 操作栏 */}
        <div className="border-t border-border px-4 py-3 sm:px-6 md:px-8 flex flex-wrap items-center gap-1">
          <button onClick={likePost} disabled={!isLoggedIn}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-red-400 hover:bg-red-500/5 disabled:opacity-40">
            <Heart className="h-4 w-4" strokeWidth={1.5} />{post.likeCount}
          </button>
          <span className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" strokeWidth={1.5} />{post.commentCount}
          </span>
          <button onClick={sharePost}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground hover:bg-secondary">
            <Share2 className="h-4 w-4" strokeWidth={1.5} />分享
          </button>
          <div className="ml-auto flex flex-wrap items-center gap-1">
            {isAuthor && (
              <>
                <button onClick={toggleSolve}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs ring-1 transition-all",
                    post.isSolved ? "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20" : "bg-secondary text-muted-foreground ring-border hover:text-foreground"
                  )}>
                  <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                  {post.isSolved ? "已解决" : "标记解决"}
                </button>
                {!post.isLocked && (
                  <button onClick={() => { setEditing(true); setEditTitle(post.title); setEditContent(post.content) }}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground hover:bg-secondary">
                    <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />编辑
                  </button>
                )}
              </>
            )}
            {(isAuthor || isAdmin) && (
              <button onClick={confirmDeletePost}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-red-400 ring-1 ring-red-500/20 transition-all hover:bg-red-500/10">
                <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />删除
              </button>
            )}
          </div>
        </div>
      </article>

      {/* ── 评论区 ── */}
      <section className="mt-4 rounded-2xl bg-card ring-1 ring-border overflow-hidden">
        <div className="p-6 md:p-8">
          <h2 className="text-sm font-semibold text-foreground mb-5 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
            评论 · {comments.length}
          </h2>

          {comments.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground/50">还没有评论，来说点什么吧</p>
          )}

          <div className="space-y-5">
            {comments.map((c) => (
              <div key={c.id} className="group flex gap-3">
                <Avatar user={c.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground">{c.user.username}</span>
                    <span className="text-xs text-muted-foreground/50">{fmtDate(c.createdAt)}</span>
                    {c.updatedAt && c.updatedAt !== c.createdAt && <span className="text-[10px] text-muted-foreground/40">已编辑</span>}
                  </div>
                  {editingComment === c.id ? (
                    <div className="space-y-2 mt-1">
                      <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                        className="w-full rounded-lg bg-secondary px-3 py-1.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                      <div className="flex gap-2">
                        <button onClick={async () => {
                          if (!editCommentText.trim()) return
                          const res = await fetch(`/api/forum/comments/${c.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: editCommentText.trim() }) })
                          if (res.ok) {
                            const data = await res.json()
                            setComments(cs => cs.map(x => x.id === c.id ? { ...x, content: data.content, updatedAt: data.updatedAt } : x))
                            setEditingComment(null)
                          }
                        }}
                          className="rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90">保存</button>
                        <button onClick={() => setEditingComment(null)}
                          className="rounded-lg bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">取消</button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground leading-relaxed break-words">
                      {renderCommentContent(c.content)}
                    </p>
                  )}
                  {c.imageUrl && (
                    <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-2 block max-w-[240px]">
                      <NextImage src={c.imageUrl} alt="评论图片" width={240} height={160}
                        className="rounded-lg object-cover ring-1 ring-border max-h-40 hover:ring-primary/30 transition-all" unoptimized />
                    </a>
                  )}
                  <div className="mt-2 flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <button onClick={() => { setReplyTo(`@${c.user.username} `); commentInputRef.current?.focus() }}
                      className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors hover:bg-secondary">
                      回复
                    </button>
                    <button onClick={() => likeComment(c.id)} disabled={!isLoggedIn}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded transition-colors hover:bg-red-500/5 disabled:opacity-40">
                      <Heart className="h-3 w-3" strokeWidth={1.5} />{c.likeCount > 0 && c.likeCount}
                    </button>
                    {currentUserId === c.user.id && (
                      <button onClick={() => { setEditingComment(c.id); setEditCommentText(c.content) }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors hover:bg-secondary">
                        <Edit3 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                    {(currentUserId === c.user.id || isAdmin) && (
                      <button onClick={() => confirmDeleteComment(c.id)}
                        className="text-xs text-muted-foreground hover:text-red-400 px-2 py-1 rounded transition-colors hover:bg-red-500/5">
                        <Trash2 className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 评论输入框 ── */}
        <div className="border-t border-border p-4 md:px-8 md:py-5">
          {post.isLocked ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Lock className="h-4 w-4" strokeWidth={2} /> 帖子已锁定，无法发表评论
            </p>
          ) : isLoggedIn ? (
            <form onSubmit={submitComment} className="space-y-2">
              {/* 回复提示 */}
              {replyTo && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>回复 {replyTo.replace(/^@/, "").replace(/\s$/, "")}</span>
                  <button type="button" onClick={() => setReplyTo(null)} className="text-muted-foreground/50 hover:text-foreground">
                    <X className="h-3 w-3" strokeWidth={2} />
                  </button>
                </div>
              )}

              {/* 图片预览 */}
              {commentImagePreview && (
                <div className="relative inline-block group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={commentImagePreview} alt="预览" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" />
                  <button type="button" onClick={() => { setCommentImageFile(null); setCommentImagePreview(null) }}
                    className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-secondary text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                    <X className="h-3.5 w-3.5" strokeWidth={2} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                {/* 工具按钮 */}
                <div className="flex items-center gap-1 shrink-0">
                  <button type="button" onClick={() => commentFileRef.current?.click()}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground">
                    <ImageIcon className="h-4 w-4" strokeWidth={1.5} />
                  </button>
                  <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={handleCommentImage} />

                  <div className="relative">
                    <button type="button" onClick={() => setShowEmoji(!showEmoji)}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                        showEmoji ? "bg-secondary text-primary" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                      )}>
                      <Smile className="h-4 w-4" strokeWidth={1.5} />
                    </button>
                  {showEmoji && (
                    <>
                      <div className="fixed inset-0 z-40 cursor-pointer" onClick={() => setShowEmoji(false)} />
                      <div className="absolute bottom-11 left-0 z-50 w-72 rounded-xl bg-card p-3 ring-1 ring-border shadow-2xl">
                        <div className="grid grid-cols-10 gap-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => insertEmoji(emoji)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-base hover:bg-secondary transition-colors active:scale-90">
                              {emoji}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                </div>

                <input ref={commentInputRef} value={commentText} onChange={e => setCommentText(e.target.value)}
                  placeholder="写下你的评论..."
                  className="flex-1 rounded-xl bg-secondary/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 ring-1 ring-border/50 outline-none focus:ring-primary/30 focus:bg-secondary transition-all" />

                <button type="submit" disabled={submitting || (!commentText.trim() && !commentImagePreview)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:opacity-90 disabled:opacity-30 shrink-0">
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                </button>
              </div>
            </form>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              <a href="/login" className="text-primary hover:text-primary/80 transition-colors underline underline-offset-2">登录</a> 后发表评论
            </p>
          )}
        </div>
      </section>

      {/* 确认弹窗 */}
      <ConfirmDialog open={confirmOpen} onOpenChange={setConfirmOpen} title="确认操作" description={confirmMessage}
        variant="destructive" confirmText="确认" onConfirm={() => confirmCallback?.()} />

      {/* Toast */}
      {imageError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-foreground/90 px-5 py-2.5 text-sm text-background shadow-xl backdrop-blur-sm">
          {imageError}
        </div>
      )}

      {/* 编辑帖子弹窗 */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">编辑帖子</h2>
              <button onClick={() => setEditing(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <div className="space-y-4">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="标题" maxLength={100}
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
              <RichTextEditor content={editContent} onChange={setEditContent} placeholder="内容" />
              <div className="flex gap-3">
                <button onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-muted-foreground ring-1 ring-border hover:text-foreground">
                  取消
                </button>
                <button onClick={async () => {
                  if (!editTitle.trim() || !editContent.trim()) return
                  setEditSubmitting(true)
                  const res = await fetch(`/api/forum/posts/${post.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
                  })
                  if (res.ok) {
                    const data = await res.json()
                    setPost(p => ({ ...p, title: data.title, content: data.content }))
                    setEditing(false)
                  }
                  setEditSubmitting(false)
                }}
                  disabled={editSubmitting}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
                  {editSubmitting ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
