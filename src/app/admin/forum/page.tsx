import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { MessageSquare, Search } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const ForumDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.ForumDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "论坛管理 · 管理后台" }

export default async function AdminForumPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const status = sp.status?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const searchCondition = q ? {
    OR: [
      { title:   { contains: q, mode: "insensitive" as const } },
      { content: { contains: q, mode: "insensitive" as const } },
    ]
  } : {}

  const statusCondition = status === "solved"
    ? { isSolved: true }
    : status === "unsolved"
    ? { isSolved: false }
    : {}

  const where = {
    ...searchCondition,
    ...statusCondition,
  }

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, title: true, content: true, likeCount: true, isSolved: true, createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.forumPost.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessageSquare className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">论坛管理</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {total} 个帖子
          </span>
        </div>
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <input name="q" defaultValue={q} placeholder="搜索帖子…" aria-label="搜索帖子"
            className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-48" />
        </form>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1">
        {[
          { key: "", label: "全部" },
          { key: "unsolved", label: "未解决" },
          { key: "solved", label: "已解决" },
        ].map(({ key, label }) => {
          const href = `/admin/forum?${new URLSearchParams({
            ...(q && { q }),
            ...(key && { status: key }),
          }).toString()}`
          const isActive = status === key
          return (
            <Link
              key={key}
              href={href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {label}
            </Link>
          )
        })}
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
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/80 text-sm font-bold text-primary-foreground">
                {post.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {post.isSolved && (
                        <span className="mr-1 inline-flex items-center rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-500">
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
                  <span>发布者：{post.user.username}</span>
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

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/forum"
        extraParams={{
          ...(q && { q }),
          ...(status && { status }),
        }}
      />
    </div>
  )
}