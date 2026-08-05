"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { createDraftGameFromWork } from "@/lib/galvelica/work-service"
import { NotFoundError, ValidationError } from "@/lib/errors"

function parseReleaseDate(raw: string): Date | null {
  if (!raw) return null
  const d = new Date(raw)
  if (isNaN(d.getTime())) throw new ValidationError("发售日格式无效")
  return d
}

export async function editWork(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  const title = String(formData.get("title") || "").trim()
  const studioName = String(formData.get("studioName") || "").trim()
  const status = String(formData.get("status") || "").trim()
  const releaseDateRaw = String(formData.get("releaseDate") || "").trim()
  const isNsfw = formData.get("isNsfw") === "on"

  if (!id) throw new ValidationError("缺少作品 id")
  if (!title) throw new ValidationError("标题不能为空")

  const existing = await prisma.work.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new NotFoundError("作品")

  await prisma.work.update({
    where: { id },
    data: { title, studioName, status, releaseDate: parseReleaseDate(releaseDateRaw), isNsfw },
  })
  revalidatePath("/admin/galvelica/works")
}

export async function deleteWork(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  if (!id) throw new ValidationError("缺少作品 id")

  const existing = await prisma.work.findUnique({ where: { id }, select: { id: true } })
  if (!existing) throw new NotFoundError("作品")

  // Work 子表（sources/tags/creators/requests）均为 onDelete: Cascade，会一并清理。
  // 关联的 Circleica Game 不受影响（关系 onDelete: SetNull）。
  await prisma.work.delete({ where: { id } })
  revalidatePath("/admin/galvelica/works")
}

export async function toggleInclusion(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  if (!id) throw new ValidationError("缺少作品 id")

  const work = await prisma.work.findUnique({ where: { id }, select: { id: true, gameId: true } })
  if (!work) throw new NotFoundError("作品")

  if (work.gameId) {
    // 取消收录：解除锚点；若链接的是未发布草稿则一并删除，已发布则保留主站资源。
    const game = await prisma.game.findUnique({ where: { id: work.gameId }, select: { id: true, isPublished: true } })
    await prisma.work.update({ where: { id }, data: { gameId: null } })
    if (game && !game.isPublished) {
      await prisma.game.delete({ where: { id: game.id } }).catch(() => {})
    }
  } else {
    // 收录：用融合字段建一份未发布 Game 草稿（幂等）。
    await createDraftGameFromWork(id)
  }
  revalidatePath("/admin/galvelica/works")
}
