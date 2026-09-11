import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { formatDate, formatDateTime } from "@/lib/date"
import { Pagination } from "@/components/ui/pagination"
import { Button } from "@/components/ui/button"
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSectionHeading } from "@/components/admin/admin-section-heading"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { adminInput, adminSearchInput, adminBtnPrimary } from "@/lib/admin-styles"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { CalendarCheck, Search } from "lucide-react"
import dynamic from "next/dynamic"

const CheckinDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CheckinDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

const CheckInConfigEditor = dynamic(() => import("@/components/admin/checkin-config-editor").then(m => ({ default: m.CheckInConfigEditor })), {
  loading: () => <div className="h-40 rounded-xl bg-muted animate-pulse" />,
})

interface CheckInRow {
  id: string
  date: Date
  createdAt: Date
  marks: number
  user: { id: string; username: string; avatar: string | null }
}

export const metadata = { title: "签到记录" }

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
  let cachedData: { checkIns: CheckInRow[]; total: number } | null = null

  try {
    cachedData = await cache.get<typeof cachedData>(cacheKeyCheckins)
  } catch (e) {
    logger.db.error("[AdminCheckins] Cache get failed", e)
  }

  let checkIns: CheckInRow[]
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
    <AdminPageContainer
      eyebrow="CHECK-INS"
      title="签到记录"
      description={
        <Badge variant="secondary" size="lg">{total} 条记录</Badge>
      }
      actions={
        <form method="get" className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" strokeWidth={2} />
              <input name="q" defaultValue={q} placeholder="搜索用户名…" aria-label="搜索用户名" className={adminSearchInput} />
            </div>
            <input type="date" name="from" defaultValue={from} aria-label="开始日期"
              className={cn(adminInput, "w-44")} />
            <span className="text-xs text-muted-foreground">至</span>
            <input type="date" name="to" defaultValue={to} aria-label="结束日期"
              className={cn(adminInput, "w-44")} />
            <Button type="submit" className={cn(adminBtnPrimary, "h-10 min-h-[40px]")}>筛选</Button>
          </form>
        }
      >

      {/* 签到配置编辑器 — 分节 + 列宽约束（760px，与期 3 表单列宽一致），避免铺满整行压掉记录列表 */}
      <section className="max-w-[760px]">
        <AdminSectionHeading>签到规则</AdminSectionHeading>
        <CheckInConfigEditor />
      </section>

      <AdminSectionHeading>签到记录</AdminSectionHeading>
      <AdminDataTable
        rows={checkIns}
        rowKey={(ci) => ci.id}
        emptyIcon={CalendarCheck}
        emptyTitle="暂无签到记录"
        columns={[
          {
            key: "user",
            label: "用户",
            width: "24%",
            render: (ci) => (
              <span className="block truncate font-medium text-foreground" title={ci.user.username}>
                {ci.user.username}
              </span>
            ),
          },
          {
            key: "date",
            label: "签到日期",
            width: "160px",
            render: (ci) => <span className="text-xs text-muted-foreground">{formatDate(ci.date)}</span>,
          },
          {
            key: "marks",
            label: "获得印记",
            numeric: true,
            width: "120px",
            render: (ci) => `+${ci.marks}`,
          },
          {
            key: "createdAt",
            label: "创建时间",
            width: "180px",
            render: (ci) => <span className="text-xs text-muted-foreground">{formatDateTime(ci.createdAt)}</span>,
          },
        ]}
        actions={(ci) => <CheckinDeleteBtn id={ci.id} />}
        actionsWidth="88px"
      />

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
    </AdminPageContainer>
  )
}