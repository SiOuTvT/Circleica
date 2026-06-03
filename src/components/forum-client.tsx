"use client"

import { useBodyScrollLock } from "@/hooks/use-body-scroll-lock"
import { cn } from "@/lib/utils"
import { CheckCircle2, ChevronLeft, Heart, ImageIcon, MessageSquare, Plus, Send, Smile, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { RichTextContent } from "./rich-text-content-wrapper"
import { RichTextEditor } from "./rich-text-editor-wrapper"

interface User { id: string; username: string; avatar: string }
interface Comment { id: string; content: string; imageUrl: string; likeCount: number; createdAt: string; user: User }
interface Post { id: string; title: string; content: string; imageUrl: string; likeCount: number; commentCount: number; isSolved: boolean; createdAt: string; user: User; comments?: Comment[] }

const FILTER_TABS = [
  { key: "all" as const, label: "全部" },
  { key: "unsolved" as const, label: "未解决" },
  { key: "solved" as const, label: "已解决" },
]

// 表情列表
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
  const [posts, setPosts] = useState(initialPosts)
  const [filter, setFilter] = useState<"all" | "unsolved" | "solved">("all")
  const [activePost, setActivePost] = useState<(Post & { comments: Comment[] }) | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newContent, setNewContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [loadingPost, setLoadingPost] = useState(false)
  const [commentText, setCommentText] = useState("")
  const [commentImageFile, setCommentImageFile] = useState<File | null>(null)
  const [commentImagePreview, setCommentImagePreview] = useState<string | null>(null)
  const [showCommentEmoji, setShowCommentEmoji] = useState(false)
  const [confirmAction, setConfirmAction] = useState<{ message: string; onConfirm: () => void } | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1)
  const [loadingMore, setLoadingMore] = useState(false)
  const commentInputRef = useRef<HTMLInputElement>(null)

  const hasAnyModal = !!confirmAction || showNew || !!activePost
  useBodyScrollLock(hasAnyModal)

  const filteredPosts = useMemo(() => {
    if (filter === "all") return posts
    return posts.filter(p => filter === "solved" ? p.isSolved : !p.isSolved)
  }, [posts, filter])

  async function openPost(id: string) {
    setLoadingPost(true)
    const res = await fetch(`/api/forum/posts/${id}`)
    if (res.ok) setActivePost(await res.json())
    setLoadingPost(false)
  }

  async function loadMore() {
    if (loadingMore || currentPage >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const res = await fetch(`/api/forum/posts?page=${nextPage}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setPosts(prev => [...prev, ...data.posts])
        setCurrentPage(nextPage)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to load more posts:", error)
    } finally {
      setLoadingMore(false)
    }
  }

  // 从 URL 参数自动打开帖子（侧边栏跳转）
  const searchParams = useSearchParams()
  useEffect(() => {
    const postId = searchParams.get("post")
    if (postId && !activePost) {
      openPost(postId)
    }
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
    setConfirmAction({
      message: "确定要删除这个帖子吗？",
      onConfirm: async () => {
        const res = await fetch(`/api/forum/posts/${id}`, { method: "DELETE" })
        if (res.ok) {
          setPosts(p => p.filter(x => x.id !== id))
          setActivePost(null)
        }
      },
    })
  }

  async function deleteComment(id: string) {
    setConfirmAction({
      message: "确定要删除这条评论吗？",
      onConfirm: async () => {
        const res = await fetch(`/api/forum/comments/${id}`, { method: "DELETE" })
        if (res.ok) {
          setActivePost(p => p && { ...p, comments: p.comments.filter(c => c.id !== id) })
          setPosts(p => p.map(x => x.id === activePost?.id ? { ...x, commentCount: Math.max(0, x.commentCount - 1) } : x))
        }
      },
    })
  }

  async function submitPost(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim() || !newContent.trim()) return
    setSubmitting(true)
    const fd = new FormData()
    fd.append("title", newTitle.trim()); fd.append("content", newContent.trim())
    const res  = await fetch("/api/forum/posts", { method: "POST", body: fd })
    const data = await res.json()
    if (res.ok) { setPosts(p => [data, ...p]); setShowNew(false); setNewTitle(""); setNewContent("") }
    setSubmitting(false)
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
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-foreground">求档 · 论坛</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">找不到资源？发帖求档，社区互助</p>
        </div>
        {isLoggedIn && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90">
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />发帖
          </button>
        )}
      </div>

      {/* 筛选 tab — 统一凹槽 + 圆角活动方块 */}
      <div className="mb-4 inline-flex gap-1 rounded-xl bg-[--tab-trough] p-1"
        role="tablist"
        aria-label="帖子筛选">
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            role="tab"
            aria-selected={filter === tab.key}
            className="forum-tab-btn flex items-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-all duration-300 ease-out"
            data-active={filter === tab.key}
          >
            {tab.label}
            <span className="tab-count ml-1.5 text-[10px]">
              {tab.key === "all" ? posts.length : tab.key === "solved" ? posts.filter(p => p.isSolved).length : posts.filter(p => !p.isSolved).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
        {/* 左：帖子列表 */}
        <div className="space-y-2">
          {filteredPosts.length === 0 && (
            <p className="py-16 text-center text-sm text-muted-foreground">还没有人发过帖，来开个头吧~</p>
          )}
          {filteredPosts.map(post => (
            <button key={post.id}
              onClick={() => openPost(post.id)}
              className={cn(
                "w-full rounded-xl bg-card p-4 text-left ring-1 transition-all hover:bg-secondary",
                activePost?.id === post.id ? "ring-primary" : "ring-border hover:ring-border"
              )}>
              <div className="mb-2 flex items-center gap-2">
                <Avatar user={post.user} size={6} />
                <span className="text-xs text-muted-foreground">{post.user.username}</span>
                {post.isSolved && (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 text-emerald-500 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />已解决
                  </span>
                )}
                <span className="ml-auto text-[10px] text-muted-foreground">{fmtDate(post.createdAt)}</span>
              </div>
              <p className="line-clamp-2 text-sm font-medium text-foreground">{post.title}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" strokeWidth={1.5} />{post.likeCount}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" strokeWidth={1.5} />{post.commentCount}</span>
              </div>
            </button>
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

        {/* 右：帖子详情 */}
        <div className="hidden md:block">
          {loadingPost && (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-muted-foreground" />
            </div>
          )}
          {!loadingPost && !activePost && (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-card ring-1 ring-border">
              <p className="text-sm text-muted-foreground">点击左侧帖子查看详情</p>
            </div>
          )}
          {!loadingPost && activePost && (
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
              onRemoveCommentImage={() => { setCommentImageFile(null); setCommentImagePreview(null) }} />
          )}
        </div>
      </div>

      {/* 移动端全屏详情 */}
      {activePost && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden">
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <button onClick={() => setActivePost(null)} aria-label="返回帖子列表" className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
            </button>
            <span className="flex-1 text-sm font-medium text-foreground line-clamp-1">{activePost.title}</span>
            {activePost.isSolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 text-emerald-500" strokeWidth={1.5} />}
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
              onRemoveCommentImage={() => { setCommentImageFile(null); setCommentImagePreview(null) }} />
          </div>
        </div>
      )}

      {/* 确认弹窗 */}
      {confirmAction && (
        <div className="fixed inset-0 z-[60] touch-none flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5 ring-1 ring-border">
            <p className="mb-4 text-sm text-foreground">{confirmAction.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="rounded-lg px-4 py-2 text-sm text-muted-foreground hover:bg-secondary transition-colors">取消</button>
              <button onClick={() => { confirmAction.onConfirm(); setConfirmAction(null) }}
                className="rounded-lg bg-red-500/80 px-4 py-2 text-sm text-white hover:bg-red-500 transition-colors">确认</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  )
}

function PostDetail({ post, isLoggedIn, currentUserId, isAdmin, commentText, setCommentText, commentImagePreview, showCommentEmoji, setShowCommentEmoji, commentInputRef, onInsertEmoji, onLikePost, onLikeComment, onSubmitComment, onToggleSolve, onDeletePost, onDeleteComment, onCommentImage, onRemoveCommentImage }: {
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
            <p className="text-[10px] text-muted-foreground">{fmtDate(post.createdAt)}</p>
          </div>
          {post.isSolved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 text-emerald-500 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />已解决
            </span>
          )}
        </div>

        <h2 className="mb-3 text-base font-bold text-foreground">{post.title}</h2>
        
        <RichTextContent html={post.content} />
        
        {post.imageUrl && <Image src={post.imageUrl} alt={post.title} width={480} height={320} className="mt-3 rounded-xl object-cover" />}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={onLikePost} disabled={!isLoggedIn}
            className="flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-primary disabled:opacity-40">
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}
          </button>
          {isAuthor && (
            <button onClick={onToggleSolve}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-all",
                post.isSolved
                  ? "bg-emerald-500/10 text-emerald-400 text-emerald-500 ring-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-secondary text-muted-foreground ring-border hover:text-foreground"
              )}>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {post.isSolved ? "取消已解决" : "标记已解决"}
            </button>
          )}
          {(isAuthor || isAdmin) && (
            <button onClick={onDeletePost}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 text-red-500 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20">
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
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground break-words">{c.content}</p>
                {c.imageUrl && (
                  <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 block max-w-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl} alt="评论图片" className="rounded-lg object-cover ring-1 ring-border max-h-32 hover:ring-border transition-all" />
                  </a>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <button onClick={() => onLikeComment(c.id)} disabled={!isLoggedIn}
                    className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-primary disabled:opacity-40">
                    <Heart className="h-3 w-3" strokeWidth={1.5} />{c.likeCount > 0 && c.likeCount}
                  </button>
                  {(currentUserId === c.user.id || isAdmin) && (
                    <button onClick={() => onDeleteComment(c.id)}
                      className="flex items-center gap-1 px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:text-red-400">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground shrink-0"
                  aria-label="上传图片">
                  <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                </button>
                <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={onCommentImage} />
                
                <div className="relative">
                  <button type="button" onClick={() => setShowCommentEmoji(!showCommentEmoji)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
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
                className="flex-1 rounded-xl bg-secondary px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-primary/30 transition-all" />
              <button type="submit" disabled={!commentText.trim() && !commentImagePreview}
                aria-label="发送评论"
                className="flex items-center gap-1 rounded-xl bg-secondary px-3 py-2 text-xs text-muted-foreground ring-1 ring-border transition-all hover:text-foreground disabled:opacity-40">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
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