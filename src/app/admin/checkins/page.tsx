import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { CalendarCheck, ChevronLeft } from "lucide-react"
import dynamic from "next/dynamic"
import Link from "next/link"

const CheckinDeleteBtn = dynamic(() => import("./delete-btn").then(m => ({ default: m.CheckinDeleteBtn })), {
  loading: () => <div className="h-9 w-9 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "签到记录 · 管理后台" }

export default async function AdminCheckInsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [checkIns, total] = await Promise.all([
    prisma.checkIn.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      select: {
        id: true, date: true, createdAt: true,
        user: { select: { id: true, username: true, avatar: true } },
      },
    }),
    prisma.checkIn.count(),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <CalendarCheck className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold text-foreground">签到记录</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 条记录
        </span>
      </div>

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
                  签到日期: {ci.date} · 创建时间: {new Date(ci.createdAt).toLocaleString("zh-CN")}
                </p>
              </div>
              <CheckinDeleteBtn id={ci.id} />
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Link
            href={`/admin/checkins?page=${Math.max(1, page - 1)}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent ${page === 1 ? "pointer-events-none opacity-40" : ""}`}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          <span className="px-3 text-sm text-muted-foreground">{page} / {totalPages}</span>
          <Link
            href={`/admin/checkins?page=${Math.min(totalPages, page + 1)}`}
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors hover:bg-accent ${page === totalPages ? "pointer-events-none opacity-40" : ""}`}
          >
            <ChevronLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      )}
    </div>
  )
}