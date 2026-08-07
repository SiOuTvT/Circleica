import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { ImageOff } from "lucide-react"
import { NsfwReviewClient, NsfwReviewFilter, type ReviewItem } from "./review-client"

export const metadata = { title: "副站封面 NSFW 审核 · 管理后台" }
export const dynamic = "force-dynamic"

const PAGE_SIZE = 18

export default async function GalvelicaNsfwReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string; page?: string }>
}) {
  await requireSiteAdmin("galvelica")
  const sp = await searchParams
  const filter = sp.filter === "all" || sp.filter === "explicit" ? sp.filter : "ungraded"
  const page = Math.max(1, Number(sp.page) || 1)

  // 封面露骨度分级：-1=未知（待审核）0=安全 1=暗示 2=露骨
  const where =
    filter === "explicit"
      ? { coverSexual: 2 }
      : filter === "all"
        ? {}
        : { coverSexual: { lt: 0 } }

  let items: ReviewItem[] = []
  let total = 0
  try {
    const [rows, count] = await Promise.all([
      prisma.work.findMany({
        where,
        select: {
          id: true,
          title: true,
          coverImage: true,
          coverSexual: true,
          ratingAvg: true,
          viewCount: true,
          slug: true,
          gameId: true,
          game: { select: { serialId: true } },
        },
        orderBy: [{ viewCount: "desc" }, { id: "asc" }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
      }),
      prisma.work.count({ where }),
    ])
    total = count
    items = rows.map((w) => ({
      id: w.id,
      title: w.title,
      coverImage: w.coverImage,
      coverSexual: w.coverSexual ?? -1,
      vndbRating: w.ratingAvg,
      viewCount: w.viewCount,
      workHref: w.game?.serialId ? `/galvelica/works/${w.game.serialId}` : `/galvelica/works/${w.slug}`,
    }))
  } catch (e) {
    logger.db.error("[NsfwReview] 查询失败", e)
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <AdminPageContainer
      galvelica
      eyebrow="GALVELICA · NSFW REVIEW"
      title="封面 NSFW 审核"
      description="人工裁决作品封面的成人内容分级（SFW 安全 / NSFW 露骨）。NSFW（封面含成人内容）在安全模式下不渲染 URL，防平台检测。VNDB 未评级且自动识别低置信的封面留在此待审。"
      actions={<NsfwReviewFilter filter={filter} />}
    >
      <NsfwReviewClient items={items} filter={filter} />

      <div className="mt-6 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          共 {total} 部 · 第 {page}/{totalPages} 页
        </p>
        <div className="flex items-center gap-2">
          {page > 1 && (
            <a href={`/admin/galvelica/nsfw-review?filter=${filter}&page=${page - 1}`} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-border hover:bg-muted">
              上一页
            </a>
          )}
          {page < totalPages && (
            <a href={`/admin/galvelica/nsfw-review?filter=${filter}&page=${page + 1}`} className="rounded-lg px-3 py-1.5 text-sm ring-1 ring-border hover:bg-muted">
              下一页
            </a>
          )}
        </div>
      </div>

      <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
        <ImageOff className="h-3.5 w-3.5" />
        标为「NSFW」后，安全模式下该封面将以占位显示（防平台检测）；「SFW 安全 / 温和」正常显示。封面分级与内容是否 R18 无关（内容 R18 只影响排序）。
      </p>
    </AdminPageContainer>
  )
}
