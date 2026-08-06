"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"

/**
 * 纠正 source 误标：把「本属副站、却被标成 circleica」的 Creator/Tag 改回 galvelica。
 * 安全前提：该记录不能有任何主站 Game 关联（否则改 source 会破坏主站数据），有则拒绝。
 */
export async function fixSourceMismatch(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  const type = String(formData.get("type") || "")
  if (!id) throw new ValidationError("缺少 id")
  if (type !== "creator" && type !== "tag") throw new ValidationError("类型无效")

  if (type === "creator") {
    const c = await prisma.creator.findFirst({ where: { id, source: "circleica" }, select: { id: true } })
    if (!c) throw new NotFoundError("创作者")
    const linkedGame = await prisma.gameCreator.findFirst({ where: { creatorId: id } })
    if (linkedGame) throw new ForbiddenError("该创作者已关联主站游戏，不能改为副站来源")
    await prisma.creator.update({ where: { id }, data: { source: "galvelica" } })
  } else {
    const t = await prisma.tag.findFirst({ where: { id, source: "circleica" }, select: { id: true } })
    if (!t) throw new NotFoundError("标签")
    const linkedGame = await prisma.gameTag.findFirst({ where: { tagId: id } })
    if (linkedGame) throw new ForbiddenError("该标签已关联主站游戏，不能改为副站来源")
    await prisma.tag.update({ where: { id }, data: { source: "galvelica" } })
  }
  revalidatePath("/admin/galvelica/governance")
}
