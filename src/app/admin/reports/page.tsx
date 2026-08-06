import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminStatusBadge } from "@/components/admin/admin-status-badge"
import { AdminSectionHeading } from "@/components/admin/admin-section-heading"
import { Badge } from "@/components/ui/badge"
import { EmptyState } from "@/components/ui/empty-state"
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

export const metadata = { title: "举报管理 · 管理后台" }

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
    prisma.gameReport.groupBy({
      by: ["gameId"],
      where,
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 10, // 只取前 10 个用于概览显示
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  // 从举报列表中 extract 游戏信息，避免重复查询
  const topReportedGames = gameReportCounts
  const topGameIds = topReportedGames.map(g => g.gameId)

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
            {topReportedGames.map((item) => {
              // 优先从举报列表中获取游戏信息，否则从补充查询中获取
              const game = reports.find(r => r.gameId === item.gameId)?.game || topGames.find(g => g.id === item.gameId)
              if (!game) return null
              return (
                <Link
                  key={item.gameId}
                  href={`/admin/games/${game.serialId}`}
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
      {reports.length === 0 ? (
        <EmptyState
          icon={Flag}
          title={q ? `没有找到与"${q}"相关的举报` : "暂无举报记录"}
          bordered
        />
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <Card
              key={report.id}
              size="default" radius="xl"
              className="group flex-row items-start sm:items-center gap-3 sm:gap-4 hover:ring-primary/30"
            >
              <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {report.game.coverImage ? (
                  <Image src={report.game.coverImage} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Flag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/games/${report.game.serialId}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {report.game.title}
                  </Link>
                  {!report.game.isPublished && (
                    <AdminStatusBadge tone="warning">未发布</AdminStatusBadge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground break-all">
                  举报IP: <span className="font-mono">{report.ip}</span> · {formatDateTime(report.createdAt)}
                  {report.reason && (
                    <> · <span className="text-destructive break-words">{report.reason}</span></>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ReportResolveBtn id={report.id} gameId={report.game.id} />
                <ReportDeleteBtn id={report.id} />
              </div>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/reports"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
