"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { requireSiteAdmin } from "@/lib/auth-context"
import { NotFoundError, ValidationError } from "@/lib/errors"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"

/** 两条收录申请入口（主站 / 副站各一页）共用：两边页面缓存都要清 */
function revalidateInclusionPages() {
  revalidatePath("/admin/inclusion-requests")
  revalidatePath("/admin/galvelica/inclusion")
}

/** 当前操作者 id，取不到就 null（不因此报错） */
async function currentAdminId(): Promise<string | null> {
  const session = await auth().catch(() => null)
  return (session as { user?: { id?: string } } | null)?.user?.id ?? null
}

/** 发布收录草稿：将对应 Game 置为已发布，并标记收录申请为已决定。 */
export async function publishInclusionGalvelica(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const workId = String(formData.get("workId") || "")
  if (!workId) throw new ValidationError("缺少作品 id")

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { gameId: true, title: true } })
  if (!work?.gameId) throw new NotFoundError("收录草稿")
  const gameId = work.gameId

  await prisma.game.update({ where: { id: gameId }, data: { isPublished: true } })
  await prisma.inclusionRequest.updateMany({
    where: { workId, status: "APPROVED" },
    data: { decidedAt: new Date(), reviewedBy: await currentAdminId() },
  })
  revalidateInclusionPages()

  await logAudit({
    userId: "ADMIN",
    action: "inclusion.publish",
    target: workId,
    detail: `《${work.title}》`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
}

/** 删除收录草稿：删未发布 Game，解除作品锚点（作品重新变为未收录，可再次申请）。 */
export async function deleteInclusionGalvelica(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const workId = String(formData.get("workId") || "")
  const returnTo = String(formData.get("returnTo") || "/admin/inclusion-requests")
  if (!workId) throw new ValidationError("缺少作品 id")

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { gameId: true, title: true } })
  if (!work?.gameId) throw new NotFoundError("收录草稿")
  const gameId = work.gameId

  // 删除与解绑必须同事务：删除失败时整事务回滚，不会留下没人指向的孤儿 Game，
  // 也不会提前把 work.gameId 置空。不再用 .catch(() => {}) 吞掉失败。
  try {
    await prisma.$transaction(async (tx) => {
      await tx.game.delete({ where: { id: gameId } })
      await tx.work.update({ where: { id: workId }, data: { gameId: null } })
    })
  } catch (e) {
    logger.db.error("[Inclusion] 删除收录草稿失败", e)
    // server action 抛错在生产环境会被脱敏，用户看不到具体原因，
    // 所以这里回来源页并带 ?err= 由页面渲染明确提示。
    redirect(`${returnTo}?err=${encodeURIComponent("删除失败：游戏草稿没能删除，作品锚点已保持原样，可重试")}`)
  }

  revalidateInclusionPages()

  await logAudit({
    userId: "ADMIN",
    action: "inclusion.deleteDraft",
    target: workId,
    detail: `《${work.title}》，游戏草稿已删除`,
  }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
}
