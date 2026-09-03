"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { MessageSquare, Plus } from "lucide-react"
import { toast } from "sonner"
import { ConfirmDialog } from "../ui/confirm-dialog"
import { EmptyState } from "../ui/empty-state"
import { ForumFilters } from "./forum-filters"
import { ForumPostItem } from "./forum-post-item"
import { LoadMoreButton } from "./load-more-button"
import { NewPostModal } from "./new-post-modal"
import { PostDetailModal } from "./post-detail-modal"
import { EditPostModal } from "./edit-post-modal"
import type { Post, Comment, User } from "./forum-client-root"
import { logger } from "@/lib/logger"
import { apiFetchSafe, unwrapApiData } from "@/lib/api-client"

interface ForumListData {
  posts?: Post[]
  page?: number
  totalPages?: number
}

interface ForumPostDetailData {
  post?: Post
  comments?: Comment[]
}

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
  const searchParams = useSearchParams()

  // 帖子列表状态
  const [posts, setPosts] = useState(initialPosts)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(initialTotalPages || 1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const requestSeqRef = useRef(0)

  // 筛选状态
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [activeCategory, setActiveCategory] = useState(searchParams.get("category") || "")
  const [debouncedSearch, setDebouncedSearch] = useState(searchQuery)
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 点赞防重入锁（双击会触发两次 toggle 导致净取消）
  const likingPostIds = useRef<Set<string>>(new Set())
  const likingCommentIds = useRef<Set<string>>(new Set())

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
    const seq = ++requestSeqRef.current
    if (reset) setLoading(true)
    const params = new URLSearchParams()
    params.set("page", String(page))
    params.set("limit", "20")
    if (category) params.set("category", category)
    if (search) params.set("search", search)

    try {
      const { ok, data } = await apiFetchSafe<ForumListData>(`/api/forum/posts?${params}`)
      if (seq !== requestSeqRef.current) return
      if (ok) {
        const d = unwrapApiData<ForumListData>(data)
        if (reset) {
          setPosts(d?.posts ?? [])
        } else {
          setPosts(prev => [...prev, ...(d?.posts ?? [])])
        }
        setCurrentPage(d?.page ?? 1)
        setTotalPages(d?.totalPages ?? 1)
      }
    } catch (error) {
      logger.forum.error("Failed to fetch posts", error)
    } finally {
      if (seq === requestSeqRef.current) setLoading(false)
    }
  }, [])

  // 筛选变化时重新获取
  useEffect(() => {
    fetchPosts(1, true, activeCategory, debouncedSearch)
  }, [fetchPosts, activeCategory, debouncedSearch])

  // 加载更多
  const loadMore = useCallback(async () => {
    if (loadingMore || currentPage >= totalPages) return
    const seq = ++requestSeqRef.current
    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const params = new URLSearchParams()
      params.set("page", String(nextPage))
      params.set("limit", "20")
      if (activeCategory) params.set("category", activeCategory)
      if (debouncedSearch) params.set("search", debouncedSearch)
      const { ok, data } = await apiFetchSafe<ForumListData>(`/api/forum/posts?${params}`)
      if (seq !== requestSeqRef.current) return
      if (ok) {
        const d = unwrapApiData<ForumListData>(data)
        if (d?.posts && d?.posts.length > 0) {
          setPosts(prev => [...prev, ...(d?.posts ?? [])])
          setCurrentPage(nextPage)
          setTotalPages(d?.totalPages ?? 1)
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
    const { ok, data } = await apiFetchSafe<ForumPostDetailData>(`/api/forum/posts/${id}`)
    if (ok) { setActivePost(unwrapApiData<ForumPostDetailData>(data) as (Post & { comments: Comment[] }) | null) }
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
        setPosts(p => [data.data, ...p])
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
      const { ok } = await apiFetchSafe(`/api/forum/posts/${id}`, { method: "DELETE" })
      if (ok) {
        setPosts(p => p.filter(x => x.id !== id))
        setActivePost(null)
      }
    })
    setConfirmOpen(true)
  }, [])

  return (
    <div>
      {/* 页头（对齐 ArchiveHero 浏览页基因：左侧图标 + 英文眉标 + 标题/副标） */}
      <header className="mb-4 sm:mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <div className="flex h-12 w-fit shrink-0 items-center justify-center text-primary">
              <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={2} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="mb-1.5 text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Forum</p>
              <h1 className="font-heading text-xl font-bold leading-tight text-foreground sm:text-2xl">社区论坛</h1>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
                发帖求档、分享资源、聊攻略，社区互助
              </p>
            </div>
          </div>
          {isLoggedIn && (
            <button
              onClick={() => setShowNewPost(true)}
              data-ripple
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
            >
              <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />发帖
            </button>
          )}
        </div>
      </header>

      {/* 搜索 + 分类筛选 */}
      <ForumFilters
        searchQuery={searchQuery}
        activeCategory={activeCategory}
        onSearchChange={handleSearchChange}
        onCategoryChange={setActiveCategory}
      />

      {/* 帖子列表 */}
      <div className={"relative h-1 w-full overflow-hidden rounded-full" + (loading ? " bg-border/40" : " bg-transparent")} aria-hidden="true">
        {loading && <div className="absolute inset-y-0 left-0 w-1/3 animate-pulse rounded-full bg-primary/70" />}
      </div>
      <div className={"space-y-3 transition-opacity duration-150" + (loading ? " opacity-50" : "")}>
        {posts.length === 0 && !loadingMore && !loading && (
          <EmptyState
            icon={MessageSquare}
            title={debouncedSearch ? "没有找到相关帖子" : activeCategory ? "该分类下暂无帖子" : "暂无帖子，来发布第一篇吧"}
          />
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
          if (!isLoggedIn) { toast.error("请先登录后再点赞"); return }
          if (likingPostIds.current.has(id)) return
          likingPostIds.current.add(id)
          const prevPost = posts.find(p => p.id === id)
          const prevLiked = prevPost?.liked ?? false
          const prevCount = prevPost?.likeCount ?? 0
          // 乐观切换
          setPosts(p => p.map(x => x.id === id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x))
          setActivePost(p => p && { ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) })
          apiFetchSafe<{ liked?: boolean; likeCount?: number }>(`/api/forum/posts/${id}/like`, { method: "POST" })
            .then(({ ok, data }) => {
              if (ok) {
                const inner = unwrapApiData<{ liked?: boolean; likeCount?: number }>(data)
                if (inner?.liked !== undefined && inner?.likeCount !== undefined) {
                  setPosts(p => p.map(x => x.id === id ? { ...x, liked: inner.liked!, likeCount: inner.likeCount! } : x))
                  setActivePost(p => p && { ...p, liked: inner.liked!, likeCount: inner.likeCount! })
                  return
                }
              }
              // 失败回滚
              setPosts(p => p.map(x => x.id === id ? { ...x, liked: prevLiked, likeCount: prevCount } : x))
              setActivePost(p => p && { ...p, liked: prevLiked, likeCount: prevCount })
              if (!ok) toast.error("点赞失败，请稍后再试")
            })
            .catch(() => {
              setPosts(p => p.map(x => x.id === id ? { ...x, liked: prevLiked, likeCount: prevCount } : x))
              setActivePost(p => p && { ...p, liked: prevLiked, likeCount: prevCount })
              toast.error("网络错误，请稍后再试")
            })
            .finally(() => { likingPostIds.current.delete(id) })
        }}

        onStartEdit={setEditingPost}
        onDelete={handleDeletePost}
        setImageError={setImageError}
        commentInputRef={commentInputRef}
        onLikeComment={(id) => {
          if (!isLoggedIn) { toast.error("请先登录后再点赞"); return }
          if (likingCommentIds.current.has(id)) return
          likingCommentIds.current.add(id)
          const c = activePost?.comments.find(x => x.id === id)
          const prevLiked = c?.liked ?? false
          const prevCount = c?.likeCount ?? 0
          // 乐观切换
          setActivePost(p => p && { ...p, comments: p.comments.map(x => x.id === id ? { ...x, liked: !x.liked, likeCount: x.likeCount + (x.liked ? -1 : 1) } : x) })
          apiFetchSafe<{ liked?: boolean; likeCount?: number }>(`/api/forum/comments/${id}/like`, { method: "POST" })
            .then(({ ok, data }) => {
              const inner = unwrapApiData<{ liked?: boolean; likeCount?: number }>(data)
              if (ok && inner?.liked !== undefined && inner?.likeCount !== undefined) {
                setActivePost(p => p && { ...p, comments: p.comments.map(x => x.id === id ? { ...x, liked: inner.liked!, likeCount: inner.likeCount! } : x) })
                return
              }
              // 失败回滚
              setActivePost(p => p && { ...p, comments: p.comments.map(x => x.id === id ? { ...x, liked: prevLiked, likeCount: prevCount } : x) })
              if (!ok) toast.error("点赞失败，请稍后再试")
            })
            .catch(() => {
              setActivePost(p => p && { ...p, comments: p.comments.map(x => x.id === id ? { ...x, liked: prevLiked, likeCount: prevCount } : x) })
              toast.error("网络错误，请稍后再试")
            })
            .finally(() => { likingCommentIds.current.delete(id) })
        }}
        onDeleteComment={(id) => {
          const targetPostId = activePost?.id
          setConfirmMessage("确定要删除这条评论吗？")
          setConfirmCallback(() => async () => {
            try {
              const { ok } = await apiFetchSafe(`/api/forum/comments/${id}`, { method: "DELETE" })
              if (ok) {
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
          const { ok, data, error } = await apiFetchSafe<{ title?: string; content?: string; updatedAt?: string }>(`/api/forum/posts/${id}`, {
            method: "PUT",
            body: { title, content },
          })
          if (!ok) {
            throw new Error(error || "保存失败，请稍后再试")
          }
          const wrapped = unwrapApiData<{ title?: string; content?: string; updatedAt?: string }>(data)
          setPosts(p => p.map(x => x.id === id ? { ...x, title: wrapped?.title ?? x.title, content: wrapped?.content ?? x.content, updatedAt: wrapped?.updatedAt ?? x.updatedAt } : x))
          setActivePost(p => p && { ...p, title: wrapped?.title ?? p.title, content: wrapped?.content ?? p.content, updatedAt: wrapped?.updatedAt ?? p.updatedAt })
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
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[60] rounded-xl bg-red-500/90 px-4 py-2 text-sm text-white shadow-3 backdrop-blur-sm">
          {imageError}
        </div>
      )}
    </div>
  )
}