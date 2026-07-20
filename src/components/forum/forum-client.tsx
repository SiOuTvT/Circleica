"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { MessageSquare, Plus } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "../ui/confirm-dialog"
import { ForumFilters } from "./forum-filters"
import { ForumPostItem } from "./forum-post-item"
import { LoadMoreButton } from "./load-more-button"
import { NewPostModal } from "./new-post-modal"
import { PostDetailModal } from "./post-detail-modal"
import { EditPostModal } from "./edit-post-modal"
import type { Post, Comment, User } from "./forum-client-root"
import { logger } from "@/lib/logger"

export interface ForumClientProps {
  initialPosts: Post[]
  isLoggedIn: boolean
  currentUser?: User | null
  isAdmin?: boolean
  totalPages?: number
}

export function ForumClient({
  initialPosts,
  isLoggedIn,
  currentUser,
  isAdmin,
  totalPages: initialTotalPages,
}: ForumClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // 帖子列表状态
  const [posts, setPosts] = useState(initialPosts)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1)
  const [loadingMore, setLoadingMore] = useState(false)

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 搜索防抖 350ms
  const handleSearchChange = useCallback((q: string) => {
    setSearchQuery(q)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(q), 350)
  }, [])

  // 模态框状态
  const [showNewPost, setShowNewPost] = useState(false)
  const [activePost, setActivePost] = useState<(Post & { comments: Comment[] }) | null>(null)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirmMessage, setConfirmMessage] = useState("")
  const [confirmCallback, setConfirmCallback] = useState<(() => void) | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)

  const commentInputRef = useRef<HTMLInputElement>(null)

  // 获取帖子（带筛选）
  const fetchPosts = useCallback(async (page: number, reset: boolean, category?: string, search?: string) => {
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "20")
    if (category) params.set("category", category)
    if (search) params.set("search", search)

    try {
      const res = await fetch(`/api/forum/posts?${params}`)
      if (res.ok) {
        const j = await res.json()
        const d = j.data ?? j
        if (reset) {
          setPosts(d.posts ?? [])
        } else {
          setPosts(prev => [...prev, ...(d.posts ?? [])])
        }
        setCurrentPage(d.page ?? 1)
        setTotalPages(d.totalPages ?? 1)
      }
    } catch (error) {
      logger.forum.error("Failed to fetch posts", error)
    }
  }, [])

  // 筛选变化时重新获取
  useEffect(() => {
    fetchPosts(1, true, activeCategory, debouncedSearch)
  }, [fetchPosts, activeCategory, debouncedSearch])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loadingMore || currentPage >= totalPages) return
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams()
      params.set("page", String(nextPage))
      params.set("limit", "20")
      if (activeCategory) params.set("category", activeCategory)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const res = await fetch(`/api/forum/posts?${params}`)
      if (res.ok) {
        const j = await res.json()
        const d = j.data ?? j
        if (d.posts && d.posts.length > 0) {
          setPosts(prev => [...prev, ...d.posts])
          setCurrentPage(nextPage)
          setTotalPages(d.totalPages)
        } else {
          // 无更多数据，直接设置到最后一页
          setCurrentPage(totalPages)
        }
      }
    } catch (error) {
      logger.forum.error("Failed to load more posts", error)
    } finally {
      setLoadingMore(false)
    }
  }, [currentPage, totalPages, activeCategory, debouncedSearch, loadingMore])

  // 打开帖子详情
  const openPost = useCallback(async (id: string) => {
    const res = await fetch(`/api/forum/posts/${id}`)
    if (res.ok) { const j = await res.json(); setActivePost(j.data ?? j) }
  }, [])

  // URL 参数自动打开
  useEffect(() => {
    const postId = searchParams.get("post")
    if (postId && !activePost) openPost(postId)
  }, [searchParams, activePost, openPost])

  // 发帖处理
  const handleCreatePost = useCallback(async (title: string, content: string, category: string) => {
    const fd = new FormData()
    fd.append("title", title)
    fd.append("content", content)
    fd.append("category", category)
    try {
      const res = await fetch("/api/forum/posts", { method: "POST", body: fd })
      const data = await res.json()
      if (res.ok) {
        setPosts(p => [data, ...p])
        toast.success("发帖成功")
      } else {
        toast.error(data.error || "发帖失败，请稍后再试")
      }
    } catch (error) {
      logger.forum.error("Failed to create post", error)
      toast.error("网络错误，请稍后再试")
    }
  }, [])

  // 删除确认
  const handleDeletePost = useCallback((id: string) => {
    setConfirmMessage("确定要删除这个帖子吗？")
    setConfirmCallback(() => async () => {
      const res = await fetch(`/api/forum/posts/${id}`, { method: "DELETE" })
      if (res.ok) {
        setPosts(p => p.filter(x => x.id !== id))
        setActivePost(null)
      }
    })
    setConfirmOpen(true)
  }, [])

  return (
    <div>
      {/* 页头 */}
      <div className="mb-4 sm:mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">求档 · 论坛</h1>
          <p className="mt-1 text-sm text-muted-foreground">找不到资源？发帖求档，社区互助</p>
        </div>
        {isLoggedIn && (
          <button
            onClick={() => setShowNewPost(true)}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />发帖
          </button>
        )}
      </div>

      {/* 搜索 + 分类筛选 */}
      <ForumFilters
        searchQuery={searchQuery}
        activeCategory={activeCategory}
        onSearchChange={handleSearchChange}
        onCategoryChange={setActiveCategory}
      />

      {/* 帖子列表 */}
      <div className="space-y-3">
        {posts.length === 0 && !loadingMore && (
          <div className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">
              {activeCategory ? "该分类下暂无帖子" : "暂无帖子，来发布第一篇吧"}
            </p>
          </div>
        )}
        {posts.map(post => (
          <ForumPostItem key={post.id} post={post} />
        ))}

        {/* 加载更多 */}
        <LoadMoreButton
          currentPage={currentPage}
          totalPages={totalPages}
          loadingMore={loadingMore}
          onLoadMore={loadMore}
        />
      </div>

      {/* 模态框 */}
      <NewPostModal
        isOpen={showNewPost}
        onClose={() => setShowNewPost(false)}
        onSubmit={handleCreatePost}
      />

      <PostDetailModal
        post={activePost}
        onClose={() => setActivePost(null)}
        isLoggedIn={isLoggedIn}
        currentUserId={currentUser?.id}
        isAdmin={isAdmin}
        onLikePost={(id) => {
          const prev = posts.find(p => p.id === id)?.likeCount ?? 0
          setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: x.likeCount + 1 } : x))
          setActivePost(p => p && { ...p, likeCount: p.likeCount + 1 })
          fetch(`/api/forum/posts/${id}/like`, { method: "POST" })
            .then(r => r.json())
            .then(data => {
              setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: data.likeCount } : x))
              setActivePost(p => p && { ...p, likeCount: data.likeCount })
            })
            .catch(() => {
              setPosts(p => p.map(x => x.id === id ? { ...x, likeCount: prev } : x))
              setActivePost(p => p && { ...p, likeCount: prev })
            })
        }}
        onToggleSolve={async (id) => {
          try {
            const res = await fetch(`/api/forum/posts/${id}/solve`, { method: "POST" })
            const j = await res.json()
            const d = j.data ?? j
            if (res.ok) {
              setPosts(p => p.map(x => x.id === id ? { ...x, isSolved: d.isSolved } : x))
              setActivePost(p => p && { ...p, isSolved: d.isSolved })
            }
          } catch (err) { logger.forum.warn("[ForumClient] toggle solve failed", { error: err instanceof Error ? err.message : String(err) }) }
        }}
        onStartEdit={setEditingPost}
        onDelete={handleDeletePost}
        setImageError={setImageError}
        commentInputRef={commentInputRef}
        onLikeComment={(id) => {
          if (!isLoggedIn) return
          fetch(`/api/forum/comments/${id}/like`, { method: "POST" })
            .then(r => r.json())
            .then(data => {
              setActivePost(p => p && { ...p, comments: p.comments.map(c => c.id === id ? { ...c, likeCount: data.likeCount } : c) })
            })
            .catch(() => {})
        }}
        onDeleteComment={(id) => {
          const targetPostId = activePost?.id
          setConfirmMessage("确定要删除这条评论吗？")
          setConfirmCallback(() => async () => {
            try {
              const res = await fetch(`/api/forum/comments/${id}`, { method: "DELETE" })
              if (res.ok) {
                setActivePost(p => p && { ...p, comments: p.comments.filter(c => c.id !== id) })
                setPosts(p => p.map(x => x.id === targetPostId ? { ...x, commentCount: Math.max(0, x.commentCount - 1) } : x))
              }
            } catch (err) { logger.forum.warn("[ForumClient] delete comment failed", { error: err instanceof Error ? err.message : String(err) }) }
          })
          setConfirmOpen(true)
        }}
      />

      <EditPostModal
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSave={async (id, title, content) => {
          const res = await fetch(`/api/forum/posts/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, content }),
          })
          if (!res.ok) {
            const err = await res.json().catch(() => null)
            throw new Error(err?.error || "保存失败，请稍后再试")
          }
          const updated = await res.json()
          const wrapped = updated.data ?? updated
          setPosts(p => p.map(x => x.id === id ? { ...x, title: wrapped.title, content: wrapped.content, updatedAt: wrapped.updatedAt } : x))
          setActivePost(p => p && { ...p, title: wrapped.title, content: wrapped.content, updatedAt: wrapped.updatedAt })
          setEditingPost(null)
        }}
      />

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="确认操作"
        description={confirmMessage}
        variant="destructive"
        confirmText="确认"
        onConfirm={() => {
          if (confirmCallback) confirmCallback()
          setConfirmOpen(false)
        }}
      />

      {imageError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white shadow-lg backdrop-blur-sm">
          {imageError}
        </div>
      )}
    </div>
  )
}