import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Pagination } from "@/components/ui/pagination"
import { Card } from "@/components/ui/card"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSearch } from "@/components/admin/admin-search"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { AdminEmptyNext } from "@/components/admin/admin-empty-next"
import { Badge } from "@/components/ui/badge"
import { Boxes, Download, Flag, Link2 } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import { timeAgo } from "@/lib/time-ago"

const ResourceDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.GameResourceDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "游戏资源管理" }

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
      <AdminDataTable
        rows={resources}
        rowKey={(r) => r.id}
        emptyIcon={Boxes}
        emptyTitle="暂无用户提交的资源"
        emptyDescription="前台用户在游戏页提交的资源会显示在这里"
        columns={[
          {
            key: "game",
            label: "游戏",
            width: "20%",
            render: (r) => (
              <span className="block truncate font-medium text-foreground" title={r.game.title}>
                {r.game.title?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "resourceName",
            label: "资源名",
            render: (r) => (
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate" title={r.resourceName || ""}>
                  {r.resourceName?.trim() || "未命名资源"}
                </span>
                {r.isReported && (
                  <Badge variant="destructive" size="sm" className="shrink-0">
                    <Flag className="mr-0.5 h-3 w-3" />
                    被举报
                  </Badge>
                )}
              </span>
            ),
          },
          {
            key: "platform",
            label: "平台/语言",
            width: "160px",
            render: (r) => {
              const platforms = Array.isArray(r.platform) ? (r.platform as string[]) : []
              const languages = Array.isArray(r.language) ? (r.language as string[]) : []
              const text = [...platforms, ...languages].join("、")
              return (
                <span className="block truncate text-xs text-muted-foreground" title={text}>
                  {text?.trim() || "—"}
                </span>
              )
            },
          },
          {
            key: "user",
            label: "提交者",
            width: "130px",
            render: (r) => (
              <span className="block truncate text-xs text-muted-foreground" title={r.user.username ?? ""}>
                {r.user.username?.trim() || "—"}
              </span>
            ),
          },
          {
            key: "createdAt",
            label: "提交时间",
            width: "120px",
            nowrap: true,
            render: (r) => <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>,
          },
          {
            key: "downloadCount",
            label: "下载次数",
            numeric: true,
            width: "104px",
            render: (r) => r.entries.reduce((s, e) => s + e.downloadCount, 0),
          },
          {
            key: "reports",
            label: "举报数",
            numeric: true,
            width: "96px",
            render: (r) => r._count.reports,
          },
        ]}
        actions={(r) => <ResourceDeleteBtn id={r.id} name={r.resourceName || r.game.title} />}
        actionsWidth="120px"
      />

      {resources.length === 0 && (
        <AdminEmptyNext href="/admin/games" actionLabel="去游戏管理">
          这页汇总前台用户提交的下载资源；有人提交后，会连同下载量与举报数一起出现。
        </AdminEmptyNext>
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
