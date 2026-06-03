import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { UserPlus } from "lucide-react"
import dynamic from "next/dynamic"

const FollowDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.FollowDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "关注记录 · 管理后台" }

export default async function AdminFollowsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [follows, total] = await Promise.all([
    prisma.follow.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        follower: { select: { id: true, username: true, avatar: true } },
        following: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.follow.count(),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <UserPlus className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">关注记录</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 条记录
        </span>
      </div>

      {follows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <UserPlus className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无关注记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {follows.map((follow) => (
            <div
              key={follow.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/80 text-sm font-bold text-primary-foreground">
                {follow.follower.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {follow.follower.username}
                  <span className="mx-2 text-muted-foreground">关注了</span>
                  {follow.following.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(follow.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <FollowDeleteBtn id={follow.id} />
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/follows"
      />
    </div>
  )
}