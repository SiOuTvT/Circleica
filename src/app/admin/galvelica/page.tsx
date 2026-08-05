import Link from "next/link"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { BookOpen, Inbox, Layers, CheckCircle2 } from "lucide-react"

export const metadata = { title: "副站 Galvelica 概览 · 管理后台" }

export default async function GalvelicaAdminDashboard() {
  await requireSiteAdmin("galvelica")

  let workCount = 0
  let pendingInclusion = 0
  try {
    ;[workCount, pendingInclusion] = await Promise.all([
      prisma.work.count(),
      prisma.inclusionRequest.count({ where: { status: "PENDING" } }),
    ])
  } catch (e) {
    logger.db.error("[GalvelicaAdmin] 概览统计失败", e)
  }

  const entries = [
    {
      icon: Layers,
      title: "作品管理",
      desc: "浏览、检索 Galvelica 同人资料馆的全部作品",
      href: "/admin/galvelica/works",
      count: workCount,
      countLabel: "部作品",
    },
    {
      icon: Inbox,
      title: "收录申请",
      desc: "用户发起的「同人作品 → Circleica 游戏」收录申请",
      href: "/admin/inclusion-requests",
      count: pendingInclusion,
      countLabel: "待处理",
    },
  ]

  return (
    <AdminPageContainer
      eyebrow="GALVELICA"
      title="副站管理 · Galvelica"
      description="Galvelica 是同人向资料馆，与主站 Circleica 共享后台但数据独立隔离。以下入口仅操作 Galvelica 自身数据。"
    >
      {entries.length === 0 ? (
        <EmptyState icon={BookOpen} title="暂无可管理内容" description="Galvelica 暂无待管理的数据" bordered />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {entries.map(({ icon: Icon, title, desc, href, count, countLabel }) => (
            <Link
              key={href}
              href={href}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-1"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  {count} <span className="text-muted-foreground/70">{countLabel}</span>
                </span>
              </div>
              <div>
                <p className="text-base font-semibold text-foreground group-hover:text-primary">{title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" strokeWidth={2} />
        <span>
          数据隔离说明：Galvelica 的作品 / 标签 / 创作者存储于独立的 <code className="rounded bg-background px-1">Work</code> 关系表，
          不写入主站 <code className="rounded bg-background px-1">Game</code> 体系；主站后台已加 <code className="rounded bg-background px-1">source</code> 来源标记，
          双方数据互不串台。
        </span>
      </div>
    </AdminPageContainer>
  )
}
