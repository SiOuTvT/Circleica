import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { GameStatus } from "@prisma/client"
import { Inbox, Check, X } from "lucide-react"
import Link from "next/link"
import { toShanghaiDate } from "@/lib/date"

const VALID_STATUS: GameStatus[] = ["FINISHED", "ONGOING", "HIATUS", "CANCELLED"]

/** 审核：通过→用 Work 融合字段预填未发布 Game 草稿并设 Work.gameId；驳回→REJECTED。 */
async function decideInclusion(formData: FormData) {
  "use server"
  await requireAdmin()
  const session = await auth()
  const adminId = (session as { user?: { id?: string } } | null)?.user?.id ?? null

  const id = String(formData.get("id") || "")
  const action = String(formData.get("action") || "")
  if (!id) return

  const req = await prisma.inclusionRequest.findUnique({
    where: { id },
    include: {
      work: {
        include: {
          sources: { select: { source: true, externalId: true } },
          tags: { select: { tagId: true } },
          creators: { select: { creatorId: true, role: true } },
        },
      },
    },
  })
  if (!req) return

  if (action === "approve") {
    if (req.work.gameId) {
      await prisma.inclusionRequest.update({
        where: { id },
        data: { status: "APPROVED", decidedAt: new Date(), reviewedBy: adminId },
      })
      redirect(`/admin/games/${req.work.gameId}`)
      return
    }

    const w = req.work
    const vndbSource = w.sources.find((s) => s.source === "VNDB")
    const status: GameStatus = VALID_STATUS.includes(w.status as GameStatus) ? (w.status as GameStatus) : "FINISHED"

    const game = await prisma.game.create({
      data: {
        title: w.title,
        originalWork: w.originalWork,
        englishName: w.englishName,
        description: w.description,
        coverImage: w.coverImage,
        releaseDate: w.releaseDate,
        status,
        gameDuration: w.duration,
        aliases: w.aliases,
        studioName: w.studioName,
        isNsfw: w.isNsfw,
        vndbId: vndbSource?.externalId ?? "",
        isPublished: false,
      },
    })

    const tagIds = w.tags.map((t) => t.tagId)
    if (tagIds.length) {
      await prisma.gameTag.createMany({
        data: tagIds.map((tagId) => ({ gameId: game.id, tagId })),
        skipDuplicates: true,
      })
    }
    const creators = w.creators.map((c) => ({ gameId: game.id, creatorId: c.creatorId, role: c.role }))
    if (creators.length) {
      await prisma.gameCreator.createMany({ data: creators, skipDuplicates: true })
    }

    await prisma.work.update({ where: { id: w.id }, data: { gameId: game.id } })
    await prisma.inclusionRequest.update({
      where: { id },
      data: { status: "APPROVED", decidedAt: new Date(), reviewedBy: adminId },
    })
    redirect(`/admin/games/${game.id}`)
    return
  }

  if (action === "reject") {
    await prisma.inclusionRequest.update({
      where: { id },
      data: { status: "REJECTED", decidedAt: new Date(), reviewedBy: adminId },
    })
  }
}

export const dynamic = "force-dynamic"

export default async function InclusionRequestsAdmin() {
  await requireAdmin()

  const [pending, decided] = await Promise.all([
    prisma.inclusionRequest.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      include: { work: { select: { id: true, title: true, slug: true, coverImage: true, gameId: true } } },
    }),
    prisma.inclusionRequest.findMany({
      where: { NOT: { status: "PENDING" } },
      orderBy: { decidedAt: "desc" },
      take: 20,
      include: { work: { select: { id: true, title: true } } },
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">收录申请审核</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Galvelica 资料馆中尚未被 Circleica 收录的作品，用户可提交「收录申请」。通过后将以融合字段预填一份未发布资源草稿，并自动关联。
        </p>
      </div>

      {/* 待审 */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-foreground">待审核（{pending.length}）</h2>
        {pending.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">暂无待审核的申请。</p>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {pending.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded bg-muted">
                  {r.work.coverImage && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.work.coverImage} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={r.work.gameId ? `/games/${r.work.id}` : `/galvelica/works/${r.work.slug}`} className="font-medium text-foreground hover:underline">
                    {r.work.title}
                  </Link>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {toShanghaiDate(r.createdAt)}
                    {r.note && ` · 备注：${r.note}`}
                    {r.work.gameId && <span className="ml-2 text-emerald-400">（已收录）</span>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <form action={decideInclusion}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      name="action"
                      value="approve"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/25"
                    >
                      <Check className="h-4 w-4" /> 通过
                    </button>
                  </form>
                  <form action={decideInclusion}>
                    <input type="hidden" name="id" value={r.id} />
                    <button
                      type="submit"
                      name="action"
                      value="reject"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
                    >
                      <X className="h-4 w-4" /> 驳回
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 已处理 */}
      {decided.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">最近处理</h2>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {decided.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-4">
                <Inbox className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-foreground">{r.work.title}</span>
                  <span
                    className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.status === "APPROVED" ? "bg-emerald-500/10 text-emerald-400" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {r.status === "APPROVED" ? "已通过" : "已驳回"}
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
