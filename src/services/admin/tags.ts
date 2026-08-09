/**
 * Admin Service — 标签管理（tagService / tagGroupService / resourceTagService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { tagGroupRepo, tagRepo } from "@/repositories/admin"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import type { Prisma } from "@prisma/client"
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

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    const result = await tagGroupRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#7c8a9e",
      positions: raw.positions ? String(raw.positions) : "[]",
      isPreset: Boolean(raw.isPreset),
    })
    await logAudit({ userId: "ADMIN", action: "tagGroup.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    const data: Record<string, unknown> = {}
    for (const f of ["name", "description", "color", "positions", "isPreset"]) {
      if (f in raw) data[f] = raw[f]
    }
    const result = await tagGroupRepo.update(id, data)
    // 标签组（含颜色）改了要清：后台标签缓存 + 前台标签组颜色缓存（3600s 隐藏炸弹）
    // + 首页/发现页网格缓存（其中 mapGameToCard 已把颜色固化进卡片数据，必须一并失效）
    await cache.delByPrefix("circleica:admin:tags:")
    await cache.delByPrefix("circleica:tagGroup:")
    await cache.delByPrefix("circleica:homepage:games:grid:")
    await cache.delByPrefix("circleica:discover:")
    revalidatePath("/admin/tags")
    revalidatePath("/games")
    await logAudit({ userId: "ADMIN", action: "tagGroup.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    const result = await tagGroupRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "tagGroup.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async forceDelete(id: string) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    return tagGroupRepo.delete(id)
  },
}

// ── 标签 ────────────────────────────

export const tagService = {
  getAll() { return tagRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    const name = String(raw.name).trim()
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
    await cache.delByPrefix("circleica:admin:tags:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    await logAudit({ userId: "ADMIN", action: "tag.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const data: Prisma.TagUpdateInput = {}
    if ("name" in raw) data.name = String(raw.name)
    // 改名后重建 slug（与 create 一致），避免 URL 仍指向旧 slug 的陈旧链接；查重追加 -n
    if ("name" in raw && String(raw.name).trim() !== existing.name) {
      const name = String(raw.name).trim()
      const baseSlug = slugify(name)
      let slug = baseSlug
      let n = 2
      while (await prisma.tag.findUnique({ where: { slug } })) {
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
    const result = await tagRepo.update(id, data)
    await cache.delByPrefix("circleica:admin:tags:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    await logAudit({ userId: "ADMIN", action: "tag.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const result = await tagRepo.delete(id)
    await cache.delByPrefix("circleica:admin:tags:")
    revalidatePath("/admin/tags")
    await logAudit({ userId: "ADMIN", action: "tag.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async forceDelete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    return tagRepo.delete(id)
  },

  async assignGroup(id: string, groupId: string | null) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    if (existing.source !== "circleica") throw new ForbiddenError("该标签属于其他站点，无权操作")
    const result = await tagRepo.update(id, groupId ? { group: { connect: { id: groupId } } } : { group: { disconnect: true } })
    await cache.delByPrefix("circleica:admin:tags:")
    revalidatePath("/admin/tags")
    revalidatePath("/admin/tags/all")
    await logAudit({ userId: "ADMIN", action: "tag.assignGroup", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
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
