import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { toShanghaiDate } from "@/lib/date"
import { Inbox, Upload, Trash2 } from "lucide-react"
import { publishInclusionGalvelica, deleteInclusionGalvelica } from "./actions"

export const metadata = { title: "Galvelica 收录审核 · 管理后台" }
export const dynamic = "force-dynamic"

export default async function GalvelicaInclusionPage() {
  await requireSiteAdmin("galvelica")

  let pendingDrafts: Array<{
    id: string
    workId: string
    title: string
    slug: string
    coverImage: string | null
    note: string
    createdAt: Date
  }> = []
  let history: Array<{ id: string; title: string; decidedAt: Date | null }> = []

  try {
    const [drafts, rejected] = await Promise.all([
      prisma.inclusionRequest.findMany({
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        include: {
          work: { select: { id: true, title: true, slug: true, coverImage: true, gameId: true, game: { select: { id: true, isPublished: true } } } },
        },
      }),
      prisma.inclusionRequest.findMany({
        where: { status: "REJECTED" },
        orderBy: { decidedAt: "desc" },
        take: 20,
        include: { work: { select: { id: true, title: true } } },
      }),
    ])

    pendingDrafts = drafts
      .filter((r) => r.work.gameId && !r.work.game?.isPublished)
      .map((r) => ({
        id: r.id,
        workId: r.work.id,
        title: r.work.title,
        slug: r.work.slug,
        coverImage: r.work.coverImage,
        note: r.note,
        createdAt: r.createdAt,
      }))
    history = rejected.map((r) => ({ id: r.id, title: r.work.title, decidedAt: r.decidedAt }))
  } catch (e) {
    logger.db.error("[GalvelicaInclusion] 读取收录草稿失败", e)
  }

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · INCLUSION"
      title="收录审核"
      description="用户提交收录申请后，系统已自动用融合字段建好未发布草稿。在此批量发布或删除——仅操作 Galvelica 自身数据。"
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 ring-1 ring-violet-500/20">
          <Inbox className="h-3.5 w-3.5" strokeWidth={2} />
          Galvelica → Circleica
        </span>
      }
    >
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">待发布草稿（{pendingDrafts.length}）</h2>
        {pendingDrafts.length === 0 ? (
          <EmptyState icon={Inbox} title="暂无待发布的草稿" description="用户提交收录申请后，系统已自动建好未发布草稿，等待你批量发布。" />
        ) : (
          <div className="space-y-3">
            {pendingDrafts.map((r) => (
              <div key={r.id} className="flex flex-row flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {r.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <a href={`/galvelica/works/${r.slug}`} className="font-medium text-foreground hover:underline">
                    {r.title}
                  </a>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {toShanghaiDate(r.createdAt)}
                    {r.note && ` · 备注：${r.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={publishInclusionGalvelica}>
                    <input type="hidden" name="workId" value={r.workId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/25"
                    >
                      <Upload className="h-4 w-4" /> 发布
                    </button>
                  </form>
                  <form action={deleteInclusionGalvelica}>
                    <input type="hidden" name="workId" value={r.workId} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
                    >
                      <Trash2 className="h-4 w-4" /> 删草稿
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-3 text-sm font-semibold text-foreground">已删除草稿（历史）</h2>
          <div className="space-y-3">
            {history.map((r) => (
              <div key={r.id} className="flex flex-row items-center gap-4 rounded-xl border border-border bg-card p-4">
                <Inbox className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{r.title}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">已删除草稿</span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">{r.decidedAt ? toShanghaiDate(r.decidedAt) : ""}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </AdminPageContainer>
  )
}
