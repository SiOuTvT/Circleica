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

  // 封面露骨度分级：-1=未知（待审核）0=SFW 安全 1=SFW 温和（已并入 NSFW，不再使用） 2=NSFW 露骨
  // 同人馆不变式：商业系列（isCommercial）不进入审核流
  const where =
    filter === "explicit"
      ? { coverSexual: 2, isCommercial: false }
      : filter === "all"
        ? { isCommercial: false }
        : { coverSexual: { lt: 0 }, coverImage: { not: "" }, isCommercial: false } // 待审核：只审有封面的（无封面无法裁决）

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
      description="人工裁决作品封面的成人内容分级（SFW 安全 / NSFW 露骨）。分级决定该作品在「只显示 SFW / 只显示 NSFW」单显模式下的可见性：标为 NSFW 的作品在 SFW 模式下直接不显示（不再是封面占位）。VNDB 未评级且自动识别低置信的封面留在此待审。"
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
        标为「NSFW」后，该作品在「只显示 SFW」模式下将直接不显示；无封面作品统一以「标题首字 + 主题色」占位，不再有「封面已隐藏」逻辑。封面分级与内容是否 R18 无关（内容 R18 只影响排序）。
      </p>
    </AdminPageContainer>
  )
}
