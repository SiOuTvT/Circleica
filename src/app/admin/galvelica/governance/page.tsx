import { requireSiteAdmin } from "@/lib/auth-context"
import { prisma } from "@/lib/prisma"
import { logger } from "@/lib/logger"
import { AdminPageContainer } from "@/components/admin-page-container"
import { EmptyState } from "@/components/ui/empty-state"
import { ShieldAlert, Users, Tag as TagIcon, CheckCircle2 } from "lucide-react"
import { fixSourceMismatch } from "./actions"

export const metadata = { title: "Galvelica 数据治理 · 管理后台" }
export const dynamic = "force-dynamic"

export default async function GalvelicaGovernancePage() {
  await requireSiteAdmin("galvelica")

  type Suspicious = { id: string; name: string; type: "creator" | "tag"; hasGameLink: boolean }

  let suspicious: Suspicious[] = []
  try {
    // Creator：source=circleica 但被 Work 引用
    const creators = await prisma.$queryRaw<Array<{ id: string; name: string; hasGameLink: boolean }>>`
      SELECT c."id", c."name",
        EXISTS(SELECT 1 FROM "GameCreator" gc WHERE gc."creatorId" = c."id") as "hasGameLink"
      FROM "Creator" c
      WHERE c.source = 'circleica'
        AND EXISTS(SELECT 1 FROM "WorkCreator" wc WHERE wc."creatorId" = c."id")
    `
    // Tag：source=circleica 但被 Work 引用
    const tags = await prisma.$queryRaw<Array<{ id: string; name: string; hasGameLink: boolean }>>`
      SELECT t."id", t."name",
        EXISTS(SELECT 1 FROM "GameTag" gt WHERE gt."tagId" = t."id") as "hasGameLink"
      FROM "Tag" t
      WHERE t.source = 'circleica'
        AND EXISTS(SELECT 1 FROM "WorkTag" wt WHERE wt."tagId" = t."id")
    `
    suspicious = [
      ...creators.map((c) => ({ id: c.id, name: c.name, type: "creator" as const, hasGameLink: c.hasGameLink })),
      ...tags.map((t) => ({ id: t.id, name: t.name, type: "tag" as const, hasGameLink: t.hasGameLink })),
    ]
  } catch (e) {
    logger.db.error("[GalvelicaGovernance] 检测失败", e)
  }

  const fixable = suspicious.filter((s) => !s.hasGameLink)

  return (
    <AdminPageContainer
      eyebrow="GALVELICA · GOVERNANCE"
      title="数据治理"
      description="检测「本属副站、却被误标为 circleica」的创作者 / 标签。仅当该记录无主站游戏关联时才可安全纠正为 galvelica，避免破坏主站数据。"
    >
      {suspicious.length === 0 ? (
        <EmptyState icon={ShieldAlert} title="未检测到 source 误标" description="当前没有副站数据被误标为 circleica。" bordered />
      ) : (
        <div className="space-y-3">
          {suspicious.map((s) => (
            <div key={`${s.type}-${s.id}`} className="flex flex-row flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4">
              {s.type === "creator" ? (
                <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : (
                <TagIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0 flex-1">
                <span className="font-medium text-foreground">{s.name}</span>
                <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                  {s.type === "creator" ? "创作者" : "标签"} · source=circleica
                </span>
                {s.hasGameLink && (
                  <span className="ml-2 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-500 ring-1 ring-amber-500/20">
                    已关联主站，不可改
                  </span>
                )}
              </div>
              {!s.hasGameLink && (
                <form action={fixSourceMismatch}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="type" value={s.type} />
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400 ring-1 ring-emerald-500/20 transition-colors hover:bg-emerald-500/25"
                  >
                    <CheckCircle2 className="h-4 w-4" /> 纠正为 galvelica
                  </button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}

      {fixable.length === 0 && suspicious.length > 0 && (
        <p className="mt-4 text-sm text-muted-foreground">
          所有可疑项均已关联主站游戏，为安全起见暂不纠正。如需处理，请在主站后台调整其归属。
        </p>
      )}
    </AdminPageContainer>
  )
}
