import { AdminCharts } from "@/components/admin-charts"
import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Eye, Gamepad2, Plus, Tag, Users } from "lucide-react"
import Link from "next/link"

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

  const [totalGames, published, totalTags, totalUsers, recentGames, topGames,
    newGames, newUsers, newComments] = await Promise.all([
    prisma.game.count(),
    prisma.game.count({ where: { isPublished: true } }),
    prisma.tag.count(),
    prisma.user.count(),
    prisma.game.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, title: true, isPublished: true, createdAt: true } }),
    prisma.game.findMany({ where: { isPublished: true }, orderBy: { viewCount: "desc" }, take: 5, select: { id: true, title: true, viewCount: true } }),
    prisma.game.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.comment.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ])

  function toChartData(items: { createdAt: Date }[]) {
    const map = new Map(days.map(d => [d, 0]))
    for (const item of items) {
      const key = item.createdAt.toISOString().slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1)
    }
    return days.map(d => ({ date: d.slice(5), value: map.get(d) ?? 0 }))
  }

  const stats = [
    { icon: Gamepad2, label: "游戏总数", value: totalGames, sub: `${published} 已发布`, href: "/admin/games" },
    { icon: Tag,      label: "标签数",   value: totalTags,  sub: "点击管理",           href: "/admin/tags" },
    { icon: Users,    label: "注册用户", value: totalUsers, sub: "累计注册",           href: "/admin/users" },
    { icon: Eye,      label: "未发布",   value: totalGames - published, sub: "待审核", href: "/admin/games" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-lg font-bold text-foreground">仪表盘</h1>
        <Link href="/admin/games/new" className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm font-medium text-foreground ring-1 ring-border transition-all hover:bg-accent hover:text-foreground w-fit">
          <Plus className="h-5 w-5" strokeWidth={2} />新增游戏
        </Link>
      </div>

      {/* 统计卡片 - 放大版 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map(({ icon: Icon, label, value, sub, href }) => (
          <Link key={label} href={href} className="rounded-2xl bg-card p-6 ring-1 ring-border transition-all hover:bg-accent/50 hover:ring-ring">
            <Icon className="mb-3 h-6 w-6 text-muted-foreground" strokeWidth={1.5} />
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          </Link>
        ))}
      </div>

      {/* 趋势图表（最近14天） */}
      <div>
        <p className="mb-3 text-xs font-medium text-muted-foreground">最近 14 天趋势</p>
        <AdminCharts
          gamesByDay={toChartData(newGames)}
          usersByDay={toChartData(newUsers)}
          commentsByDay={toChartData(newComments)}
        />
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* 最近添加 */}
        <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
          <h2 className="mb-4 text-base font-semibold text-foreground">最近添加</h2>
          <div className="space-y-3">
            {recentGames.map(g => (
              <div key={g.id} className="flex items-center justify-between">
                <Link href={`/admin/games/${g.id}`} className="truncate text-sm text-muted-foreground hover:text-foreground transition-colors">{g.title}</Link>
                <span className={`ml-2 shrink-0 rounded px-2 py-1 text-xs ${g.isPublished ? "bg-emerald-500/10 text-emerald-400" : "bg-secondary text-muted-foreground"}`}>
                  {g.isPublished ? "已发布" : "草稿"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 热门游戏 */}
        <div className="rounded-2xl bg-card p-6 ring-1 ring-border">
          <h2 className="mb-4 text-base font-semibold text-foreground">浏览最多</h2>
          <div className="space-y-3">
            {topGames.map((g, i) => (
              <div key={g.id} className="flex items-center gap-3">
                <span className="w-5 shrink-0 text-sm text-muted-foreground">{i + 1}</span>
                <Link href={`/games/${g.id}`} className="flex-1 truncate text-sm text-muted-foreground hover:text-foreground transition-colors">{g.title}</Link>
                <span className="shrink-0 text-sm text-muted-foreground">{g.viewCount} 次</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
