import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { Pagination } from "@/components/ui/pagination"
import { CalendarCheck, Search } from "lucide-react"
import dynamic from "next/dynamic"

const CheckinDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CheckinDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

const CheckInConfigEditor = dynamic(() => import("@/components/admin/checkin-config-editor").then(m => ({ default: m.CheckInConfigEditor })), {
  loading: () => <div className="h-40 rounded-xl bg-muted animate-pulse" />,
})

export const metadata = { title: "签到记录 · 管理后台" }

export default async function AdminCheckInsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; from?: string; to?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const q = sp.q?.trim() ?? ""
  const from = sp.from?.trim() ?? ""
  const to = sp.to?.trim() ?? ""
  const limit = 20
  const skip = (page - 1) * limit

  const searchCondition = q ? {
    user: {
      username: { contains: q, mode: "insensitive" as const },
    },
  } : {}

  const dateCondition: Record<string, unknown> = {}
  if (from || to) {
    dateCondition.createdAt = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to + "T23:59:59.999Z") } : {}),
    }
  }

  const where = {
    ...searchCondition,
    ...dateCondition,
  }

  // 使用缓存减少重复查询（5 分钟 TTL）
  const cacheKeyCheckins = cacheKey("admin:checkins", String(page), String(limit), q, from, to)
  let cachedData: { checkIns: any[]; total: number } | null = null

  try {
    cachedData = await cache.get<typeof cachedData>(cacheKeyCheckins)
  } catch (e) {
    logger.db.error("[AdminCheckins] Cache get failed", e)
  }

  let checkIns: any[]
  let total: number

  if (cachedData) {
    ({ checkIns, total } = cachedData)
  } else {
    const [checkInsResult, totalResult] = await Promise.all([
      prisma.checkIn.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true,
          date: true,
          createdAt: true,
          marks: true,
          user: { select: { id: true, username: true, avatar: true } },
        },
      }),
      prisma.checkIn.count({ where }),
    ])
    checkIns = checkInsResult
    total = totalResult

    // 写入缓存
    try {
      await cache.set(cacheKeyCheckins, { checkIns, total }, 300)
    } catch (e) {
      logger.db.error("[AdminCheckins] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="space-y-3 sm:space-y-0 sm:flex sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <CalendarCheck className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold text-foreground">签到记录</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {total} 条记录
          </span>
        </div>
        <form method="get" className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
            <input name="q" defaultValue={q} placeholder="搜索用户名…" aria-label="搜索用户名"
              className="rounded-xl bg-muted pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground ring-1 ring-border outline-none focus:ring-ring w-full sm:w-48" />
          </div>
          <input type="date" name="from" defaultValue={from} aria-label="开始日期"
            className="rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
          <span className="text-xs text-muted-foreground">至</span>
          <input type="date" name="to" defaultValue={to} aria-label="结束日期"
            className="rounded-xl bg-muted px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-ring" />
          <button type="submit"
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:opacity-90">
            筛选
          </button>
        </form>
      </div>

      {/* 签到配置编辑器 */}
      <CheckInConfigEditor />

      {checkIns.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <CalendarCheck className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">暂无签到记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {checkIns.map((ci) => (
            <div
              key={ci.id}
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-500 text-sm font-bold text-white">
                {ci.user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {ci.user.username}
                </p>
                <p className="text-xs text-muted-foreground">
                  签到日期：{new Date(ci.date).toLocaleDateString("zh-CN")} · 创建时间：{new Date(ci.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-500">
                  +{ci.marks} 印记
                </span>
              </div>
              <CheckinDeleteBtn id={ci.id} />
            </div>
          ))}
        </div>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        baseUrl="/admin/checkins"
        extraParams={{
          ...(q && { q }),
          ...(from && { from }),
          ...(to && { to }),
        }}
      />
    </div>
  )
}