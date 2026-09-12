import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { AdminEmptyNext } from "@/components/admin/admin-empty-next"
import { Badge } from "@/components/ui/badge"
import { Repeat, UserPlus } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const FollowDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.FollowDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "关注记录" }

export default async function AdminFollowsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const where = q ? {
    OR: [
      { follower: { username: { contains: q, mode: "insensitive" as const } } },
      { following: { username: { contains: q, mode: "insensitive" as const } } },
    ],
  } : {}

  // 优化：使用并行查询替代 OR 查询，提升索引命中率
  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        follower: { select: { id: true, username: true, avatar: true } },
        following: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.follow.count({ where }),
  ])

  // 互关检测：若存在反向记录（following 也关注了 follower），标记为互关
  const reversePairs = follows.length
    ? await prisma.follow.findMany({
        where: {
          OR: follows.map((f) => ({
            followerId: f.followingId,
            followingId: f.followerId,
          })),
        },
        select: { followerId: true, followingId: true },
      })
    : []
  const reverseSet = new Set(reversePairs.map((r) => `${r.followerId}:${r.followingId}`))

  const totalPages = Math.ceil(total / limit)

  return (
    <AdminPageContainer
      eyebrow="FOLLOWS"
      title="关注记录"
      description={
        <Badge variant="secondary" size="lg">{total} 条记录</Badge>
      }
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索用户名…" />}
    >

      <AdminDataTable
        rows={follows}
        rowKey={(follow) => follow.id}
        emptyIcon={UserPlus}
        emptyTitle="暂无关注记录"
        columns={[
          {
            key: "follower",
            label: "关注者",
            width: "26%",
            render: (follow) => (
              <Link
                href={`/admin/users?q=${encodeURIComponent(follow.follower.username)}`}
                className="block truncate hover:underline"
                title={follow.follower.username}
              >
                {follow.follower.username}
              </Link>
            ),
          },
          {
            key: "following",
            label: "被关注者",
            width: "26%",
            render: (follow) => (
              <span className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/admin/users?q=${encodeURIComponent(follow.following.username)}`}
                  className="truncate hover:underline"
                  title={follow.following.username}
                >
                  {follow.following.username}
                </Link>
                {reverseSet.has(`${follow.followerId}:${follow.followingId}`) && (
                  <Badge variant="secondary" size="sm">
                    <Repeat className="mr-0.5 h-3 w-3" />
                    互关
                  </Badge>
                )}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: "时间",
            width: "180px",
            render: (follow) => (
              <span className="text-xs text-muted-foreground">{formatDateTime(follow.createdAt)}</span>
            ),
          },
        ]}
        actions={(follow) => <FollowDeleteBtn id={follow.id} />}
        actionsWidth="88px"
      />

      {follows.length === 0 && (
        <AdminEmptyNext href="/admin/users" actionLabel="去用户管理">
          这页展示用户之间的关注关系；有人在个人页关注他人后，这里会留下记录。
        </AdminEmptyNext>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/follows"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}