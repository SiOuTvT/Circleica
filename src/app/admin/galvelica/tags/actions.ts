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
