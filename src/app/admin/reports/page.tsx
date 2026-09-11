import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminSectionHeading } from "@/components/admin/admin-section-heading"
import { Badge } from "@/components/ui/badge"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { Flag } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import Link from "next/link"

const ReportDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.ReportDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

const ReportResolveBtn = dynamic(() => import("./resolve-btn").then(m => ({ default: m.ReportResolveBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

const ReportSearchForm = dynamic(() => import("./search-form").then(m => ({ default: m.ReportSearchForm })), {
  loading: () => <div className="h-10 w-64 animate-pulse rounded-xl bg-muted" />,
})

export const metadata = { title: "举报管理" }

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() || ""
  const limit = 20
  const skip = (page - 1) * limit

  // 构建查询条件
  const where: Record<string, unknown> = {}
  if (q) {
    where.game = { title: { contains: q, mode: "insensitive" } }
  }

  // 优化：一次性获取举报列表和举报最多的游戏，避免重复查询
  const [reports, total, gameReportCounts] = await Promise.all([
    prisma.gameReport.findMany({
      orderBy: { createdAt: "desc" },
      where,
      skip, take: limit,
      select: {
        id: true, ip: true, reason: true, createdAt: true, gameId: true,
        game: { select: { id: true, serialId: true, title: true, coverImage: true, isPublished: true } },
      },
    }),
    prisma.gameReport.count({ where }),
    // 同时获取举报最多的游戏（用于概览）
    // 全量统计：这里的计数要喂给每行的确认弹窗，不能只取前 10，
    // 「举报最多的游戏」概览卡在渲染处自己 slice(0, 10)
    prisma.gameReport.groupBy({
      by: ["gameId"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  // 每部游戏当前的举报总数：直接取上面 groupBy 的结果，不额外查库
  const reportCountByGame = new Map(gameReportCounts.map((g) => [g.gameId, g._count.id]))

  // 从举报列表中 extract 游戏信息，避免重复查询
  const topReportedGames = gameReportCounts
  // 与概览卡的渲染范围一致：只补查前 10 部的游戏信息
  // （计数 Map 仍用完整的 gameReportCounts，否则排不进前 10 的游戏会退回单数文案）
  const topGameIds = topReportedGames.slice(0, 10).map(g => g.gameId)

  // 如果举报列表中的游戏不在概览中，补充查询
  const reportedGameIdsInList = reports.map(r => r.gameId)
  const missingGameIds = topGameIds.filter(id => !reportedGameIdsInList.includes(id))

  const topGames = missingGameIds.length > 0
    ? await prisma.game.findMany({
        where: { id: { in: topGameIds } },
        select: { id: true, serialId: true, title: true, coverImage: true, isPublished: true },
      })
    : reports.map(r => r.game) // 直接使用举报列表中的游戏信息

  return (
    <AdminPageContainer
      eyebrow="REPORTS"
      title="举报管理"
      description={
        <Badge variant="secondary" size="lg">{total} 条举报</Badge>
      }
      actions={<ReportSearchForm initialQ={q} />}
    >

      {/* 举报最多的游戏概览 */}
      {topGames.length > 0 && !q && (
        <Card size="default" radius="xl">
          <AdminSectionHeading>举报最多的游戏</AdminSectionHeading>
          <div className="flex flex-wrap gap-2">
            {topReportedGames.slice(0, 10).map((item) => {
              // 优先从举报列表中获取游戏信息，否则从补充查询中获取
              const game = reports.find(r => r.gameId === item.gameId)?.game || topGames.find(g => g.id === item.gameId)
              if (!game) return null
              return (
                <Link
                  key={item.gameId}
                  href={`/admin/games/${game.id}`}
                  className="flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-accent"
                >
                  <span className="truncate max-w-[150px]">{game.title}</span>
                  <span className="shrink-0">
                    <Badge variant="destructive" size="sm">
                      {item._count.id}
                    </Badge>
                  </span>
                </Link>
              )
            })}
          </div>
        </Card>
      )}

      {/* 举报列表 */}
      <AdminDataTable
        rows={reports}
        rowKey={(report) => report.id}
        emptyIcon={Flag}
        emptyTitle={q ? `没有找到与"${q}"相关的举报` : "暂无举报记录"}
        columns={[
          {
            key: "game",
            label: "游戏",
            render: (report) => (
              <span className="flex min-w-0 items-center gap-2">
                <Link
                  href={`/admin/games/${report.game.id}`}
                  className="truncate font-medium text-foreground hover:text-primary hover:underline"
                  title={report.game.title}
                >
                  {report.game.title}
                </Link>
                {!report.game.isPublished && <AdminStatusBadge tone="warning">未发布</AdminStatusBadge>}
              </span>
            ),
          },
          {
            key: "reportCount",
            label: "举报数",
            numeric: true,
            width: "96px",
            render: (report) => reportCountByGame.get(report.gameId) ?? 1,
          },
          {
            key: "ip",
            label: "IP",
            width: "140px",
            render: (report) => (
              <span className="block truncate font-mono text-xs text-muted-foreground" title={report.ip ?? ""}>
                {report.ip?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "reason",
            label: "原因",
            render: (report) => (
              <span className="block truncate text-xs text-destructive" title={report.reason?.trim() || ""}>
                {report.reason?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: "最近时间",
            width: "160px",
            render: (report) => (
              <span className="text-xs text-muted-foreground">{formatDateTime(report.createdAt)}</span>
            ),
          },
        ]}
        actions={(report) => (
          <span className="inline-flex items-center gap-1.5">
            <ReportResolveBtn gameId={report.game.id} reportCount={reportCountByGame.get(report.gameId) ?? 1} />
            <ReportDeleteBtn id={report.id} />
          </span>
        )}
        actionsWidth="132px"
      />

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/reports"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
