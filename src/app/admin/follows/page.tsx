import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Repeat, UserPlus } from "lucide-react"
import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"

const FollowDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.FollowDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "关注记录 · 管理后台" }

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

      {follows.length === 0 ? (
        <EmptyState icon={UserPlus} title="暂无关注记录" bordered />
      ) : (
        <div className="space-y-2">
          {follows.map((follow) => (
            <Card
              key={follow.id}
              size="default" radius="xl"
              className="group flex-row items-center gap-4 hover:ring-primary/30"
            >
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-primary/80 ring-2 ring-background">
                {follow.follower.avatar
                  ? <Image src={follow.follower.avatar} alt="" width={40} height={40} className="h-full w-full object-cover" />
                  : <div className="flex h-full w-full items-center justify-center text-sm font-bold text-primary-foreground">{follow.follower.username.charAt(0).toUpperCase()}</div>
                }
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  <Link href={`/admin/users?q=${encodeURIComponent(follow.follower.username)}`} className="hover:underline">{follow.follower.username}</Link>
                  <span className="mx-2 text-muted-foreground">关注了</span>
                  <Link href={`/admin/users?q=${encodeURIComponent(follow.following.username)}`} className="hover:underline">{follow.following.username}</Link>
                  {reverseSet.has(`${follow.followerId}:${follow.followingId}`) && (
                    <Badge variant="secondary" size="sm" className="ml-2 align-middle">
                      <Repeat className="mr-0.5 h-3 w-3" />
                      互关
                    </Badge>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(follow.createdAt)}
                </p>
              </div>
              <FollowDeleteBtn id={follow.id} />
            </Card>
          ))}
        </div>
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