"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { NotFoundError, ValidationError } from "@/lib/errors"

/** 发布收录草稿：将对应 Game 置为已发布，并标记收录申请为已决定。 */
export async function publishInclusionGalvelica(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const workId = String(formData.get("workId") || "")
  if (!workId) throw new ValidationError("缺少作品 id")

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { gameId: true } })
  if (!work?.gameId) throw new NotFoundError("收录草稿")
  const gameId = work.gameId

  await prisma.game.update({ where: { id: gameId }, data: { isPublished: true } })
  await prisma.inclusionRequest.updateMany({
    where: { workId, status: "APPROVED" },
    data: { decidedAt: new Date() },
  })
  revalidatePath("/admin/galvelica/inclusion")
}

/** 删除收录草稿：删未发布 Game，解除作品锚点（作品重新变为未收录，可再次申请）。 */
export async function deleteInclusionGalvelica(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const workId = String(formData.get("workId") || "")
  if (!workId) throw new ValidationError("缺少作品 id")

  const work = await prisma.work.findUnique({ where: { id: workId }, select: { gameId: true } })
  if (!work?.gameId) throw new NotFoundError("收录草稿")
  const gameId = work.gameId

  await prisma.game.delete({ where: { id: gameId } }).catch(() => {})
  await prisma.work.update({ where: { id: workId }, data: { gameId: null } })
  revalidatePath("/admin/galvelica/inclusion")
}
