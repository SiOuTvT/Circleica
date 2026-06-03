import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Flag } from "lucide-react"
import dynamic from "next/dynamic"

const ReportDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.ReportDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "举报管理 · 管理后台" }

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [reports, total] = await Promise.all([
    prisma.gameReport.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, ip: true, createdAt: true,
        game: { select: { id: true, title: true, coverImage: true } },
      },
    }),
    prisma.gameReport.count(),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Flag className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">举报管理</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 条举报
        </span>
      </div>

      {reports.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <Flag className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无举报记录</p>
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
                  <img src={report.game.coverImage} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Flag className="h-5 w-5" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {report.game.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  举报IP: {report.ip} · {new Date(report.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <ReportDeleteBtn id={report.id} />
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/reports"
      />
    </div>
  )
}