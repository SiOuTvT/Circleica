"use client"

import { cn } from "@/lib/utils"
import { CheckCircle2, ChevronLeft, Heart, ImageIcon, MessageSquare, Plus, Send, Smile, Trash2, X } from "lucide-react"
import Image from "next/image"
import { useMemo, useRef, useState } from "react"
import { RichTextContent } from "./rich-text-content"
import { RichTextEditor } from "./rich-text-editor"

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
  return <div className={`${s} rounded-full bg-gradient-to-br from-blue-500 to-blue-500 flex items-center justify-center text-[10px] font-bold text-white shrink-0`}>{user.username[0].toUpperCase()}</div>
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

export function ForumClient({ initialPosts, isLoggedIn, currentUser, isAdmin }: {
  initialPosts: Post[]; isLoggedIn: boolean; currentUser?: User | null; isAdmin?: boolean
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
  const commentInputRef = useRef<HTMLInputElement>(null)

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

  async function likePost(id: string) {
    const res = await fetch(`/api/forum/posts/${id}/like`, { method: "POST" })
    const data = await res.json()
    setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: data.likeCount } : x))
    if (activePost?.id === id) setActivePost(p => p && { ...p, likeCount: data.likeCount })
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
    if (file.size > 5 * 1024 * 1024) { setImageError("图片大小不能超过 5MB"); setTimeout(() => setImageError(null), 3000); return }
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
          <h1 className="text-lg font-bold text-zinc-100 light:text-zinc-900">求档 · 论坛</h1>
          <p className="mt-0.5 text-xs text-zinc-500 light:text-zinc-400">找不到资源？发帖求档，社区互助</p>
        </div>
        {isLoggedIn && (
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 rounded-xl bg-zinc-800 light:bg-zinc-200 px-4 py-2 text-sm font-medium text-zinc-300 light:text-zinc-700 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:bg-zinc-700 light:hover:bg-zinc-300 hover:text-white light:hover:text-zinc-900">
            <Plus className="h-4 w-4" strokeWidth={1.5} />发帖
          </button>
        )}
      </div>

      {/* 筛选 tab — 统一凹槽 + 圆角活动方块 */}
      <div className="mb-4 inline-flex gap-1 rounded-xl p-1"
        style={{ backgroundColor: "var(--tab-trough)" }}>
        {FILTER_TABS.map(tab => (
          <button key={tab.key} onClick={() => setFilter(tab.key)}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-300 ease-out"
            style={{
              backgroundColor: filter === tab.key ? "var(--tab-active)" : "transparent",
              color: filter === tab.key ? "var(--tab-active-text)" : "var(--tab-inactive-text)",
              boxShadow: filter === tab.key ? "0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.08)" : "none",
              fontWeight: filter === tab.key ? 700 : 500,
            }}
            onMouseEnter={(e) => { if (filter !== tab.key) e.currentTarget.style.color = "var(--tab-hover-text)" }}
            onMouseLeave={(e) => { if (filter !== tab.key) e.currentTarget.style.color = "var(--tab-inactive-text)" }}
          >
            {tab.label}
            <span className="ml-1.5 text-[10px]"
              style={{ color: filter === tab.key ? "var(--tab-active-text)" : "var(--tab-inactive-text)", opacity: 0.6 }}>
              {tab.key === "all" ? posts.length : tab.key === "solved" ? posts.filter(p => p.isSolved).length : posts.filter(p => !p.isSolved).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1.4fr]">
        {/* 左：帖子列表 */}
        <div className="space-y-2">
          {filteredPosts.length === 0 && (
            <p className="py-16 text-center text-sm text-zinc-600 light:text-zinc-400">暂无帖子</p>
          )}
          {filteredPosts.map(post => (
            <button key={post.id} 
              onClick={() => openPost(post.id)}
              className={cn(
                "w-full rounded-xl bg-zinc-900 light:bg-white p-4 text-left ring-1 transition-all hover:bg-zinc-800 light:hover:bg-zinc-50",
                activePost?.id === post.id ? "ring-zinc-600 light:ring-zinc-300" : "ring-white/[0.06] light:ring-black/[0.06] hover:ring-white/10 light:hover:ring-black/10"
              )}>
              <div className="mb-2 flex items-center gap-2">
                <Avatar user={post.user} size={6} />
                <span className="text-xs text-zinc-500 light:text-zinc-400">{post.user.username}</span>
                {post.isSolved && (
                  <span className="flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-400 light:text-emerald-600 ring-1 ring-emerald-500/20">
                    <CheckCircle2 className="h-2.5 w-2.5" strokeWidth={2} />已解决
                  </span>
                )}
                <span className="ml-auto text-[10px] text-zinc-600 light:text-zinc-400">{fmtDate(post.createdAt)}</span>
              </div>
              <p className="line-clamp-2 text-sm font-medium text-zinc-200 light:text-zinc-800">{post.title}</p>
              <div className="mt-2 flex items-center gap-3 text-[11px] text-zinc-600 light:text-zinc-400">
                <span className="flex items-center gap-1"><Heart className="h-3 w-3" strokeWidth={1.5} />{post.likeCount}</span>
                <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" strokeWidth={1.5} />{post.commentCount}</span>
              </div>
            </button>
          ))}
        </div>

        {/* 右：帖子详情 */}
        <div className="hidden md:block">
          {loadingPost && (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06]">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-zinc-700 light:border-zinc-300 border-t-zinc-400 light:border-t-zinc-600" />
            </div>
          )}
          {!loadingPost && !activePost && (
            <div className="flex h-64 items-center justify-center rounded-2xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06]">
              <p className="text-sm text-zinc-600 light:text-zinc-400">点击左侧帖子查看详情</p>
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
        <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 light:bg-white md:hidden">
          <div className="flex items-center gap-3 border-b border-white/[0.06] light:border-black/[0.06] px-4 py-3">
            <button onClick={() => setActivePost(null)} className="text-zinc-400 hover:text-zinc-200 light:hover:text-zinc-800">
              <ChevronLeft className="h-5 w-5" strokeWidth={1.5} />
            </button>
            <span className="flex-1 text-sm font-medium text-zinc-200 light:text-zinc-800 line-clamp-1">{activePost.title}</span>
            {activePost.isSolved && <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400 light:text-emerald-600" strokeWidth={1.5} />}
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-zinc-900 light:bg-white p-5 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
            <p className="mb-4 text-sm text-zinc-300 light:text-zinc-700">{confirmAction.message}</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmAction(null)}
                className="rounded-lg px-4 py-2 text-sm text-zinc-400 light:text-zinc-600 hover:bg-zinc-800 light:hover:bg-zinc-100 transition-colors">取消</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 light:bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-zinc-900 light:bg-white p-6 ring-1 ring-white/[0.06] light:ring-black/[0.06]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-zinc-200 light:text-zinc-800">发布新帖</h2>
              <button onClick={() => setShowNew(false)} className="text-zinc-500 hover:text-zinc-300 light:hover:text-zinc-700 transition-colors">
                <X className="h-4 w-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={submitPost} className="space-y-4">
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)}
                placeholder="标题（如：求《xxx》下载地址）" maxLength={100} required
                className="w-full rounded-xl bg-zinc-800 light:bg-zinc-100 px-4 py-3 text-sm text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 ring-1 ring-white/[0.06] light:ring-black/[0.06] outline-none focus:ring-white/[0.12] light:focus:ring-black/[0.12] transition-all" />
              
              <RichTextEditor
                content={newContent}
                onChange={setNewContent}
                placeholder="详细描述你的需求… 支持富文本格式和图片上传"
              />
              
              <button type="submit" disabled={submitting}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-500 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60">
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
    <div className="rounded-2xl bg-zinc-900 light:bg-white ring-1 ring-white/[0.06] light:ring-black/[0.06] overflow-hidden">
      <div className="p-5">
        <div className="mb-3 flex items-center gap-2.5">
          <Avatar user={post.user} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 light:text-zinc-800">{post.user.username}</p>
            <p className="text-[10px] text-zinc-500 light:text-zinc-400">{fmtDate(post.createdAt)}</p>
          </div>
          {post.isSolved && (
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-400 light:text-emerald-600 ring-1 ring-emerald-500/20">
              <CheckCircle2 className="h-3 w-3" strokeWidth={2} />已解决
            </span>
          )}
        </div>

        <h2 className="mb-3 text-base font-bold text-zinc-100 light:text-zinc-900">{post.title}</h2>
        
        <RichTextContent html={post.content} />
        
        {post.imageUrl && <Image src={post.imageUrl} alt="" width={480} height={320} className="mt-3 rounded-xl object-cover" />}

        <div className="mt-4 flex items-center gap-2">
          <button onClick={onLikePost} disabled={!isLoggedIn}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-800 light:bg-zinc-100 px-3 py-1.5 text-xs text-zinc-400 light:text-zinc-500 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:text-blue-400 disabled:opacity-40">
            <Heart className="h-3.5 w-3.5" strokeWidth={1.5} />{post.likeCount}
          </button>
          {isAuthor && (
            <button onClick={onToggleSolve}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ring-1 transition-all",
                post.isSolved
                  ? "bg-emerald-500/10 text-emerald-400 light:text-emerald-600 ring-emerald-500/20 hover:bg-emerald-500/20"
                  : "bg-zinc-800 light:bg-zinc-100 text-zinc-400 light:text-zinc-500 ring-white/[0.06] light:ring-black/[0.06] hover:text-zinc-200 light:hover:text-zinc-800"
              )}>
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.5} />
              {post.isSolved ? "取消已解决" : "标记已解决"}
            </button>
          )}
          {(isAuthor || isAdmin) && (
            <button onClick={onDeletePost}
              className="flex items-center gap-1.5 rounded-lg bg-red-500/10 px-3 py-1.5 text-xs text-red-400 light:text-red-600 ring-1 ring-red-500/20 transition-all hover:bg-red-500/20">
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />删除
            </button>
          )}
        </div>
      </div>

      <div className="border-t border-white/[0.06] light:border-black/[0.06] p-5">
        <p className="mb-3 text-xs font-semibold text-zinc-400 light:text-zinc-500">评论 {post.comments.length}</p>
        <div className="mb-4 max-h-64 space-y-3 overflow-y-auto">
          {post.comments.length === 0 && <p className="text-xs text-zinc-600 light:text-zinc-400">还没有评论~</p>}
          {post.comments.map(c => (
            <div key={c.id} className="flex gap-2.5">
              <Avatar user={c.user} size={6} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-zinc-300 light:text-zinc-700">{c.user.username}</span>
                  <span className="text-[10px] text-zinc-600 light:text-zinc-400">{fmtDate(c.createdAt)}</span>
                </div>
                <p className="text-xs leading-relaxed text-zinc-400 light:text-zinc-500 break-words">{c.content}</p>
                {c.imageUrl && (
                  <a href={c.imageUrl} target="_blank" rel="noopener noreferrer" className="mt-1.5 block max-w-[200px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={c.imageUrl} alt="评论图片" className="rounded-lg object-cover ring-1 ring-white/[0.06] light:ring-black/[0.06] max-h-32 hover:ring-white/10 light:hover:ring-black/10 transition-all" />
                  </a>
                )}
                <div className="mt-1 flex items-center gap-2">
                  <button onClick={() => onLikeComment(c.id)} disabled={!isLoggedIn}
                    className="flex items-center gap-1 text-[10px] text-zinc-600 light:text-zinc-400 transition-colors hover:text-blue-400 disabled:opacity-40">
                    <Heart className="h-2.5 w-2.5" strokeWidth={1.5} />{c.likeCount > 0 && c.likeCount}
                  </button>
                  {(currentUserId === c.user.id || isAdmin) && (
                    <button onClick={() => onDeleteComment(c.id)}
                      className="flex items-center gap-1 text-[10px] text-zinc-600 light:text-zinc-400 transition-colors hover:text-red-400">
                      <Trash2 className="h-2.5 w-2.5" strokeWidth={1.5} />删除
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
                <img src={commentImagePreview} alt="预览" className="h-16 w-16 rounded-lg object-cover ring-1 ring-white/10 light:ring-black/10" />
                <button type="button" onClick={onRemoveCommentImage}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-zinc-700 light:bg-zinc-300 text-zinc-300 light:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 hover:text-white">
                  <X className="h-2.5 w-2.5" strokeWidth={2} />
                </button>
              </div>
            )}
            <form onSubmit={onSubmitComment} className="flex gap-2 items-center">
              <div className="relative flex items-center gap-1">
                <button type="button" onClick={() => commentFileRef.current?.click()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 light:text-zinc-400 transition-colors hover:bg-zinc-800 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-600 shrink-0"
                  title="上传图片">
                  <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                </button>
                <input ref={commentFileRef} type="file" accept="image/*" className="hidden" onChange={onCommentImage} />
                
                <div className="relative">
                  <button type="button" onClick={() => setShowCommentEmoji(!showCommentEmoji)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg transition-colors shrink-0",
                      showCommentEmoji 
                        ? "bg-zinc-800 light:bg-zinc-200 text-blue-400" 
                        : "text-zinc-500 light:text-zinc-400 hover:bg-zinc-800 light:hover:bg-zinc-200 hover:text-zinc-300 light:hover:text-zinc-600"
                    )}
                    title="表情">
                    <Smile className="h-3.5 w-3.5" strokeWidth={1.5} />
                  </button>
                  {showCommentEmoji && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowCommentEmoji(false)} />
                      <div className="absolute bottom-10 left-0 z-50 w-64 rounded-xl bg-zinc-900 light:bg-white p-3 ring-1 ring-white/10 light:ring-black/10 shadow-2xl">
                        <div className="grid grid-cols-10 gap-1">
                          {EMOJI_LIST.map((emoji) => (
                            <button key={emoji} type="button" onClick={() => onInsertEmoji(emoji)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-base hover:bg-zinc-800 light:hover:bg-zinc-100 transition-colors active:scale-90">
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
                className="flex-1 rounded-xl bg-zinc-800 light:bg-zinc-100 px-3 py-2 text-xs text-zinc-200 light:text-zinc-800 placeholder:text-zinc-600 light:placeholder:text-zinc-400 ring-1 ring-white/[0.06] light:ring-black/[0.06] outline-none focus:ring-white/[0.12] light:focus:ring-black/[0.12] transition-all" />
              <button type="submit" disabled={!commentText.trim() && !commentImagePreview}
                className="flex items-center gap-1 rounded-xl bg-zinc-800 light:bg-zinc-200 px-3 py-2 text-xs text-zinc-400 light:text-zinc-500 ring-1 ring-white/[0.06] light:ring-black/[0.06] transition-all hover:text-zinc-200 light:hover:text-zinc-800 disabled:opacity-40">
                <Send className="h-3.5 w-3.5" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        ) : (
          <p className="text-xs text-zinc-500 light:text-zinc-400"><a href="/login" className="text-blue-400 hover:text-blue-300">登录</a>后发表评论</p>
        )}
      </div>
    </div>
  )
}