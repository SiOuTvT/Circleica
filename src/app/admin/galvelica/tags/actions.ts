"use server"

import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { requireSiteAdmin } from "@/lib/auth-context"
import { logger } from "@/lib/logger"
import { cache, cacheKey } from "@/lib/redis"
import { NotFoundError, ValidationError, ConflictError } from "@/lib/errors"
import { GAL_DEFAULT_TAG_COLOR } from "@/lib/galvelica-palette"
import { getGalvelicaTagColor, updateSiteSettings } from "@/lib/site-settings"

/** 清副站标签后台列表缓存（120s Redis），revalidatePath 清不掉自定义缓存，必须显式删除。 */
async function clearTagsCache() {
  await cache.delByPrefix(cacheKey("admin:galvelica:tags"))
}

export async function createGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const name = String(formData.get("name") || "").trim()
  // 新建标签继承当前副站统一色（兜底基准），而非固定的写死紫色；如需差异再单独自定义。
  const color = String(formData.get("color") || "").trim() || (await getGalvelicaTagColor()) || GAL_DEFAULT_TAG_COLOR
  const slugRaw = String(formData.get("slug") || "").trim()

  if (!name) throw new ValidationError("标签名不能为空")

  let createdId: string | undefined
  try {
    const created = await prisma.tag.create({
      data: { name, color, source: "galvelica", slug: slugRaw || null },
      select: { id: true },
    })
    createdId = created.id
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw new ConflictError("标签名或 slug 已存在")
    throw e
  }
  await clearTagsCache()
  revalidatePath("/admin/galvelica/tags")
  revalidatePath("/galvelica/tags")
  revalidatePath("/galvelica")
  if (createdId) revalidatePath(`/galvelica/tags/${createdId}`)
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

  // 标签颜色现由副站统一配色控制，编辑时不再单改 per-tag color（留空则保留原值）。
  const data: { name: string; color?: string } = { name }
  if (color) data.color = color

  try {
    await prisma.tag.update({ where: { id }, data })
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw new ConflictError("标签名或 slug 已存在")
    throw e
  }
  await clearTagsCache()
  revalidatePath("/admin/galvelica/tags")
  revalidatePath("/galvelica/tags")
  revalidatePath("/galvelica")
  revalidatePath(`/galvelica/tags/${id}`)
}

/**
 * 副站标签统一配色（兜底/默认色）：写入 SiteSetting[galvelica:tagColor]（经 updateSiteSettings 清 Data Cache），
 * 并 revalidate 公开/后台路由，使前台标签颜色随后台保存立即生效。
 * 级联语义：把「仍停留在上一版统一色」的标签一并改写为新版统一色；已单独自定义（≠ 旧统一色）的标签保持不变。
 * 仅作用 Galvelica 界面，不与主站共享或关联（key 含 galvelica 前缀，主站永不读取）。
 */
export async function setGalvelicaTagColor(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const color = String(formData.get("color") || "").trim()
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) throw new ValidationError("颜色格式须为 #RRGGBB")

  const oldColor = (await getGalvelicaTagColor()) || ""
  await updateSiteSettings({ "galvelica:tagColor": color })

  // 兜底级联：仅改写仍等于「旧统一色」的标签；单独自定义的标签（已偏离旧统一色）不动。
  if (oldColor && oldColor.toLowerCase() !== color.toLowerCase()) {
    try {
      await prisma.tag.updateMany({
        where: { source: "galvelica", color: oldColor },
        data: { color },
      })
    } catch (e) {
      logger.db.error("[GalvelicaTags] cascade unified tag color failed", e)
    }
  }

  await clearTagsCache()
  revalidatePath("/admin/galvelica/tags")
  revalidatePath("/galvelica")
  revalidatePath("/galvelica/tags")
  revalidatePath("/galvelica/works")
  revalidatePath("/galvelica/tags/[tagId]")
}

export async function deleteGalvelicaTag(formData: FormData) {
  await requireSiteAdmin("galvelica")
  const id = String(formData.get("id") || "")
  if (!id) throw new ValidationError("缺少标签 id")

  const existing = await prisma.tag.findFirst({ where: { id, source: "galvelica" }, select: { id: true } })
  if (!existing) throw new NotFoundError("标签（仅副站）")

  await prisma.tag.delete({ where: { id } }) // 级联清 WorkTag
  await clearTagsCache()
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
  await clearTagsCache()
  revalidatePath("/admin/galvelica/tags")
  revalidatePath(`/admin/galvelica/tags/${to.id}`)
}
