import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Badge } from "@/components/ui/badge"
import { FileText } from "lucide-react"

export const metadata = { title: "审计日志 · 管理后台" }

const ACTION_LABELS: Record<string, string> = {
  approve_game: "通过审核",
  reject_game: "拒回游戏",
  delete_forum_post: "删除论坛帖",
  update_user: "修改用户",
}

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const action = sp.action || ""
  const limit = 30
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = {}
  if (action) where.action = action

  // 优化：并发查询日志列表和 distinct actions
  const [logs, total, distinctActions] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: { user: { select: { id: true, username: true, avatar: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      select: { action: true },
      distinct: ["action"],
      orderBy: { action: "asc" },
    }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileText className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">审计日志</h1>
        <Badge variant="secondary" size="lg">
          {total} 条记录
        </Badge>
      </div>

      {/* Filter tabs */}
      {distinctActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <a href="/admin/audit-logs"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${!action ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"}`}>
            全部
          </a>
          {distinctActions.map(({ action: a }) => (
            <a key={a} href={`/admin/audit-logs?action=${a}`}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium ring-1 transition-colors ${action === a ? "bg-primary text-primary-foreground ring-primary" : "bg-card text-muted-foreground ring-border hover:text-foreground"}`}>
              {ACTION_LABELS[a] ?? a}
            </a>
          ))}
        </div>
      )}

      {logs.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <FileText className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无日志记录</p>
        </div>
      ) : (
        <div className="space-y-1">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-4 rounded-xl border border-border bg-card px-4 py-3 hover:border-primary/20 transition-colors">
              <div className="h-8 w-8 shrink-0 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-muted-foreground">
                {log.user.username?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{log.user.username}</span>
                  <Badge variant="secondary" size="lg">
                    {ACTION_LABELS[log.action] ?? log.action}
                  </Badge>
                  {log.target && (
                    <span className="text-micro text-muted-foreground/50 font-mono truncate">{log.target.slice(0, 16)}</span>
                  )}
                </div>
                {log.detail && (
                  <p className="text-xs text-muted-foreground truncate">{log.detail}</p>
                )}
              </div>
              <span className="text-micro text-muted-foreground shrink-0 whitespace-nowrap">
                {formatDateTime(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/audit-logs" extraParams={action ? { action } : undefined} />
    </div>
  )
}
