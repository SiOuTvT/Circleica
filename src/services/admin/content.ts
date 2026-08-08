/**
 * Admin Service — 内容管理（achievementService / avatarFrameService / creatorService / emotionalMessageService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { achievementRepo, avatarFrameRepo, creatorRepo, emotionalMessageRepo } from "@/repositories/admin"
import { NotFoundError, ConflictError, ValidationError, ForbiddenError, AppError } from "@/lib/errors"
import { achievementCreateSchema } from "@/lib/validations"
import { prisma } from "@/lib/prisma"
import fs from "fs/promises"
import path from "path"
import { logAudit } from "@/lib/audit-log"
import { sanitizeUrl } from "@/lib/sanitize"
import { logger } from "@/lib/logger"
import { cache } from "@/lib/redis"
import { revalidatePath } from "next/cache"

// ── 成就 ────────────────────────────

export const achievementService = {
  getAll() { return achievementRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    // Zod 验证
    const parsed = achievementCreateSchema.parse(raw)

    // 保留手动校验作为额外保护层
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    if (!raw.conditionType) throw new ValidationError("条件类型不能为空")
    // Note: userId should come from the request context at the route layer; "ADMIN" is a placeholder
    const result = await achievementRepo.create({
      name: parsed.name.trim(),
      description: (parsed.description ?? "").trim(),
      icon: (parsed.icon ?? "").trim(),
      characterImage: (parsed.characterImage ?? "").trim(),
      category: (parsed.category ?? "general").trim(),
      conditionType: parsed.conditionType,
      conditionTarget: parsed.conditionTarget,
      points: parsed.points ?? 10,
      hidden: parsed.hidden !== false,
    })
    await logAudit({ userId: "ADMIN", action: "achievement.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await achievementRepo.findById(id)
    if (!existing) throw new NotFoundError("成就")
    // Zod 验证（partial 模式，所有字段可选）
    const parsed = achievementCreateSchema.partial().parse(raw)
    const fields = ["name", "description", "icon", "characterImage", "category", "conditionType", "conditionTarget", "points", "hidden", "isActive"]
    const data: Record<string, unknown> = {}
    for (const f of fields) { if (f in parsed) data[f] = parsed[f as keyof typeof parsed] }
    if (Object.keys(data).length === 0) throw new ValidationError("没有有效的更新字段")
    const result = await achievementRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "achievement.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await achievementRepo.findById(id)
    if (!existing) throw new NotFoundError("成就")
    const result = await achievementRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "achievement.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 辅助函数（仅头像框删除时清理合成头像文件） ────────────────────

async function cleanupOldComposedAvatar(url: string) {
  try {
    if (!url.startsWith("/uploads/")) return
    const uploadsDir = path.join(process.cwd(), "public", "uploads")
    const filePath = path.join(process.cwd(), "public", url.startsWith("/") ? url.slice(1) : url)
    // 路径遍历防护：解析后的路径必须在 uploads 目录内
    if (!filePath.startsWith(uploadsDir)) return
    await fs.unlink(filePath)
  } catch (e) { logger.system.warn("[Cleanup] 旧文件清理失败", { error: e instanceof Error ? e.message : String(e) }) }
}

// ── 头像框 ──────────────────────────

export const avatarFrameService = {
  getAll() { return avatarFrameRepo.findAll() },

  async getById(id: string) {
    const frame = await avatarFrameRepo.findById(id)
    if (!frame) throw new NotFoundError("头像框")
    return frame
  },

  async create(raw: Record<string, unknown>) {
    if (!raw.name || !raw.imageUrl) throw new ValidationError("名称和图片 URL 必填")
    const result = await avatarFrameRepo.create({
      name: String(raw.name),
      description: raw.description ? String(raw.description) : "",
      imageUrl: sanitizeUrl(String(raw.imageUrl)) ?? "",
      isPublic: raw.isPublic !== false,
      sort: Number(raw.sort) || 0,
    })
    await logAudit({ userId: "ADMIN", action: "avatarFrame.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await avatarFrameRepo.findById(id)
    if (!existing) throw new NotFoundError("头像框")
    const data: Record<string, unknown> = {}
    for (const f of ["name", "description", "imageUrl", "isPublic", "sort"]) {
      if (f in raw) data[f] = f === "imageUrl" ? (sanitizeUrl(String(raw[f])) ?? "") : raw[f]
    }
    const result = await avatarFrameRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "avatarFrame.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await avatarFrameRepo.findById(id)
    if (!existing) throw new NotFoundError("头像框")
    // 清理合成头像文件
    const affectedUsers = await avatarFrameRepo.findUsersWithFrame(id)
    for (const user of affectedUsers) {
      if (user.composedAvatarUrl) {
        try { await cleanupOldComposedAvatar(user.composedAvatarUrl) } catch (e) { logger.system.warn("[Cleanup] 旧文件清理失败", { error: e instanceof Error ? e.message : String(e) }) }
      }
    }
    // 删除头像框图片文件
    for (const ext of ["png", "webp", "jpg"]) {
      try {
        await fs.unlink(path.join(process.cwd(), "public", "uploads", "avatar-frames", `${id}.${ext}`))
      } catch (e) { logger.system.warn("[Cleanup] 旧文件清理失败", { error: e instanceof Error ? e.message : String(e) }) }
    }
    const result = await avatarFrameRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "avatarFrame.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 创作者 ──────────────────────────

export const creatorService = {
  getAll() { return creatorRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名字不能为空")
    const result = await creatorRepo.create({
      source: "circleica",
      vndbId: raw.vndbId ? String(raw.vndbId).trim() : "",
      name: String(raw.name).trim(),
      nameJa: raw.nameJa ? String(raw.nameJa).trim() : "",
      avatar: raw.avatar ? (sanitizeUrl(String(raw.avatar)) ?? "") : "",
      bio: raw.bio ? String(raw.bio).trim() : "",
      gender: raw.gender ? String(raw.gender) : "",
      twitterUrl: raw.twitterUrl ? (sanitizeUrl(String(raw.twitterUrl)) ?? "") : "",
      wikipediaUrl: raw.wikipediaUrl ? (sanitizeUrl(String(raw.wikipediaUrl)) ?? "") : "",
    })
    await logAudit({ userId: "ADMIN", action: "creator.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await creatorRepo.findById(id)
    if (!existing) throw new NotFoundError("创作者")
    if (existing.source !== "circleica") throw new ForbiddenError("该创作者属于其他站点，无权操作")
    if (!raw.name?.toString().trim()) throw new ValidationError("名字不能为空")
    const result = await creatorRepo.update(id, {
      vndbId: raw.vndbId ? String(raw.vndbId).trim() : "",
      name: String(raw.name).trim(),
      nameJa: raw.nameJa ? String(raw.nameJa).trim() : "",
      avatar: raw.avatar ? (sanitizeUrl(String(raw.avatar)) ?? "") : "",
      bio: raw.bio ? String(raw.bio).trim() : "",
      gender: raw.gender ? String(raw.gender) : "",
      twitterUrl: raw.twitterUrl ? (sanitizeUrl(String(raw.twitterUrl)) ?? "") : "",
      wikipediaUrl: raw.wikipediaUrl ? (sanitizeUrl(String(raw.wikipediaUrl)) ?? "") : "",
    })
    await cache.delByPrefix("circleica:admin:creators:")
    revalidatePath("/admin/creators")
    await logAudit({ userId: "ADMIN", action: "creator.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await creatorRepo.findById(id)
    if (!existing) throw new NotFoundError("创作者")
    if (existing.source !== "circleica") throw new ForbiddenError("该创作者属于其他站点，无权操作")
    const result = await creatorRepo.delete(id)
    await cache.delByPrefix("circleica:admin:creators:")
    revalidatePath("/admin/creators")
    await logAudit({ userId: "ADMIN", action: "creator.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async getGames(creatorId: string) {
    const gc = await creatorRepo.findGamesByCreator(creatorId)
    const gameMap = new Map<string, { id: string; title: string; coverImage: string | null; roles: string[] }>()
    for (const item of gc) {
      const existing = gameMap.get(item.game.id)
      if (existing) { existing.roles.push(item.role) }
      else { gameMap.set(item.game.id, { id: item.game.id, title: item.game.title, coverImage: item.game.coverImage, roles: [item.role] }) }
    }
    return Array.from(gameMap.values())
  },

  async fetchFromVndb(vndbId: string) {
    if (!vndbId) throw new ValidationError("缺少 id 参数")
    const res = await fetch("https://api.vndb.org/kana/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filters: ["id", "=", vndbId],
        fields: "id,name,lang,gender,description,extlinks{url,label},aliases{name}",
      }),
    })
    if (!res.ok) throw new AppError("VNDB 请求失败", "INTERNAL", 502)
    const data = await res.json()
    const staff = data.results?.[0]
    if (!staff) throw new NotFoundError("Staff")
    const nameJa = staff.aliases?.find((a: { name: string }) => /[぀-ヿ一-鿿]/.test(a.name))?.name ?? ""
    const twitterUrl = staff.extlinks?.find((e: { label: string }) => e.label === "Xitter" || e.label === "Twitter")?.url ?? ""
    const wikipediaUrl = staff.extlinks?.find((e: { label: string }) => e.label?.startsWith("Wikipedia"))?.url ?? ""
    return { vndbId: staff.id, name: staff.name, nameJa, bio: staff.description ?? "", gender: staff.gender ?? "", twitterUrl, wikipediaUrl }
  },
}

// ── 情感消息 ────────────────────────

export const emotionalMessageService = {
  getAll(category?: string) { return emotionalMessageRepo.findAll(category) },

  async create(raw: Record<string, unknown>) {
    if (!raw.key || !raw.category) throw new ValidationError("key 和 category 为必填项")
    const existing = await emotionalMessageRepo.findByKey(String(raw.key))
    if (existing) throw new ConflictError(`key "${raw.key}" 已存在`)
    const result = await emotionalMessageRepo.create({
      key: String(raw.key), category: String(raw.category),
      title: raw.title ? String(raw.title) : "", subtitle: raw.subtitle ? String(raw.subtitle) : "",
      imageUrl: raw.imageUrl ? (sanitizeUrl(String(raw.imageUrl)) ?? "") : "", emoji: raw.emoji ? String(raw.emoji) : "",
      enabled: raw.enabled !== false,
    })
    await logAudit({ userId: "ADMIN", action: "emotionalMessage.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await emotionalMessageRepo.findById(id)
    if (!existing) throw new NotFoundError("情感消息")
    const data: Record<string, unknown> = {}
    for (const f of ["title", "subtitle", "imageUrl", "emoji", "enabled", "category"]) {
      if (f in raw) data[f] = f === "imageUrl" ? (sanitizeUrl(String(raw[f])) ?? "") : raw[f]
    }
    const result = await emotionalMessageRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "emotionalMessage.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await emotionalMessageRepo.findById(id)
    if (!existing) throw new NotFoundError("情感消息")
    const result = await emotionalMessageRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "emotionalMessage.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}
