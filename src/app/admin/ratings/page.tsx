import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { AdminEmptyNext } from "@/components/admin/admin-empty-next"
import { Badge } from "@/components/ui/badge"
import { Star } from "lucide-react"
import dynamic from "next/dynamic"

const RatingDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.RatingDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "评分数据" }

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
      <AdminDataTable
        rows={pageList}
        rowKey={(r) => r.gameId}
        emptyIcon={Star}
        emptyTitle="暂无评分数据"
        emptyDescription="用户在前台评分后，这里会汇总展示"
        columns={[
          {
            key: "title",
            label: "游戏",
            render: (r) => (
              <span className="block truncate font-medium text-foreground" title={r.title}>
                {r.title}
              </span>
            ),
          },
          {
            key: "avg",
            label: "平均分",
            numeric: true,
            width: "140px",
            render: (r) => (
              <span className="inline-flex items-center justify-end gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {r.avg}
              </span>
            ),
          },
          {
            key: "count",
            label: "评分人数",
            numeric: true,
            width: "140px",
            render: (r) => `${r.count} 人`,
          },
        ]}
        actions={(r) => <RatingDeleteBtn gameId={r.gameId} title={r.title} />}
        actionsWidth="88px"
      />

      {pageList.length === 0 && (
        <AdminEmptyNext href="/admin/games" actionLabel="去游戏管理">
          这页汇总前台的游戏评分；用户在游戏页打星后，会在这里按人数排行。
        </AdminEmptyNext>
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
