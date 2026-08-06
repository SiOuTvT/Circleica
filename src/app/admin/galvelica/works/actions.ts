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

/** 批量删除作品（仅 galvelica 范围）。 */
export async function batchDeleteWorks(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const ids = parseIdList(formData)
  if (ids.length === 0) throw new ValidationError("未选择任何作品")

  // 子表 onDelete: Cascade 会一并清理；关联 Game 不受影响（SetNull）。
  await prisma.work.deleteMany({ where: { id: { in: ids } } })
  revalidatePath("/admin/galvelica/works")
}

/** 批量收录 / 取消收录。include=true 时为未收录作品建草稿；false 时解除已收录锚点。 */
export async function batchToggleInclusion(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const ids = parseIdList(formData)
  if (ids.length === 0) throw new ValidationError("未选择任何作品")
  const include = formData.get("include") === "true"

  const works = await prisma.work.findMany({ where: { id: { in: ids } }, select: { id: true, gameId: true } })
  for (const w of works) {
    if (include && !w.gameId) {
      await createDraftGameFromWork(w.id)
    } else if (!include && w.gameId) {
      const game = await prisma.game.findUnique({ where: { id: w.gameId }, select: { id: true, isPublished: true } })
      await prisma.work.update({ where: { id: w.id }, data: { gameId: null } })
      if (game && !game.isPublished) await prisma.game.delete({ where: { id: game.id } }).catch(() => {})
    }
  }
  revalidatePath("/admin/galvelica/works")
}

/** 批量设置 NSFW 标记。 */
export async function batchSetNsfw(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const ids = parseIdList(formData)
  if (ids.length === 0) throw new ValidationError("未选择任何作品")
  const nsfw = formData.get("nsfw") === "true"

  await prisma.work.updateMany({ where: { id: { in: ids } }, data: { isNsfw: nsfw } })
  revalidatePath("/admin/galvelica/works")
}

/** 从 formData 的 ids 字段（逗号分隔）解析 id 列表，去空去重。 */
function parseIdList(formData: FormData): string[] {
  const raw = String(formData.get("ids") || "")
  return Array.from(new Set(raw.split(",").map((s) => s.trim()).filter(Boolean)))
}
