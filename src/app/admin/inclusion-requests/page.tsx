import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Inbox, Upload, Trash2 } from "lucide-react"
import Link from "next/link"
import { toShanghaiDate } from "@/lib/date"

/** 采纳模型 A 后台操作：发布草稿 / 删除草稿（删后作品重新变为未收录，可再次申请）。 */
async function handleDraft(formData: FormData) {
  "use server"
  await requireAdmin()
  const session = await auth()
  const adminId = (session as { user?: { id?: string } } | null)?.user?.id ?? null

  const workId = String(formData.get("workId") || "")
  const action = String(formData.get("action") || "")
  if (!workId) return

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { gameId: true } })
  if (!work?.gameId) return
  const gameId = work.gameId

  if (action === "publish") {
    await prisma.game.update({ where: { id: gameId }, data: { isPublished: true } })
    await prisma.inclusionRequest.updateMany({
      where: { workId, status: "APPROVED" },
      data: { decidedAt: new Date(), reviewedBy: adminId },
    })
  } else if (action === "delete") {
    await prisma.game.delete({ where: { id: gameId } }).catch(() => {})
    await prisma.work.update({ where: { id: workId }, data: { gameId: null } })
  }
  redirect("/admin/inclusion-requests")
}

export const dynamic = "force-dynamic"

export default async function InclusionRequestsAdmin() {
  await requireAdmin()

  const [drafts, history] = await Promise.all([
    prisma.inclusionRequest.findMany({
      where: { status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      include: {
        work: {
          select: {
            id: true,
            title: true,
            slug: true,
            coverImage: true,
            gameId: true,
            game: { select: { id: true, isPublished: true } },
          },
        },
      },
    }),
    prisma.inclusionRequest.findMany({
      where: { status: "REJECTED" },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: { work: { select: { id: true, title: true } } },
    }),
  ])

  // 仅列出仍挂着「未发布草稿」的申请；已发布的归入历史感
  const pendingDrafts = drafts.filter((r) => r.work.gameId && !r.work.game?.isPublished)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">收录申请 · 待发布草稿</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          用户提交收录申请后，系统已自动用融合字段建好未发布资源草稿。你在这里批量发布或删除即可——无需逐条调研。
        </p>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">待发布草稿（{pendingDrafts.length}）</h2>
        {pendingDrafts.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无待发布的草稿。</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {pendingDrafts.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {r.work.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.work.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link
                    href={r.work.gameId ? `/admin/games/${r.work.gameId}` : `/galvelica/works/${r.work.slug}`}
                    className="font-medium text-foreground hover:underline"
                  >
                    {r.work.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {toShanghaiDate(r.createdAt)}
                    {r.note && ` · 备注：${r.note}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={handleDraft}>
                    <input type="hidden" name="workId" value={r.work.id} />
                    <button
                      type="submit"
                      name="action"
                      value="publish"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/25"
                    >
                      <Upload className="h-4 w-4" /> 发布
                    </button>
                  </form>
                  <form action={handleDraft}>
                    <input type="hidden" name="workId" value={r.work.id} />
                    <button
                      type="submit"
                      name="action"
                      value="delete"
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
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">已删除草稿（历史）</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {history.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <Inbox className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{r.work.title}</span>
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    已删除草稿
                  </span>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.decidedAt ? toShanghaiDate(r.decidedAt) : ""}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
