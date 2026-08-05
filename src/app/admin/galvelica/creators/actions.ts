"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { NotFoundError, ValidationError } from "@/lib/errors"

async function requireGalvelicaCreator(id: string) {
  const c = await prisma.creator.findFirst({ where: { id, source: "galvelica" }, select: { id: true } })
  if (!c) throw new NotFoundError("创作者（仅副站）")
  return c
}

export async function deleteGalvelicaCreator(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  if (!id) throw new ValidationError("缺少创作者 id")
  await requireGalvelicaCreator(id)
  // 级联清 WorkCreator（及可能的 GameCreator）
  await prisma.creator.delete({ where: { id } })
  revalidatePath("/admin/galvelica/creators")
}

export async function mergeGalvelicaCreator(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const fromId = String(formData.get("fromId") || "")
  const toIdRaw = String(formData.get("toId") || "").trim()
  const toNameRaw = String(formData.get("toName") || "").trim()
  if (!fromId) throw new ValidationError("缺少源创作者 id")

  await requireGalvelicaCreator(fromId)

  let to = toIdRaw ? await prisma.creator.findFirst({ where: { id: toIdRaw, source: "galvelica" }, select: { id: true } }) : null
  if (!to && toNameRaw) {
    to = await prisma.creator.findFirst({ where: { name: toNameRaw, source: "galvelica" }, select: { id: true } })
  }
  if (!to) throw new NotFoundError("目标创作者（仅副站）")
  if (to.id === fromId) throw new ValidationError("不能合并到自身")

  // 作品关系：重复则删，否则改挂目标
  const workRows = await prisma.workCreator.findMany({ where: { creatorId: fromId } })
  for (const r of workRows) {
    const dup = await prisma.workCreator.findUnique({
      where: { workId_creatorId_role: { workId: r.workId, creatorId: to.id, role: r.role } },
    })
    if (dup) await prisma.workCreator.delete({ where: { id: r.id } })
    else await prisma.workCreator.update({ where: { id: r.id }, data: { creatorId: to.id } })
  }

  // 主站资源关系（若有）同理
  const gameRows = await prisma.gameCreator.findMany({ where: { creatorId: fromId } })
  for (const r of gameRows) {
    const dup = await prisma.gameCreator.findUnique({
      where: { gameId_creatorId_role: { gameId: r.gameId, creatorId: to.id, role: r.role } },
    })
    if (dup) await prisma.gameCreator.delete({ where: { id: r.id } })
    else await prisma.gameCreator.update({ where: { id: r.id }, data: { creatorId: to.id } })
  }

  await prisma.creator.delete({ where: { id: fromId } })
  revalidatePath("/admin/galvelica/creators")
}
