import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { EmptyState } from "@/components/ui/empty-state"
import { Badge } from "@/components/ui/badge"
import { Boxes, Download, Flag, Link2 } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { timeAgo } from "@/lib/time-ago"

const ResourceDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.GameResourceDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "游戏资源管理 · 管理后台" }

export default async function AdminGameResourcesPage({
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

  const where = q
    ? {
        OR: [
          { resourceName: { contains: q, mode: "insensitive" as const } },
          { game: { title: { contains: q, mode: "insensitive" as const } } },
        ],
      }
    : {}

  const [resources, total] = await Promise.all([
    prisma.gameResource.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        game: { select: { id: true, title: true, coverImage: true } },
        user: { select: { username: true } },
        entries: { select: { downloadCount: true } },
        _count: { select: { reports: true, downloadLogs: true } },
      },
    }),
    prisma.gameResource.count({ where }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  return (
    <AdminPageContainer
      eyebrow="GAME RESOURCES"
      title="游戏资源管理"
      description={
        <Badge variant="secondary" size="lg">{total} 条资源</Badge>
      }
      actions={<AdminSearch name="q" defaultValue={q} placeholder="搜索资源名或游戏标题…" />}
    >
      {resources.length === 0 ? (
        <EmptyState icon={Boxes} title="暂无用户提交的资源" description="前台用户在游戏页提交的资源会显示在这里" bordered />
      ) : (
        <div className="space-y-2">
          {resources.map((r) => {
            const downloadCount = r.entries.reduce((s, e) => s + e.downloadCount, 0)
            const platforms = Array.isArray(r.platform) ? (r.platform as string[]) : []
            const languages = Array.isArray(r.language) ? (r.language as string[]) : []
            return (
              <Card
                key={r.id}
                size="default" radius="xl"
                className="group flex-row items-center gap-4 hover:ring-primary/30"
              >
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                  {r.game.coverImage ? (
                    <Image src={r.game.coverImage} alt={r.game.title} width={48} height={48} className="h-full w-full object-cover" unoptimized />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Boxes className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{r.resourceName || "未命名资源"}</p>
                    {r.isReported && (
                      <Badge variant="destructive" size="sm" className="shrink-0">
                        <Flag className="mr-0.5 h-3 w-3" />
                        被举报
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    《{r.game.title}》 · 提交者 {r.user.username} · {timeAgo(r.createdAt)}
                  </p>
                  {(platforms.length > 0 || languages.length > 0) && (
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {platforms.map((p) => <Badge key={p} variant="secondary" size="sm">{p}</Badge>)}
                      {languages.map((l) => <Badge key={l} variant="secondary" size="sm">{l}</Badge>)}
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1" title="下载次数（累计点击）">
                    <Download className="h-3.5 w-3.5" />
                    {downloadCount}
                  </span>
                  <span className="inline-flex items-center gap-1" title="独立下载日志">
                    <Link2 className="h-3.5 w-3.5" />
                    {r._count.downloadLogs}
                  </span>
                  <span className="inline-flex items-center gap-1" title="举报数">
                    <Flag className="h-3.5 w-3.5" />
                    {r._count.reports}
                  </span>
                </div>
                <ResourceDeleteBtn id={r.id} name={r.resourceName || r.game.title} />
              </Card>
            )
          })}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/game-resources"
        extraParams={q ? { q } : undefined}
      />
    </AdminPageContainer>
  )
}
