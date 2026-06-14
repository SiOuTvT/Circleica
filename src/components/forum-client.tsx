"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { logger } from "@/lib/logger"
import { cn } from "@/lib/utils"
import { CheckCircle2, ChevronLeft, Edit3, Heart, ImageIcon, MessageSquare, Plus, Search, Send, Smile, Trash2, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { ConfirmDialog } from "./ui/confirm-dialog"
import { RichTextContent } from "./rich-text-content-wrapper"
import { RichTextEditor } from "./rich-text-editor-wrapper"

export interface User { id: string; username: string; avatar: string }
export interface Comment { id: string; content: string; imageUrl: string; likeCount: number; createdAt: string; updatedAt?: string; user: User }
export interface Post { id: string; title: string; content: string; imageUrl: string; likeCount: number; commentCount: number; isSolved: boolean; isPinned: boolean; isLocked: boolean; category: string; viewCount: number; updatedAt: string; createdAt: string; user: User; comments?: Comment[] }

const CATEGORIES = [
  { value: "discussion", label: "讨论", icon: "💬" },
  { value: "help", label: "求档", icon: "🔍" },
  { value: "resource", label: "资源", icon: "📦" },
  { value: "offtopic", label: "杂谈", icon: "☕" },
]
const CATEGORY_LABEL: Record<string, string> = Object.fromEntries(CATEGORIES.map(c => [c.value, `${c.icon} ${c.label}`]))

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😋", "🤔", "😎", "🥺",
  "😭", "😤", "🤯", "🥳", "🤩", "😴", "🤮", "👻", "💀", "🤡",
  "👍", "👎", "❤️", "🔥", "⭐", "🎉", "🎮", "🎵", "✨", "💯",
]

function Avatar({ user, size = 6 }: { user: User; size?: number }) {
  const s = `h-${size} w-${size}`
  if (user.avatar) return <Image src={user.avatar} alt={user.username} width={size * 4} height={size * 4} className={`${s} rounded-full object-cover shrink-0`} />
  return <div className={`${s} rounded-full bg-primary/80 flex items-center justify-center text-[10px] font-bold text-primary-foreground shrink-0`}>{user.username[0].toUpperCase()}</div>
}

function fmtDate(d: string) {
  const date = new Date(d)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  if (diff < 60_000) return "刚刚"
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}小时前`
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" })
}

export function ForumClient({ initialPosts, isLoggedIn, currentUser, isAdmin, totalPages: initialTotalPages }: {
  initialPosts: Post[]; isLoggedIn: boolean; currentUser?: User | null; isAdmin?: boolean; totalPages?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [posts, setPosts] = useState(initialPosts)
  const [activePost, setActivePost] = useState<(Post & { comments: Comment[] }) | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [newCategory, setNewCategory] = useState("discussion")
  const [submitting, setSubmitting] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [showCommentEmoji, setShowCommentEmoji] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1)
  const [loadingMore, setLoadingMore] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  // Search & filter
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "")

  // Edit states
  const [editingPost, setEditingPost] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState("")
  const [editContent, setEditContent] = useState("")
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [editCommentText, setEditCommentText] = useState("")

  const hasAnyModal = confirmOpen || showNew || !!activePost || !!editingPost
  useBodyScrollLock(hasAnyModal)

  // Fetch posts with filters
  const fetchPosts = useCallback(async (page: number, reset: boolean, category?: string, search?: string) => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "20")
    if (category) params.set("category", category)
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/forum/posts?${params}`)
      if (res.ok) {
        const data = await res.json()
        if (reset) {
          setPosts(data.posts)
        } else {
          setPosts(prev => [...prev, ...data.posts])
        }
        setCurrentPage(data.page)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      logger.forum.error("Failed to fetch posts", error)
    }
  }, [])

  // Apply filter changes
  useEffect(() => {
    fetchPosts(1, true, activeCategory, searchQuery)
  }, [fetchPosts, activeCategory, searchQuery])

  const openPost = useCallback(async (id: string) => {
    setLoadingPost(true)
    const res = await fetch(`/api/forum/posts/${id}`)
    if (res.ok) setActivePost(await res.json())
    setLoadingPost(false)
  }, [])

  async function loadMore() {
    if (loadingMore || currentPage >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams()
      params.set("page", String(nextPage))
      params.set("limit", "20")
      if (activeCategory) params.set("category", activeCategory)
      if (searchQuery) params.set("search", searchQuery)
      const res = await fetch(`/api/forum/posts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(prev => [...prev, ...data.posts])
        setCurrentPage(nextPage)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      logger.forum.error("Failed to load more posts", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // URL param auto-open
  useEffect(() => {
    const postId = searchParams.get("post")
    if (postId && !activePost) openPost(postId)
  }, [searchParams, activePost, openPost])

  async function likePost(id: string) {
    // Optimistic: +1 立即生效，失败时回滚
    const prev = posts.find(p => p.id === id)?.likeCount ?? 0
    setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: x.likeCount + 1 } : x))
    if (activePost?.id === id) setActivePost(p => p && { ...p, likeCount: p.likeCount + 1 })
    try {
      const res = await fetch(`/api/forum/posts/${id}/like`, { method: "POST" })
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: data.likeCount } : x))
      if (activePost?.id === id) setActivePost(p => p && { ...p, likeCount: data.likeCount })
    } catch {
      setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: prev } : x))
      if (activePost?.id === id) setActivePost(p => p && { ...p, likeCount: prev })
    }
  }

  async function toggleSolve(id: string) {
    const res  = await fetch(`/api/forum/posts/${id}/solve`, { method: "POST" })
    const data = await res.json()
    if (res.ok) {
      setPosts(p => p.map(x => x.id === id ? { ...x, isSolved: data.isSolved } : x))
      if (activePost?.id === id) setActivePost(p => p && { ...p, isSolved: data.isSolved })
    }
  }

  async function likeComment(id: string) {
    if (!isLoggedIn) return
    const res  = await fetch(`/api/forum/comments/${id}/like`, { method: "POST" })
    const data = await res.json()
    setActivePost(p => p && { ...p, comments: p.comments.map(c => c.id === id ? { ...c, likeCount: data.likeCount } : c) })
  }

  async function deletePost(id: string) {
    setConfirmMessage("确定要删除这个帖子吗？")
    setConfirmCallback(() => async () => {
      const res = await fetch(`/api/forum/posts/${id}`, { method: "DELETE" })
      if (res.ok) {
        setPosts(p => p.filter(x => x.id !== id))
        setActivePost(null)
      }
    })
    setConfirmOpen(true)
  }

  async function deleteComment(id: string) {
    setConfirmMessage("确定要删除这条评论吗？")
    setConfirmCallback(() => async () => {
      const res = await fetch(`/api/forum/comments/${id}`, { method: "DELETE" })
      if (res.ok) {
        setActivePost(p => p && { ...p, comments: p.comments.filter(c => c.id !== id) })
        setPosts(p => p.map(x => x.id === activePost?.id ? { ...x, commentCount: Math.max(0, x.commentCount - 1) } : x))
      }
    })
    setConfirmOpen(true)
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.append("title", newTitle.trim()); fd.append("content", newContent.trim())
    fd.append("category", newCategory)
    const res  = await fetch("/api/forum/posts", { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok) { setPosts(p => [data, ...p]); setShowNew(false); setNewTitle(""); setNewContent("") }
    setSubmitting(false)
  }

  // Edit post
  async function submitEditPost(id: string) {
    if (!editTitle.trim() || !editContent.trim()) return
    setEditSubmitting(true)
    try {
      const res = await fetch(`/api/forum/posts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitle.trim(), content: editContent.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setPosts(p => p.map(x => x.id === id ? { ...x, title: updated.title, content: updated.content, updatedAt: updated.updatedAt } : x))
        if (activePost?.id === id) setActivePost(p => p && { ...p, title: updated.title, content: updated.content, updatedAt: updated.updatedAt })
        setEditingPost(null)
      }
    } finally {
      setEditSubmitting(false)
    }
  }

  function startEditPost(post: Post) {
    setEditingPost(post.id)
    setEditTitle(post.title)
    setEditContent(post.content)
  }

  // Edit comment
  async function submitEditComment(commentId: string) {
    if (!editCommentText.trim()) return
    try {
      const res = await fetch(`/api/forum/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentText.trim() }),
      })
      if (res.ok) {
        const updated = await res.json()
        setActivePost(p => p && {
          ...p,
          comments: p.comments.map(c => c.id === commentId ? { ...c, content: updated.content, updatedAt: updated.updatedAt } : c),
        })
        setEditingComment(null)
      }
    } catch { /* ignore */ }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!commentText.trim() && !commentImageFile) return
    if (!activePost) return
    const fd = new FormData()
    fd.append("content", commentText.trim())
    if (commentImageFile) fd.append("image", commentImageFile)
    const res  = await fetch(`/api/forum/posts/${activePost.id}/comments`, { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok) { 
      setActivePost(p => p && { ...p, comments: [...p.comments, data] })
      setCommentText("")
      setCommentImagePreview(null)
      setCommentImageFile(null)
      setShowCommentEmoji(false)
    }
  }

  function handleCommentImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith("image/")) return
    if (file.size > 5 * 1024 * 1024) { setImageError("图片太大啦，最多 5MB 哦"); setTimeout(() => setImageError(null), 3000); return }
    setCommentImageFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setCommentImagePreview(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  function insertCommentEmoji(emoji: string) {
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
  }

  return (
    <div>
      {/* 页头 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">求档 · 论坛</h1>
          <p className="mt-1 text-sm text-muted-foreground">找不到资源？发帖求档，社区互助</p>
        </div>
        {isLoggedIn && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />发帖
          </button>
        )}
      </div>

      {/* 搜索 + 分类标签 */}
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="搜索帖子标题或内容…"
            className="w-full rounded-xl bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setActiveCategory("")}
            className={cn(
              "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
              !activeCategory ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
            )}
          >
            全部
          </button>
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
                activeCategory === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"
              )}
            >
              {cat.icon} {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {posts.map(post => (
          <Link key={post.id} href={`/forum/${post.id}`}
            className="block rounded-2xl bg-card p-5 ring-1 ring-border transition-all hover:ring-primary/30 hover:shadow-lg hover:shadow-primary/5">
            <div className="flex items-center gap-2.5">
              <Avatar user={post.user} size={7} />
              <span className="text-sm text-muted-foreground">{post.user.username}</span>
              <span className="text-xs text-muted-foreground/60">·</span>
              <span className="text-xs text-muted-foreground/60">{fmtDate(post.createdAt)}</span>
              {post.updatedAt !== post.createdAt && (
                <span className="text-[10px] text-muted-foreground/50">(已编辑)</span>
              )}
              <span className={cn(
                "ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium",
                post.category === "discussion" ? "bg-blue-500/10 text-blue-400" :
                post.category === "help" ? "bg-amber-500/10 text-amber-400" :
                post.category === "resource" ? "bg-emerald-500/10 text-emerald-400" :
                "bg-purple-500/10 text-purple-400"
              )}>{CATEGORY_LABEL[post.category] || post.category}</span>
            </div>
            <p className="mt-3 line-clamp-2 text-base font-semibold text-foreground leading-relaxed">{post.title}</p>
            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}</span>
              <span className="flex items-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />{post.commentCount}</span>
              {post.isPinned && <span className="text-amber-400">📌 置顶</span>}
              {post.isLocked && <span className="text-red-400">🔒 已锁定</span>}
            </div>
          </Link>
        ))}

        {/* 加载更多 */}
        {currentPage < totalPages && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="w-full rounded-xl bg-card/50 py-3 text-sm text-muted-foreground ring-1 ring-border transition-all hover:bg-secondary hover:text-foreground disabled:opacity-50"
          >
            {loadingMore ? "加载中..." : "加载更多帖子"}
          </button>
        )}
      </div>

      {/* 移动端全屏详情 */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button onClick={() => setActivePost(null)} aria-label="返回帖子列表" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{activePost.title}</span>
            {activePost.isSolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" strokeWidth={1.5} />}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <PostDetail post={activePost} isLoggedIn={isLoggedIn} currentUserId={currentUser?.id} isAdmin={isAdmin}
              commentText={commentText} setCommentText={setCommentText}
              commentImagePreview={commentImagePreview}
              showCommentEmoji={showCommentEmoji} setShowCommentEmoji={setShowCommentEmoji}
              commentInputRef={commentInputRef}
              onInsertEmoji={insertCommentEmoji}
              onLikePost={() => likePost(activePost.id)}
              onLikeComment={likeComment} onSubmitComment={submitComment}
              onToggleSolve={() => toggleSolve(activePost.id)}
              onDeletePost={() => deletePost(activePost.id)}
              onDeleteComment={deleteComment}
              onCommentImage={handleCommentImage}
              onRemoveCommentImage={() => { setCommentImageFile(null); setCommentImagePreview(null) }}
              onStartEditPost={() => startEditPost(activePost)}
              editingComment={editingComment}
              editCommentText={editCommentText}
              setEditCommentText={setEditCommentText}
              onStartEditComment={(id, text) => { setEditingComment(id); setEditCommentText(text) }}
              onCancelEditComment={() => setEditingComment(null)}
              onSubmitEditComment={submitEditComment}
            />
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认操作"
        description={confirmMessage}
        variant="destructive"
        confirmText="确认"
        onConfirm={() => {
          if (confirmCallback) confirmCallback()
        }}
      />

      {/* 图片错误提示 */}
      {imageError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {imageError}
        </div>
      )}

      {/* 发帖弹窗 */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">发布新帖</h2>
              <button onClick={() => setShowNew(false)} aria-label="关闭" className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
            <form onSubmit={submitPost} className="space-y-4">
              <div className="flex gap-2">
                {CATEGORIES.map(cat => (
                  <button key={cat.value} type="button"
                    onClick={() => setNewCategory(cat.value)}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-medium transition-all ring-1",
                      newCategory === cat.value ? "bg-primary text-primary-foreground ring-primary" : "bg-secondary text-muted-foreground ring-border"
                    )}
                  >{cat.icon} {cat.label}</button>
                ))}
              </div>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="标题（如：求《xxx》下载地址）" maxLength={100} required
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all" />

              <RichTextEditor
                content={newContent}
                onChange={setNewContent}
                placeholder="详细描述你的需求… 支持富文本格式和图片上传"
              />

              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                {submitting ? "发布中…" : "发 布"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 编辑帖子弹窗 */}
      {editingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-card p-6 ring-1 ring-border">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground">编辑帖子</h2>
              <button onClick={() => setEditingPost(null)} aria-label="关闭" className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </button>
            </div>
            <div className="space-y-4">
              <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                placeholder="标题" maxLength={100} required
                className="w-full rounded-xl bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all" />
              <RichTextEditor content={editContent} onChange={setEditContent} placeholder="内容" />
              <div className="flex gap-3">
                <button onClick={() => setEditingPost(null)}
                  className="flex-1 rounded-xl bg-secondary py-2.5 text-sm font-semibold text-muted-foreground ring-1 ring-border transition-all hover:text-foreground">
                  取消
                </button>
                <button onClick={() => submitEditPost(editingPost)} disabled={editSubmitting}
                  className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60">
                  {editSubmitting ? "保存中…" : "保存"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PostDetail({ post, isLoggedIn, currentUserId, isAdmin, commentText, setCommentText, commentImagePreview, showCommentEmoji, setShowCommentEmoji, commentInputRef, onInsertEmoji, onLikePost, onLikeComment, onSubmitComment, onToggleSolve, onDeletePost, onDeleteComment, onCommentImage, onRemoveCommentImage, onStartEditPost, editingComment, editCommentText, setEditCommentText, onStartEditComment, onCancelEditComment, onSubmitEditComment }: {
  post: Post & { comments: Comment[] }
  isLoggedIn: boolean
  currentUserId?: string
  isAdmin?: boolean
  commentText: string
  setCommentText: (v: string) => void
  commentImagePreview: string | null
  showCommentEmoji: boolean
  setShowCommentEmoji: (v: boolean) => void
  commentInputRef: React.RefObject<HTMLInputElement | null>
  onInsertEmoji: (emoji: string) => void
  onLikePost: () => void
  onLikeComment: (id: string) => void
  onSubmitComment: (e: React.FormEvent) => void
  onToggleSolve: () => void
  onDeletePost: () => void
  onDeleteComment: (id: string) => void
  onCommentImage: (e: React.ChangeEvent<HTMLInputElement>) => void
  onRemoveCommentImage: () => void
  onStartEditPost: () => void
  editingComment: string | null
  editCommentText: string
  setEditCommentText: (v: string) => void
  onStartEditComment: (id: string, text: string) => void
  onCancelEditComment: () => void
  onSubmitEditComment: (id: string) => void
}) {
  const isAuthor = currentUserId === post.user.id
  const commentFileRef = useRef<HTMLInputElement>(null)

  return (
    <div className="rounded-2xl bg-card ring-1 ring-border overflow-hidden">
      <div className="p-5">
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

        {post.imageUrl && <Image src={post.imageUrl} alt={post.title} width={480} height={320} className="mt-3 max-w-full rounded-xl object-cover" sizes="(max-width: 640px) 100vw, 480px" />}

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={onLikePost} disabled={!isLoggedIn}
            className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-primary disabled:opacity-40">
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}
          </button>
          {isAuthor && (
            <>
              <button onClick={onToggleSolve}
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
                <button onClick={onStartEditPost}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground">
                  <Edit3 className="h-3.5 w-3.5" strokeWidth={1.5} />编辑
                </button>
              )}
            </>
          )}
          {(isAuthor || isAdmin) && (
            <button onClick={onDeletePost}
              className="flex min-h-[44px] items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-500 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />删除
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-border p-5">
        <p className="mb-3 text-xs font-semibold text-muted-foreground">评论 {post.comments.length}</p>
        <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
          {post.comments.length === 0 && <p className="text-xs text-muted-foreground">还没有人回复，来说点什么吧~</p>}
          {post.comments.map(c => (
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
                    <input value={editCommentText} onChange={e => setEditCommentText(e.target.value)}
                      className="w-full rounded-lg bg-secondary px-3 py-1.5 text-xs text-foreground ring-1 ring-border outline-none focus:ring-primary/30" />
                    <div className="flex gap-2">
                      <button onClick={() => onSubmitEditComment(c.id)}
                        className="rounded-lg bg-primary px-2.5 py-1 text-[10px] font-medium text-primary-foreground hover:opacity-90">保存</button>
                      <button onClick={onCancelEditComment}
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
                  <button onClick={() => onLikeComment(c.id)} disabled={!isLoggedIn}
                    className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40">
                    <Heart className="h-3 w-3" strokeWidth={1.5} />{c.likeCount > 0 && c.likeCount}
                  </button>
                  {currentUserId === c.user.id && editingComment !== c.id && (
                    <button onClick={() => onStartEditComment(c.id, c.content)}
                      className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      <Edit3 className="h-3 w-3" strokeWidth={1.5} />
                    </button>
                  )}
                  {(currentUserId === c.user.id || isAdmin) && (
                    <button onClick={() => onDeleteComment(c.id)}
                      className="flex min-h-[44px] items-center gap-1 px-2 py-2 text-xs text-muted-foreground transition-colors hover:text-red-400">
                      <Trash2 className="h-3 w-3" strokeWidth={1.5} />删除
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {isLoggedIn ? (
          <div>
            {/* 图片预览 */}
            {commentImagePreview && (
              <div className="mb-2 relative inline-block group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={commentImagePreview} alt="预览" className="h-16 w-16 rounded-lg object-cover ring-1 ring-border" />
                <button type="button" onClick={onRemoveCommentImage}
                  aria-label="移除图片"
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-foreground sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                  <X className="h-2.5 w-2.5" strokeWidth={2} aria-hidden="true" />
                </button>
              </div>
            )}
            <form onSubmit={onSubmitComment} className="flex gap-2 items-center">
              <div className="relative flex items-center gap-1">
                <button type="button" onClick={() => commentFileRef.current?.click()}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
                  aria-label="上传图片">
                  <ImageIcon className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={onCommentImage} />

                <div className="relative">
                  <button type="button" onClick={() => setShowCommentEmoji(!showCommentEmoji)}
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-lg transition-colors shrink-0",
                      showCommentEmoji
                        ? "bg-secondary text-primary"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    aria-label="表情"
                    aria-expanded={showCommentEmoji}>
                    <Smile className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                  </button>
                  {showCommentEmoji && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCommentEmoji(false)} />
                      <div className="absolute bottom-10 left-0 z-50 w-64 max-w-[calc(100vw-2rem)] rounded-xl bg-card p-3 ring-1 ring-border shadow-2xl">
                        <div className="grid grid-cols-10 gap-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => onInsertEmoji(emoji)}
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
              <input ref={commentInputRef} value={commentText} onChange={e => setCommentText(e.target.value)} placeholder="写下评论…"
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
  )
}