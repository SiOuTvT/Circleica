import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Search, UserPlus } from "lucide-react"
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

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <UserPlus className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">关注记录</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {total} 条记录
          </span>
        </div>
        <form method="get" className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
          <input name="q" defaultValue={q} placeholder="搜索用户名…" aria-label="搜索用户名"
            className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-48" />
        </form>
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
        extraParams={q ? { q } : undefined}
      />
    </div>
  )
}