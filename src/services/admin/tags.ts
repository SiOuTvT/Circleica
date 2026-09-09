/**
 * Admin Service — 标签管理（tagService / tagGroupService / resourceTagService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { tagGroupRepo, tagRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from "@/lib/errors"
import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"
import { slugify } from "@/lib/slug"
import { cache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// ── 标签组 ──────────────────────────

export const tagGroupService = {
  getAll() { return tagGroupRepo.findAll() },

  async getById(id: string) {
    const g = await tagGroupRepo.findById(id)
    if (!g) throw new NotFoundError("标签组")
    return g
  },

  /** 该组下挂了多少个标签：删除前二次确认用 */
  countTags(id: string) {
    return prisma.tag.count({ where: { groupId: id } })
  },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    const result = await tagGroupRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#7c8a9e",
      positions: raw.positions ? String(raw.positions) : "[]",
      isPreset: Boolean(raw.isPreset),
    })
    await logAudit({ userId: "ADMIN", action: "tagGroup.create", target: result.id, detail: `《${result.name}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    const data: Record<string, unknown> = {}
    for (const f of ["name", "description", "color", "positions", "isPreset"]) {
      if (f in raw) data[f] = raw[f]
    }
    const prev = existing as unknown as Record<string, unknown>
    const changedFields = Object.keys(data)
      .filter((k) => JSON.stringify(data[k]) !== JSON.stringify(prev[k]))
      .join(",")
    const result = await tagGroupRepo.update(id, data)
    // 标签组（含颜色）改了要清：后台标签缓存 + 前台标签组颜色缓存（3600s 隐藏炸弹）
    // + 首页/发现页网格缓存（其中 mapGameToCard 已把颜色固化进卡片数据，必须一并失效）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid:")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/games")
    await logAudit({ userId: "ADMIN", action: "tagGroup.update", target: id, detail: `《${result.name}》${changedFields ? `fields=${changedFields}` : "无字段变化"}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    if (existing.isPreset) throw new ValidationError("预设标签组不可删除，可以在组内移除标签")
    const result = await tagGroupRepo.delete(id)
    // 与 update 同一套失效口径
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tagGroup.delete", target: id, detail: `《${existing.name}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async forceDelete(id: string) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    if (existing.isPreset) throw new ValidationError("预设标签组不可删除，可以在组内移除标签")
    const result = await tagGroupRepo.delete(id)
    // 强删不再是绕过审计与缓存的后门：失效与审计与 delete 完全一致
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tagGroup.delete", target: id, detail: `《${existing.name}》（强制）` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 标签 ────────────────────────────

export const tagService = {
  getAll() { return tagRepo.findAll() },

  async getById(id: string) {
    const t = await tagRepo.findById(id)
    if (!t) throw new NotFoundError("标签")
    return t
  },

  /** 该标签被多少部游戏引用：删除前二次确认用 */
  countGames(id: string) {
    return prisma.gameTag.count({ where: { tagId: id } })
  },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    const name = String(raw.name).trim()
    // pg adapter 不回传 P2002 的 meta.target，重名只能写库前预查，给出准确文案
    const dupName = await prisma.tag.findFirst({ where: { name, source: "circleica" }, select: { id: true } })
    if (dupName) throw new ConflictError("已存在同名的标签，请换一个")
    // 生成稳定可读 slug（CJK 直出），循环查重追加 -n 直到唯一
    const baseSlug = slugify(name)
    let slug = baseSlug
    let n = 2
    while (await prisma.tag.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${n}`
      n++
    }
    const result = await tagRepo.create({
      source: "circleica",
      name,
      slug,
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#a78bfa",
      sortOrder: Number(raw.sortOrder) || 0,
      isVisible: raw.isVisible !== false,
      ...(raw.groupId ? { group: { connect: { id: String(raw.groupId) } } } : {}),
    })
    // 与 tagGroupService.update 同一套失效口径（标签颜色会被固化进首页/发现页卡片数据）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tag.create", target: result.id, detail: `《${result.name}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const data: Prisma.TagUpdateInput = {}
    if ("name" in raw) data.name = String(raw.name).trim()
    // 改名后重建 slug（与 create 一致），避免 URL 仍指向旧 slug 的陈旧链接；查重追加 -n
    if ("name" in raw && String(raw.name).trim() !== existing.name) {
      const name = String(raw.name).trim()
      // 改名时同样预查重名（排除自己），pg adapter 不回传 target，靠不了 P2002
      const dupName = await prisma.tag.findFirst({
        where: { name, source: "circleica", NOT: { id } },
        select: { id: true },
      })
      if (dupName) throw new ConflictError("已存在同名的标签，请换一个")
      const baseSlug = slugify(name)
      let slug = baseSlug
      let n = 2
      // 排除自己：否则「改名但 slug 未变」时会查到自己，误追 -2 把前台 URL 换掉
      while (await prisma.tag.findUnique({ where: { slug, NOT: { id } } })) {
        slug = `${baseSlug}-${n}`
        n++
      }
      data.slug = slug
    }
    if ("description" in raw) data.description = String(raw.description)
    if ("color" in raw) data.color = String(raw.color)
    if ("sortOrder" in raw) data.sortOrder = Number(raw.sortOrder)
    if ("isVisible" in raw) data.isVisible = Boolean(raw.isVisible)
    if ("groupId" in raw) {
      data.group = raw.groupId ? { connect: { id: String(raw.groupId) } } : { disconnect: true }
    }
    const prev = existing as unknown as Record<string, unknown>
    const nextGroupId = raw.groupId ? String(raw.groupId) : null
    const changedFields = Object.keys(data)
      .filter((k) => {
        // group 是关系字段，data 里是 connect/disconnect 对象，无法直接和现有记录浅比较
        if (k === "group") return ((prev.group as { id: string } | null)?.id ?? null) !== nextGroupId
        return JSON.stringify((data as Record<string, unknown>)[k]) !== JSON.stringify(prev[k])
      })
      .join(",")
    const result = await tagRepo.update(id, data)
    // 与 tagGroupService.update 同一套失效口径（标签颜色会被固化进首页/发现页卡片数据）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tag.update", target: id, detail: `《${result.name}》${changedFields ? `fields=${changedFields}` : "无字段变化"}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const result = await tagRepo.delete(id)
    // 与 tagGroupService.update 同一套失效口径（标签颜色会被固化进首页/发现页卡片数据）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tag.delete", target: id, detail: `《${existing.name}》` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async forceDelete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const result = await tagRepo.delete(id)
    // 强删不再是绕过审计与缓存的后门：失效与审计与 delete 完全一致
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tag.delete", target: id, detail: `《${existing.name}》（强制）` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async assignGroup(id: string, groupId: string | null) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const result = await tagRepo.update(id, groupId ? { group: { connect: { id: groupId } } } : { group: { disconnect: true } })
    // 与 tagGroupService.update 同一套失效口径（标签颜色会被固化进首页/发现页卡片数据）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    revalidatePath("/games")
    revalidatePath("/")
    await logAudit({ userId: "ADMIN", action: "tag.assignGroup", target: id, detail: `《${existing.name}》groupId=${groupId ?? "无"}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 资源标签 ────────────────────────

const RESOURCE_TAG_LABELS: Record<string, string> = {
  resource_platforms: "平台",
  resource_languages: "语言",
  resource_run_types: "运行方式",
  resource_content_types: "资源类型",
}

export const resourceTagService = {
  async getAll() {
    const keys = ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"]
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
      select: { key: true, value: true },
    })
    return rows.map(r => {
      let options: string[] = []
      try { options = JSON.parse(r.value) } catch { /* ignore */ }
      return {
        group: r.key,
        key: r.key,
        label: RESOURCE_TAG_LABELS[r.key] || r.key,
        options,
      }
    })
  },

  async update(key: string, options: string[]) {
    const allowed = ["resource_platforms", "resource_languages", "resource_run_types", "resource_content_types"]
    if (!allowed.includes(key)) throw new ValidationError("无效的资源标签类型")
    await prisma.siteSetting.upsert({
      where: { key },
      update: { value: JSON.stringify(options) },
      create: { key, value: JSON.stringify(options) },
    })
  },
}
