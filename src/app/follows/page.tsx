import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { Breadcrumb } from "@/components/breadcrumb"
import { BreadcrumbSetter } from "@/components/breadcrumb-setter"
import { FollowsList } from "@/components/follows/follows-list"
import { Users } from "lucide-react"

export const dynamic = "force-dynamic"
export const metadata = { title: "我的关注" }

export default async function MyFollowsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")
  const userId = session.user.id

  let follows: Awaited<ReturnType<typeof loadFollows>>["items"] = []
  let total = 0
  try {
    const r = await loadFollows(userId)
    follows = r.items
    total = r.total
  } catch (e) {
    logger.db.error("[MyFollowsPage] 查询失败", e)
  }

  return (
    <div className="container mx-auto max-w-3xl px-3 sm:px-4 py-4 sm:py-6">
      <BreadcrumbSetter segment="follows" label="我的关注" />
      <Breadcrumb />
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">我的关注</h1>
      </div>
      <FollowsList
        initialItems={follows.map((f) => ({ id: f.id, user: f.following, createdAt: f.createdAt.toISOString() }))}
        initialTotal={total}
      />
    </div>
  )

  async function loadFollows(uid: string) {
    const [items, t] = await Promise.all([
      prisma.follow.findMany({
        where: { followerId: uid },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          following: {
            select: { id: true, serialId: true, username: true, avatar: true, bio: true },
          },
        },
      }),
      prisma.follow.count({ where: { followerId: uid } }),
    ])
    return { items, total: t }
  }
}
