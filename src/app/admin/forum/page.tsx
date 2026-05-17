"use client"

import { ChevronLeft, ChevronRight, MessageSquare, Trash2 } from "lucide-react"
import { useCallback, useEffect, useState } from "react"
import { toast } from "sonner"

interface ForumPost {
  id: string
  title: string
  content: string
  likeCount: number
  isSolved: boolean
  createdAt: string
  user: { id: string; username: string; avatar: string }
  _count: { comments: number }
}

export default function AdminForumPage() {
  const [posts, setPosts] = useState<ForumPost[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const limit = 20

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/admin/forum?page=${page}`)
    const data = await res.json()
    setPosts(data.posts || [])
    setTotal(data.total || 0)
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    const res = await fetch("/api/admin/forum", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    if (res.ok) { toast.success("已删除"); load() }
    else toast.error("删除失败")
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <MessageSquare className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">论坛管理</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 个帖子
        </span>
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <MessageSquare className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无论坛帖子</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div
              key={post.id}
              className="group flex items-start gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-purple-500 text-sm font-bold text-white">
                {post.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {post.isSolved && (
                        <span className="mr-1 inline-flex items-center rounded bg-green-500/10 px-1.5 py-0.5 text-[10px] font-bold text-green-500">
                          已解决
                        </span>
                      )}
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {post.content}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="shrink-0 rounded-lg p-2 text-muted-foreground opacity-0 transition-all hover:bg-red-500/10 hover:text-red-500 group-hover:opacity-100"
                    title="删除帖子"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span>by {post.user.username}</span>
                  <span>·</span>
                  <span>{new Date(post.createdAt).toLocaleDateString("zh-CN")}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {post._count.comments} 评论
                  </span>
                  <span>·</span>
                  <span>❤ {post.likeCount}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="px-3 text-sm text-muted-foreground">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}