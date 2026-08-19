import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"

const RatingDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.RatingDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "评分数据 · 管理后台" }

export default async function AdminRatingsPage({
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

  const grouped = await prisma.gameRating.groupBy({
    by: ["gameId"],
    _avg: { score: true },
    _count: { score: true },
  })

  const games = await prisma.game.findMany({
    where: { id: { in: grouped.map((g) => g.gameId) } },
    select: { id: true, title: true, coverImage: true },
  })
  const titleMap = new Map(games.map((g) => [g.id, g]))

  let list = grouped
    .map((g) => ({
      gameId: g.gameId,
      title: titleMap.get(g.gameId)?.title ?? "已删除游戏",
      coverImage: titleMap.get(g.gameId)?.coverImage ?? null,
      avg: Number((g._avg.score ?? 0).toFixed(2)),
      count: g._count.score ?? 0,
    }))
    .sort((a, b) => b.count - a.count)

  if (q) {
    const kw = q.toLowerCase()
    list = list.filter((r) => r.title.toLowerCase().includes(kw))
  }

  const total = list.length
  const totalPages = Math.max(1, Math.ceil(total / limit))
  const pageList = list.slice(skip, skip + limit)

  return (
    <AdminPageContainer
      eyebrow="RATINGS"
      title="评分数据"
      description={
        <Badge variant="secondary" size="lg">{total} 款游戏有评分</Badge>
      }
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索游戏标题…" />}
    >
      {pageList.length === 0 ? (
        <EmptyState icon={Star} title="暂无评分数据" description="用户在前台评分后，这里会汇总展示" bordered />
      ) : (
        <div className="space-y-2">
          {pageList.map((r) => (
            <Card
              key={r.gameId}
              size="default" radius="xl"
              className="group flex-row items-center gap-4 hover:ring-primary/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {r.coverImage ? (
                  <Image src={r.coverImage} alt={r.title} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Star className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{r.title}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {r.avg} 分
                  </span>
                  <span>{r.count} 人评分</span>
                </div>
              </div>
              <RatingDeleteBtn gameId={r.gameId} title={r.title} />
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/ratings"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
