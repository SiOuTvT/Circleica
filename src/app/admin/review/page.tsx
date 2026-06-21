import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { cache, cacheKey } from "@/lib/redis"
import { logger } from "@/lib/logger"
import { Pagination } from "@/components/ui/pagination"
import { CheckCircle, XCircle } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

const ReviewActions = dynamic(() => import("./review-actions").then(m => ({ default: m.ReviewActions })), {
  loading: () => <div className="h-9 w-24 animate-pulse rounded-lg bg-muted" />,
})

export const metadata = { title: "审核队列 · 管理后台" }

export default async function AdminReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  await requireAdmin()
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page || "1"))
  const limit = 20
  const skip = (page - 1) * limit
  const where = { isPublished: false }

  // 使用缓存减少频繁刷新带来的查询压力（1 分钟 TTL）
  const cacheKeyReview = cacheKey("admin:review", String(page), String(limit))
  let cachedData: { games: any[]; total: number } | null = null

  try {
    cachedData = await cache.get<typeof cachedData>(cacheKeyReview)
  } catch (e) {
    logger.db.error("[AdminReview] Cache get failed", e)
  }

  let games: any[]
  let total: number

  if (cachedData) {
    ({ games, total } = cachedData)
  } else {
    const [gamesResult, totalResult] = await Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, serialId: true, title: true, coverImage: true,
          status: true, isNsfw: true, createdAt: true, rejectReason: true,
          publisher: { select: { id: true, username: true } },
        },
      }),
      prisma.game.count({ where }),
    ])
    games = gamesResult
    total = totalResult

    // 写入缓存
    try {
      await cache.set(cacheKeyReview, { games, total }, 60)
    } catch (e) {
      logger.db.error("[AdminReview] Cache set failed", e)
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-foreground">审核队列</h1>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          {total} 个待审核
        </span>
      </div>

      {games.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16">
          <CheckCircle className="h-12 w-12 text-muted-foreground/40" />
          <p className="text-muted-foreground">没有待审核的游戏</p>
        </div>
      ) : (
        <div className="space-y-2">
          {games.map(game => (
            <div key={game.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
              <Link href={`/admin/games/${game.serialId}`} className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                {game.coverImage ? (
                  <Image src={game.coverImage} alt="" width={48} height={48} className="h-full w-full object-cover" unoptimized />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground text-lg">?</div>
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link href={`/admin/games/${game.serialId}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline">
                  {game.title}
                </Link>
                <p className="text-xs text-muted-foreground">
                  {game.publisher?.username ?? "未知"} · {new Date(game.createdAt).toLocaleDateString("zh-CN")}
                  {game.isNsfw && <span className="ml-1.5 text-rose-400">NSFW</span>}
                </p>
                {game.rejectReason && (
                  <p className="mt-1 text-xs text-amber-400">上次拒回原因：{game.rejectReason}</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <ReviewActions gameId={game.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      <Pagination currentPage={page} totalPages={totalPages} baseUrl="/admin/review" />
    </div>
  )
}