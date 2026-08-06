import Link from "next/link"
import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { cached, cacheKey } from "@/lib/redis"
import { BookOpen, Inbox, Layers, CopyCheck, ShieldAlert, CheckCircle2 } from "lucide-react"

export const metadata = { title: "副站 Galvelica 概览 · 管理后台" }

// 概览统计较重（含创作者重复的 GROUP BY 全表扫描），缓存 60s 避免每次导航打库。
// 计数类指标对 60s 延迟不敏感；管理后台操作后会自然在 TTL 内刷新。
async function loadGalvelicaOverview() {
  let workCount = 0
  let pendingInclusion = 0
  let pendingDrafts = 0
  let dupGroups = 0

  try {
    const [workCountRes, pendingInclusionRes, approved, creatorDupRows] = await Promise.all([
      prisma.work.count(),
      prisma.inclusionRequest.count({ where: { status: "PENDING" } }),
      prisma.inclusionRequest.findMany({
        where: { status: "APPROVED" },
        include: { work: { select: { gameId: true, game: { select: { isPublished: true } } } } },
      }),
      prisma.$queryRaw<Array<{ cnt: number }>>`
        SELECT COUNT(*)::int as cnt FROM (
          SELECT LOWER("name") FROM "Creator"
          WHERE source = 'galvelica'
          GROUP BY LOWER("name")
          HAVING COUNT(*) > 1
        ) t
      `,
    ])
    workCount = workCountRes
    pendingInclusion = pendingInclusionRes
    pendingDrafts = approved.filter((r) => r.work.gameId && !r.work.game?.isPublished).length
    dupGroups = creatorDupRows[0]?.cnt ?? 0
  } catch (e) {
    logger.db.error("[GalvelicaAdmin] 概览统计失败", e)
  }

  return { workCount, pendingInclusion, pendingDrafts, dupGroups }
}

export default async function GalvelicaAdminDashboard() {
  await requireSiteAdmin("galvelica")

  const { workCount, pendingInclusion, pendingDrafts, dupGroups } = await cached(
    cacheKey("admin:galvelica:overview"),
    loadGalvelicaOverview,
    60,
  )

  const entries = [
    {
      icon: Layers,
      title: "作品管理",
      desc: "浏览、检索 Galvelica 同人资料馆的全部作品，支持批量操作。",
      href: "/admin/galvelica/works",
      count: workCount,
      countLabel: "部作品",
    },
    {
      icon: Inbox,
      title: "收录审核",
      desc: "用户提交收录后系统已建好草稿，在此批量发布或删除。",
      href: "/admin/galvelica/inclusion",
      count: pendingDrafts,
      countLabel: "待发布草稿",
    },
    {
      icon: BookOpen,
      title: "收录申请（主站）",
      desc: "用户发起的「同人作品 → Circleica 游戏」收录申请待审。",
      href: "/admin/inclusion-requests",
      count: pendingInclusion,
      countLabel: "待处理",
    },
    {
      icon: CopyCheck,
      title: "重复检测",
      desc: "按名称 / 归一化标题发现副站内的重复创作者与作品，便于合并。",
      href: "/admin/galvelica/duplicates",
      count: dupGroups,
      countLabel: "重复组",
    },
    {
      icon: ShieldAlert,
      title: "数据治理",
      desc: "检测 source 误标（本属副站却标 circleica）的数据，可一键纠正。",
      href: "/admin/galvelica/governance",
      count: null,
      countLabel: "",
    },
  ]

  return (
    <AdminPageContainer
      eyebrow="GALVELICA"
      title="副站管理 · Galvelica"
      description="Galvelica 是同人向资料馆，与主站 Circleica 共享后台但数据独立隔离。以下入口仅操作 Galvelica 自身数据。"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              {count !== null && (
                <span className="text-sm font-medium text-muted-foreground">
                  {count} <span className="text-muted-foreground/70">{countLabel}</span>
                </span>
              )}
            </div>
            <div>
              <p className="text-base font-semibold text-foreground group-hover:text-primary">{title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
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
