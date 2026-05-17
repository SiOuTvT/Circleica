import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { ChevronLeft, MessageSquare } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const ForumDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.ForumDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "论坛管理 · 管理后台" }

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, title: true, content: true, likeCount: true, isSolved: true, createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.forumPost.count(),
  ])

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

      {posts.length === 0 ? (
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
                  <ForumDeleteBtn id={post.id} />
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
          <Link
            href={`/admin/forum?page=${Math.max(1, page - 1)}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="px-3 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Link
            href={`/admin/forum?page=${Math.min(totalPages, page + 1)}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}