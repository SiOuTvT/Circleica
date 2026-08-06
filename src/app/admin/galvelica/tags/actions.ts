"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors"

export async function createGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const name = String(formData.get("name") || "").trim()
  const color = String(formData.get("color") || "").trim() || "#a78bfa"
  const slugRaw = String(formData.get("slug") || "").trim()

  if (!name) throw new ValidationError("标签名不能为空")

  try {
    await prisma.tag.create({
      data: { name, color, source: "galvelica", slug: slugRaw || null },
    })
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw new ConflictError("标签名或 slug 已存在")
    throw e
  }
  revalidatePath("/admin/galvelica/tags")
}

export async function editGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  const name = String(formData.get("name") || "").trim()
  const color = String(formData.get("color") || "").trim()

  if (!id) throw new ValidationError("缺少标签 id")
  if (!name) throw new ValidationError("标签名不能为空")

  const existing = await prisma.tag.findFirst({ where: { id, source: "galvelica" }, select: { id: true } })
  if (!existing) throw new NotFoundError("标签（仅副站）")

  try {
    await prisma.tag.update({ where: { id }, data: { name, color } })
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw new ConflictError("标签名或 slug 已存在")
    throw e
  }
  revalidatePath("/admin/galvelica/tags")
}

export async function deleteGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  if (!id) throw new ValidationError("缺少标签 id")

  const existing = await prisma.tag.findFirst({ where: { id, source: "galvelica" }, select: { id: true } })
  if (!existing) throw new NotFoundError("标签（仅副站）")

  await prisma.tag.delete({ where: { id } }) // 级联清 WorkTag
  revalidatePath("/admin/galvelica/tags")
}

/** 合并重复标签：把 fromId 的 WorkTag 关系转移给 toId（去重），再删 fromId。两者均须为 galvelica 范围。 */
export async function mergeGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const fromId = String(formData.get("fromId") || "")
  const toIdRaw = String(formData.get("toId") || "").trim()
  const toNameRaw = String(formData.get("toName") || "").trim()
  if (!fromId) throw new ValidationError("缺少源标签 id")

  const from = await prisma.tag.findFirst({ where: { id: fromId, source: "galvelica" }, select: { id: true } })
  if (!from) throw new NotFoundError("源标签（仅副站）")

  let to = toIdRaw ? await prisma.tag.findFirst({ where: { id: toIdRaw, source: "galvelica" }, select: { id: true } }) : null
  if (!to && toNameRaw) {
    to = await prisma.tag.findFirst({ where: { name: toNameRaw, source: "galvelica" }, select: { id: true } })
  }
  if (!to) throw new NotFoundError("目标标签（仅副站）")
  if (to.id === fromId) throw new ValidationError("不能合并到自身")

  // 转移关系：重复则删，否则改挂目标（WorkTag 以 workId+tagId 为复合主键）
  const rows = await prisma.workTag.findMany({ where: { tagId: fromId } })
  for (const r of rows) {
    const dup = await prisma.workTag.findUnique({ where: { workId_tagId: { workId: r.workId, tagId: to.id } } })
    if (dup) {
      await prisma.workTag.delete({ where: { workId_tagId: { workId: r.workId, tagId: fromId } } })
    } else {
      await prisma.workTag.update({
        where: { workId_tagId: { workId: r.workId, tagId: fromId } },
        data: { tagId: to.id },
      })
    }
  }

  await prisma.tag.delete({ where: { id: fromId } })
  revalidatePath("/admin/galvelica/tags")
  revalidatePath(`/admin/galvelica/tags/${to.id}`)
}
