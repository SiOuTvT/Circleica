import { requireAdmin } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { Inbox, Upload, Trash2 } from "lucide-react"
import Link from "next/link"

export const metadata = { title: "收录申请：待发布草稿" }
import { AdminPageContainer } from "@/components/admin-page-container"
import { AdminSectionHeading } from "@/components/admin/admin-section-heading"
import { AdminConfirmSubmitButton } from "@/components/admin/admin-confirm-submit-button"
import { AdminDataTable } from "@/components/admin/admin-data-table"
import { AdminEmptyNext } from "@/components/admin/admin-empty-next"
import { Card } from "@/components/ui/card"
import { toShanghaiDate } from "@/lib/date"
import { publishInclusionGalvelica, deleteInclusionGalvelica } from "@/app/admin/galvelica/inclusion/actions"

const RETURN_TO = "/admin/inclusion-requests"

export const dynamic = "force-dynamic"

export default async function InclusionRequestsAdmin({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  await requireAdmin()
  const { err } = await searchParams

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
    <AdminPageContainer
      eyebrow="INCLUSION REQUESTS"
      title="收录申请：待发布草稿"
      description="用户提交收录申请后，系统已自动用融合字段建好未发布资源草稿。你在这里批量发布或删除即可——无需逐条调研。"
      actions={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-600 ring-1 ring-violet-500/20">
          <Inbox className="h-3.5 w-3.5" strokeWidth={2} />
          Galvelica → Circleica
        </span>
      }
    >

      {err && (
        <p className="rounded-lg bg-red-500/10 px-3.5 py-2.5 text-sm text-red-500 ring-1 ring-red-500/20">{err}</p>
      )}

      <section>
        <AdminSectionHeading>待发布草稿（<span className="num-tab">{pendingDrafts.length}</span>）</AdminSectionHeading>
        <AdminDataTable
          rows={pendingDrafts}
          rowKey={(r) => r.id}
          emptyIcon={Inbox}
          emptyTitle="暂无待发布的草稿"
          emptyDescription="用户提交收录申请后，系统已自动建好未发布草稿，等待你批量发布。"
          columns={[
            {
              key: "work",
              label: "作品",
              render: (r) => (
                <span className="flex min-w-0 items-center gap-3">
                  <span className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-muted">
                    {r.work.coverImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.work.coverImage} alt={r.work.title} className="h-full w-full object-cover" />
                    )}
                  </span>
                  <Link
                    href={r.work.gameId ? `/admin/games/${r.work.gameId}` : `/galvelica/works/${r.work.slug}`}
                    className="truncate font-medium text-foreground hover:underline"
                    title={r.work.title}
                  >
                    {r.work.title?.trim() || "—"}
                  </Link>
                </span>
              ),
            },
            {
              key: "note",
              label: "备注",
              render: (r) => (
                <span className="block truncate text-xs text-muted-foreground" title={r.note ?? ""}>
                  {r.note?.trim() || "—"}
                </span>
              ),
            },
            {
              key: "createdAt",
              label: "提交时间",
              width: "160px",
              nowrap: true,
              render: (r) => <span className="text-xs text-muted-foreground">{toShanghaiDate(r.createdAt)}</span>,
            },
          ]}
          actions={(r) => (
            <span className="inline-flex items-center gap-2">
              <form action={publishInclusionGalvelica}>
                <input type="hidden" name="workId" value={r.work.id} />
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/25"
                >
                  <Upload className="h-4 w-4" /> 发布
                </button>
              </form>
              <AdminConfirmSubmitButton
                action={deleteInclusionGalvelica}
                formData={{ workId: r.work.id, returnTo: RETURN_TO }}
                label={<><Trash2 className="h-4 w-4" /> 删草稿</>}
                title="删除收录草稿"
                description="这会连带删掉为该作品建的游戏草稿（含已填写的封面与简介），作品会重新变为未收录、可以再次申请。"
                className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm font-medium text-muted-foreground ring-1 ring-border transition-colors hover:text-foreground"
              />
            </span>
          )}
          actionsWidth="200px"
        />
        {pendingDrafts.length === 0 && (
          <AdminEmptyNext href="/admin/galvelica/inclusion" actionLabel="去收录审核">
            这页接收副站收录申请自动生成的未发布草稿；有申请时会在这里一键发布或删除。
          </AdminEmptyNext>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <AdminSectionHeading>已删除草稿（历史）</AdminSectionHeading>
          {/* 只读段：无可执行动作，故不塞操作列 */}
          <AdminDataTable
            rows={history}
            rowKey={(r) => r.id}
            emptyIcon={Inbox}
            emptyTitle="暂无历史记录"
            columns={[
              {
                key: "work",
                label: "作品",
                render: (r) => (
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium text-foreground" title={r.work.title}>
                      {r.work.title?.trim() || "—"}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                      已删除草稿
                    </span>
                  </span>
                ),
              },
              {
                key: "note",
                label: "备注",
                render: (r) => (
                  <span className="block truncate text-xs text-muted-foreground" title={r.note ?? ""}>
                    {r.note?.trim() || "—"}
                  </span>
                ),
              },
              {
                key: "decidedAt",
                label: "提交时间",
                width: "160px",
                nowrap: true,
                render: (r) => (
                  <span className="text-xs text-muted-foreground">
                    {r.decidedAt ? toShanghaiDate(r.decidedAt) : "—"}
                  </span>
                ),
              },
            ]}
          />
        </section>
      )}
    </AdminPageContainer>
  )
}
