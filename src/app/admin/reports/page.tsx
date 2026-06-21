import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
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
    <div className="space-y-6">
      {/* 标题 + 搜索 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">举报管理</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {total} 条举报
          </span>
        </div>
        <ReportSearchForm initialQ={q} />
      </div>

      {/* 举报最多的游戏概览 */}
      {topGames.length > 0 && !q && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">举报最多的游戏</h2>
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
                  <span className="shrink-0 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-400">
                    {item._count.id}
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* 举报列表 */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <Flag className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">{q ? `没有找到与"${q}"相关的举报` : "暂无举报记录"}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((report) => (
            <div
              key={report.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
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
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/games/${report.game.serialId}`}
                    className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {report.game.title}
                  </Link>
                  {!report.game.isPublished && (
                    <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                      未发布
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  举报IP: <span className="font-mono">{report.ip}</span> · {new Date(report.createdAt).toLocaleString("zh-CN")}
                  {report.reason && (
                    <> · <span className="text-destructive">{report.reason}</span></>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <ReportResolveBtn id={report.id} gameId={report.game.id} />
                <ReportDeleteBtn id={report.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/reports"
        extraParams={q ? { q } : undefined}
      />
    </div>
  )
}
