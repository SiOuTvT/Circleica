import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDate } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { MessageSquare } from "lucide-react"
import dynamic from "next/dynamic"

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
    <AdminPageContainer
      eyebrow="FORUM"
      title="论坛管理"
      description={
        <Badge variant="secondary" size="lg">{total} 个帖子</Badge>
      }
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索帖子…" />}
    >

      {/* Status filter tabs */}
      <div className="flex items-end gap-4">
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
            <a
              key={key}
              href={href}
              className={`inline-flex items-center px-1 pb-2.5 text-sm font-medium transition-all ${
                isActive
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground border-b-2 border-transparent"
              }`}
            >
              {label}
            </a>
          )
        })}
      </div>

      {posts.length === 0 ? (
        <EmptyState icon={MessageSquare} title="暂无论坛帖子" bordered />
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <Card
              key={post.id}
              size="default" radius="xl"
              className="group flex-row items-start gap-4 hover:ring-primary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/80 text-sm font-bold text-primary-foreground">
                {post.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {post.isSolved && (
                        <AdminStatusBadge tone="success">已解决</AdminStatusBadge>
                      )}
                      {post.title}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {post.content}
                    </p>
                  </div>
                  <ForumDeleteBtn id={post.id} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>发布者：{post.user.username}</span>
                  <span>·</span>
                  <span>{formatDate(post.createdAt)}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" /> {post._count.comments} 评论
                  </span>
                  <span>·</span>
                  <span>❤ {post.likeCount}</span>
                </div>
              </div>
            </Card>
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
    </AdminPageContainer>
  )
}