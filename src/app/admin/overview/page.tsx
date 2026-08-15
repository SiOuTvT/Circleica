import Link from "next/link"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"

import {
  Gamepad2, List, Tag, PenTool, Megaphone, Music, ClipboardCheck,
  Inbox, MessageSquare, Flag, CalendarCheck, Heart, UserPlus, CheckCircle2,
} from "lucide-react"

export const metadata = { title: "主站概览 · 管理后台" }

export default async function CircleicaAdminOverview() {
  await requireAdmin()

  let totalGames = 0
  let unpublishedGames = 0
  let totalTags = 0
  let totalCreators = 0
  let pendingInclusion = 0

  try {
    const [totalGamesRes, unpublishedRes, tagsRes, creatorsRes, inclusionRes] = await Promise.all([
      prisma.game.count(),
      prisma.game.count({ where: { isPublished: false } }),
      prisma.tag.count({ where: { source: "circleica" } }),
      prisma.creator.count({ where: { source: "circleica" } }),
      prisma.inclusionRequest.count({ where: { status: "PENDING" } }),
    ])
    totalGames = totalGamesRes
    unpublishedGames = unpublishedRes
    totalTags = tagsRes
    totalCreators = creatorsRes
    pendingInclusion = inclusionRes
  } catch (e) {
    logger.db.error("[CircleicaOverview] 统计失败", e)
  }

  const entries = [
    {
      icon: Gamepad2,
      title: "游戏管理",
      desc: "浏览、检索、编辑 Circleica 全部游戏，支持审核与发布。",
      href: "/admin/games",
      count: totalGames,
      countLabel: "部游戏",
    },
    {
      icon: ClipboardCheck,
      title: "待发布草稿",
      desc: "已创建但未发布的游戏，待审核后上线。",
      href: "/admin/games?filter=draft",
      count: unpublishedGames,
      countLabel: "份草稿",
    },
    {
      icon: Tag,
      title: "标签管理",
      desc: "游戏标签与分类维护（仅主站 source=circleica）。",
      href: "/admin/tags",
      count: totalTags,
      countLabel: "个标签",
    },
    {
      icon: PenTool,
      title: "创作者",
      desc: "游戏制作组 / 个人创作者维护（仅主站 source=circleica）。",
      href: "/admin/creators",
      count: totalCreators,
      countLabel: "位创作者",
    },
    {
      icon: Inbox,
      title: "收录申请",
      desc: "用户发起的「同人作品 → Circleica 游戏」收录申请待审。",
      href: "/admin/inclusion-requests",
      count: pendingInclusion,
      countLabel: "待处理",
    },
    {
      icon: List,
      title: "精选合集",
      desc: "运营精选的游戏合集与专题。",
      href: "/admin/collections",
      count: null,
      countLabel: "",
    },
    {
      icon: Megaphone,
      title: "公告",
      desc: "站点公告与活动发布。",
      href: "/admin/announcements",
      count: null,
      countLabel: "",
    },
    {
      icon: Music,
      title: "音乐",
      desc: "同人音乐与 OST 资源管理。",
      href: "/admin/music",
      count: null,
      countLabel: "",
    },
    {
      icon: MessageSquare,
      title: "论坛",
      desc: "社区论坛帖子与板块管理。",
      href: "/admin/forum",
      count: null,
      countLabel: "",
    },
    {
      icon: Flag,
      title: "举报",
      desc: "用户举报内容处理队列。",
      href: "/admin/reports",
      count: null,
      countLabel: "",
    },
    {
      icon: CalendarCheck,
      title: "签到记录",
      desc: "用户每日签到数据统计。",
      href: "/admin/checkins",
      count: null,
      countLabel: "",
    },
    {
      icon: Heart,
      title: "收藏数据",
      desc: "游戏收藏关系与热度分析。",
      href: "/admin/favorites",
      count: null,
      countLabel: "",
    },
    {
      icon: UserPlus,
      title: "关注关系",
      desc: "用户间关注关系管理。",
      href: "/admin/follows",
      count: null,
      countLabel: "",
    },
  ]

  return (
    <AdminPageContainer
      eyebrow="CIRCLEICA"
      title="主站管理 · Circleica"
      description="Circleica 是同人游戏资料主站。以下入口仅操作主站自身数据（与副站 Galvelica 数据隔离）。"
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
