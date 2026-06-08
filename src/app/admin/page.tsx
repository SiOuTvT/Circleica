import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Download, Eye, Gamepad2, Tag, Users } from "lucide-react"
import Image from "next/image"
import dynamic from "next/dynamic"
import Link from "next/link"

const AdminChartsWrapper = dynamic(() => import("@/components/admin-charts-wrapper").then(m => ({ default: m.AdminChartsWrapper })), {
  loading: () => <div className="h-[180px] animate-pulse rounded-xl bg-muted" />,
})

function getLast14Days() {
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (13 - i))
    return d.toISOString().slice(0, 10)
  })
}

export default async function AdminDashboard() {
  await requireAdmin()

  const days = getLast14Days()
  const since = new Date(days[0])

  const RESOURCE_TAG_KEYS = ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"]

  const [totalGames, published, totalUsers, totalViews, totalDownloads,
    recentGames, topGames, recentUsers,
    newGames, newUsers, newComments,
    totalGameTags, resourceTagSettings] = await Promise.all([
    prisma.game.count(),
    prisma.game.count({ where: { isPublished: true } }),
    prisma.user.count(),
    prisma.game.aggregate({ _sum: { viewCount: true } }).then(r => r._sum.viewCount ?? 0),
    prisma.game.aggregate({ _sum: { downloadCount: true } }).then(r => r._sum.downloadCount ?? 0),
    prisma.game.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, isPublished: true, createdAt: true } }),
    prisma.game.findMany({ where: { isPublished: true }, orderBy: { viewCount: "desc" }, take: 5, select: { id: true, serialId: true, title: true, viewCount: true } }),
    prisma.user.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, username: true, avatar: true, createdAt: true } }),
    prisma.game.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.tag.count(),
    prisma.siteSetting.findMany({ where: { key: { in: RESOURCE_TAG_KEYS } }, select: { value: true } }),
  ])

  const totalResourceTags = resourceTagSettings.reduce((sum, s) => {
    try { return sum + (JSON.parse(s.value) as unknown[]).length } catch { return sum }
  }, 0)

  const today = new Date().toISOString().slice(0, 10)
  const todayNewUsers = newUsers.filter(u => u.createdAt.toISOString().slice(0, 10) === today).length

  function toChartData(items: { createdAt: Date }[]) {
    const map = new Map(days.map(d => [d, 0]))
    for (const item of items) {
      const key = item.createdAt.toISOString().slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return days.map(d => ({ date: d.slice(5), value: map.get(d) ?? 0 }))
  }

  function fmtNum(n: number): string {
    if (n >= 10000) return (n / 10000).toFixed(1) + "w"
    if (n >= 1000) return (n / 1000).toFixed(1) + "k"
    return String(n)
  }

  const stats = [
    { icon: Gamepad2, label: "游戏总数", value: totalGames, sub: `${published} 已发布 · ${totalGames - published} 待审核`, href: "/admin/games" },
    { icon: Users, label: "注册用户", value: totalUsers, sub: todayNewUsers > 0 ? `今日 +${todayNewUsers}` : "今日无新增", href: "/admin/users" },
    { icon: Tag, label: "游戏标签", value: totalGameTags, sub: `${totalResourceTags} 资源标签`, href: "/admin/tags" },
    { icon: Eye, label: "总浏览量", value: totalViews, sub: "所有游戏累计", href: undefined },
    { icon: Download, label: "总下载量", value: totalDownloads, sub: "所有游戏累计", href: undefined },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-foreground">仪表盘</h1>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map(({ icon: Icon, label, value, sub, href }) => {
          const baseCls = "rounded-xl bg-card p-5 ring-1 ring-border transition-all"
          const cls = href ? `${baseCls} hover:ring-primary/30 hover:shadow-md` : baseCls
          const inner = (
            <>
              <Icon className="mb-3 h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-2xl font-bold text-foreground">{fmtNum(value)}</p>
              <p className="mt-1 text-xs font-medium text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground/70">{sub}</p>
            </>
          )
          return href ? (
            <Link key={label} href={href} className={cls}>{inner}</Link>
          ) : (
            <div key={label} className={cls}>{inner}</div>
          )
        })}
      </div>

      {/* 趋势图表 */}
      <div className="rounded-xl bg-card p-5 ring-1 ring-border">
        <p className="mb-3 text-sm font-medium text-muted-foreground">最近 14 天趋势</p>
        <div className="h-auto">
          <AdminChartsWrapper
            gamesByDay={toChartData(newGames)}
            usersByDay={toChartData(newUsers)}
            commentsByDay={toChartData(newComments)}
          />
        </div>
      </div>

      {/* 底部三列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 最近添加 */}
        <div className="rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-3 text-sm font-semibold text-foreground">最近添加</h2>
          <div className="divide-y divide-border">
            {recentGames.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无游戏</p>
            ) : recentGames.map(g => (
              <div key={g.id} className="flex items-center justify-between py-2.5">
                <Link href={`/admin/games/${g.id}`} className="truncate text-sm text-muted-foreground hover:text-foreground transition-colors">{g.title}</Link>
                <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${g.isPublished ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20" : "bg-muted text-muted-foreground ring-1 ring-border"}`}>
                  {g.isPublished ? "已发布" : "草稿"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 浏览最多 */}
        <div className="rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-3 text-sm font-semibold text-foreground">浏览最多</h2>
          <div className="divide-y divide-border">
            {topGames.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无数据</p>
            ) : topGames.map((g, i) => (
              <div key={g.id} className="flex items-center gap-3 py-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{i + 1}</span>
                <Link href={`/games/${g.serialId}`} className="flex-1 truncate text-sm text-muted-foreground hover:text-foreground transition-colors">{g.title}</Link>
                <span className="shrink-0 text-sm tabular-nums font-medium text-muted-foreground">{fmtNum(g.viewCount)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 最近注册 */}
        <div className="rounded-xl bg-card p-5 ring-1 ring-border">
          <h2 className="mb-3 text-sm font-semibold text-foreground">最近注册</h2>
          <div className="divide-y divide-border">
            {recentUsers.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">暂无用户</p>
            ) : recentUsers.map(u => (
              <div key={u.id} className="flex items-center gap-3 py-2.5">
                <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-primary/80 ring-2 ring-background">
                  {u.avatar
                    ? <Image src={u.avatar} alt="" width={28} height={28} className="h-full w-full object-cover" unoptimized />
                    : <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-white">{(u.username?.[0] ?? "?").toUpperCase()}</div>}
                </div>
                <Link href={`/user/${u.id}`} className="flex-1 truncate text-sm text-muted-foreground hover:text-foreground transition-colors">{u.username}</Link>
                <span className="shrink-0 text-xs text-muted-foreground/70">{u.createdAt.toISOString().slice(0, 10)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
