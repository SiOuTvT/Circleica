/**
 * Admin Service — 管理后台业务逻辑
 */

import { achievementRepo, avatarFrameRepo, creatorRepo, emotionalMessageRepo, tagGroupRepo, tagRepo, musicRepo, playlistRepo, checkInRepo, auditLogRepo, reportRepo, adminStatsRepo, adminGameRepo, adminReviewRepo, adminForumRepo, adminUserRepo, adminSearchRepo } from "@/repositories/admin"
import { NotFoundError, ConflictError, ValidationError, ForbiddenError, AppError } from "@/lib/errors"
import { achievementCreateSchema } from "@/lib/validations"
import type { Prisma, UserRole, GameStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import fs from "fs/promises"
import path from "path"
import { logAudit } from "@/lib/audit-log"
import { sanitizeUrl } from "@/lib/sanitize"
import { logger } from "@/lib/logger"

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
    await logAudit({ userId: "ADMIN", action: "creator.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await creatorRepo.findById(id)
    if (!existing) throw new NotFoundError("创作者")
    const result = await creatorRepo.delete(id)
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
    const result = await tagRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#a78bfa",
      sortOrder: Number(raw.sortOrder) || 0,
      isVisible: raw.isVisible !== false,
      ...(raw.groupId ? { group: { connect: { id: String(raw.groupId) } } } : {}),
    })
    await logAudit({ userId: "ADMIN", action: "tag.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    const data: Prisma.TagUpdateInput = {}
    if ("name" in raw) data.name = String(raw.name)
    if ("description" in raw) data.description = String(raw.description)
    if ("color" in raw) data.color = String(raw.color)
    if ("sortOrder" in raw) data.sortOrder = Number(raw.sortOrder)
    if ("isVisible" in raw) data.isVisible = Boolean(raw.isVisible)
    if ("groupId" in raw) {
      data.group = raw.groupId ? { connect: { id: String(raw.groupId) } } : { disconnect: true }
    }
    const result = await tagRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "tag.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    const result = await tagRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "tag.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async forceDelete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    return tagRepo.delete(id)
  },

  async assignGroup(id: string, groupId: string | null) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    const result = await tagRepo.update(id, groupId ? { group: { connect: { id: groupId } } } : { group: { disconnect: true } })
    await logAudit({ userId: "ADMIN", action: "tag.assignGroup", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 签到 ────────────────────────────

export const adminCheckinService = {
  getPaginated(page: number) { return checkInRepo.findPaginated(page, 20) },

  async delete(id: string) {
    await checkInRepo.delete(id)
  },
}

// ── 审计日志 ────────────────────────

export const auditLogService = {
  getPaginated(page: number, action?: string) { return auditLogRepo.findPaginated(page, 30, action) },
}

// ── 举报 ────────────────────────────

export const reportService = {
  getGameReports() { return reportRepo.findGameReports() },
  getResourceReports() { return reportRepo.findResourceReports() },
}

// ── 统计 ────────────────────────────

export const adminStatsService = {
  getCounts() { return adminStatsRepo.getCounts() },
}

// ── 游戏管理 ────────────────────────

export const adminGameService = {
  getPaginated(page: number, search?: string) { return adminGameRepo.findPaginated(page, 20, search) },

  async create(data: Record<string, unknown>, publisherId: string) {
    if (!data.title?.toString().trim()) throw new ValidationError("游戏标题不能为空")
    const game = await prisma.game.create({
      data: {
        title: String(data.title).trim(),
        originalWork: data.originalWork ? String(data.originalWork).trim() : "",
        description: data.description ? String(data.description).trim() : "",
        coverImage: data.coverImage ? String(data.coverImage).trim() : "",
        status: (data.status as GameStatus) || "FINISHED",
        isNsfw: Boolean(data.isNsfw),
        vndbId: data.vndbId ? String(data.vndbId).trim() : "",
        releaseDate: data.releaseDate ? new Date(String(data.releaseDate)) : null,
        gameDuration: data.gameDuration ? String(data.gameDuration).trim() : "",
        studioName: data.studioName ? String(data.studioName).trim() : "",
        englishName: data.englishName ? String(data.englishName).trim() : "",
        aliases: data.aliases ? String(data.aliases).trim() : "",
        publisherId,
        isPublished: data.isPublished === true,
      },
    })
    // 处理标签关联
    if (Array.isArray(data.tagIds) && data.tagIds.length > 0) {
      await prisma.gameTag.createMany({
        data: data.tagIds.map((tagId: string) => ({ gameId: game.id, tagId })),
        skipDuplicates: true,
      })
    }
    await logAudit({ userId: publisherId, action: "game.create", target: game.id })
    return game
  },

  async getById(id: string) {
    const game = await adminGameRepo.findById(id)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  async update(id: string, data: Record<string, unknown>) {
    if (!await adminGameRepo.exists(id)) throw new NotFoundError("游戏")
    // 字段白名单，防止 mass assignment
    const ALLOWED = ["title", "originalWork", "description", "coverImage", "screenshots",
      "downloadLinks", "status", "isNsfw", "vndbId", "isPublished", "releaseDate",
      "gameDuration", "studioName", "englishName", "aliases", "rejectReason"]
    const safe: Record<string, unknown> = {}
    for (const k of ALLOWED) { if (k in data) safe[k] = data[k] }
    const result = await adminGameRepo.update(id, safe)

    // 处理标签关联更新
    if (Array.isArray(data.tagIds)) {
      await prisma.gameTag.deleteMany({ where: { gameId: id } })
      if (data.tagIds.length > 0) {
        await prisma.gameTag.createMany({
          data: data.tagIds.map((tagId: string) => ({ gameId: id, tagId })),
          skipDuplicates: true,
        })
      }
    }

    // 处理创作者关联更新
    if (Array.isArray(data.creators)) {
      await prisma.gameCreator.deleteMany({ where: { gameId: id } })
      if (data.creators.length > 0) {
        await prisma.gameCreator.createMany({
          data: data.creators.map((c: { creatorId: string; role: string }) => ({
            gameId: id, creatorId: c.creatorId, role: c.role,
          })),
          skipDuplicates: true,
        })
      }
    }

    await logAudit({ userId: "ADMIN", action: "game.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    if (!await adminGameRepo.exists(id)) throw new NotFoundError("游戏")
    const result = await adminGameRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "game.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async batchDelete(ids: string[]) {
    if (!ids.length) throw new ValidationError("缺少游戏 ID")
    const result = await adminGameRepo.batchDelete(ids)
    await logAudit({ userId: "ADMIN", action: "game.batchDelete", target: ids.join(","), detail: `${ids.length} games` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  getLogs(gameId: string) { return adminGameRepo.findLogs(gameId) },

  async createLog(gameId: string, content: string) {
    if (!content?.trim()) throw new ValidationError("日志内容不能为空")
    return adminGameRepo.createLog(gameId, content.trim())
  },
}

// ── 审核 ────────────────────────────

export const adminReviewService = {
  getPending() { return adminReviewRepo.findPending() },

  async approve(gameId: string, reviewerId: string) {
    if (!await adminGameRepo.exists(gameId)) throw new NotFoundError("游戏")
    const result = await adminReviewRepo.approve(gameId, reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.approve", target: gameId }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async reject(gameId: string, reason: string, reviewerId: string) {
    if (!await adminGameRepo.exists(gameId)) throw new NotFoundError("游戏")
    if (!reason?.trim()) throw new ValidationError("拒绝原因不能为空")
    const result = await adminReviewRepo.reject(gameId, reason.trim(), reviewerId)
    await logAudit({ userId: "ADMIN", action: "review.reject", target: gameId }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 论坛管理 ────────────────────────

export const adminForumService = {
  getPostsPaginated(page: number) { return adminForumRepo.findPostsPaginated(page, 20) },

  async deletePost(id: string) {
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) throw new NotFoundError("帖子")
    const result = await adminForumRepo.deletePost(id)
    await logAudit({ userId: "ADMIN", action: "forum.deletePost", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 用户管理 ────────────────────────

export const adminUserService = {
  getPaginated(page: number, search?: string) { return adminUserRepo.findPaginated(page, 20, search) },

  async getById(id: string) {
    const user = await adminUserRepo.findById(id)
    if (!user) throw new NotFoundError("用户")
    return user
  },

  async updateRole(id: string, role: string, callerRole: UserRole) {
    const validRoles = ["USER", "ADMIN", "SUPER_ADMIN"]
    if (!validRoles.includes(role)) throw new ValidationError("无效的角色")
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    // 只有 SUPER_ADMIN 可以设置/变更 SUPER_ADMIN 角色
    if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以设置超级管理员角色")
    }
    // 不能降级同级或更高级的用户（除非自己是 SUPER_ADMIN）
    if (callerRole !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("不能修改超级管理员的角色")
    }
    // 防止降级最后一名超级管理员，导致后台无可用超管而锁死（L9）
    if (role !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      const superAdminCount = await adminUserRepo.countSuperAdmins()
      if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
    }
    const result = await adminUserRepo.updateRole(id, role as UserRole)
    await logAudit({ userId: "ADMIN", action: "user.updateRole", target: id, detail: `role=${role}` }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string, callerRole: UserRole, callerId: string) {
    const user = await adminUserRepo.findBasic(id)
    if (!user) throw new NotFoundError("用户")
    if (user.id === callerId) throw new ValidationError("不能删除自己的账号")
    if (user.role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以删除超级管理员账号")
    }
    // 防止删除最后一名超级管理员，导致后台锁死（L9）
    if (user.role === "SUPER_ADMIN") {
      const superAdminCount = await adminUserRepo.countSuperAdmins()
      if (superAdminCount <= 1) throw new ValidationError("至少需保留一名超级管理员")
    }
    const result = await adminUserRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "user.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 搜索 ────────────────────────────

export const adminSearchService = {
  search(query: string) {
    if (!query?.trim()) return { games: [], users: [], forumPosts: [] }
    return adminSearchRepo.search(query.trim())
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

// ── 音乐 ────────────────────────────

export const adminMusicService = {
  getAll() { return musicRepo.findAll() },

  async create(raw: { title?: string; url?: string; playlistId?: string }) {
    if (!raw.title?.trim()) throw new ValidationError("标题不能为空")
    if (!raw.url?.trim()) throw new ValidationError("链接不能为空")
    let playlistId: string | null = raw.playlistId || null
    if (playlistId) {
      const pl = await playlistRepo.findById(playlistId)
      if (!pl) playlistId = null
    }
    const result = await musicRepo.create({
      title: raw.title.trim(),
      filename: raw.url.trim(),
      url: raw.url.trim(),
      playlist: playlistId ? { connect: { id: playlistId } } : undefined,
    })
    await logAudit({ userId: "ADMIN", action: "music.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, raw: Record<string, unknown>) {
    const data: Prisma.MusicUpdateInput = {}
    if ("isActive" in raw) data.isActive = raw.isActive as boolean
    if (typeof raw.title === "string" && raw.title.trim()) data.title = raw.title.trim()
    if (typeof raw.url === "string" && raw.url.trim()) { data.url = raw.url.trim(); data.filename = raw.url.trim() }
    if (Object.keys(data).length === 0) throw new ValidationError("没有要更新的字段")
    const result = await musicRepo.update(id, data)
    await logAudit({ userId: "ADMIN", action: "music.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    await musicRepo.findById(id).then(m => { if (!m) throw new NotFoundError("音乐") })
    const result = await musicRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "music.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 播放列表 ────────────────────────

export const adminPlaylistService = {
  getAll() { return playlistRepo.findAll() },

  async getById(id: string) {
    const pl = await playlistRepo.findById(id)
    if (!pl) throw new NotFoundError("播放列表")
    return pl
  },

  async create(name: string) {
    if (!name?.trim()) throw new ValidationError("名称不能为空")
    const result = await playlistRepo.create({ name: name.trim() })
    await logAudit({ userId: "ADMIN", action: "playlist.create", target: result.id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async update(id: string, name: string) {
    if (!name?.trim()) throw new ValidationError("名称不能为空")
    await playlistRepo.findById(id).then(pl => { if (!pl) throw new NotFoundError("播放列表") })
    const result = await playlistRepo.update(id, { name: name.trim() })
    await logAudit({ userId: "ADMIN", action: "playlist.update", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },

  async delete(id: string) {
    await playlistRepo.findById(id).then(pl => { if (!pl) throw new NotFoundError("播放列表") })
    const result = await playlistRepo.delete(id)
    await logAudit({ userId: "ADMIN", action: "playlist.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 收藏管理 ────────────────────────

export const adminFavoriteService = {
  getPaginated(page: number) {
    const limit = 20
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.favorite.findMany({
        orderBy: { id: "desc" },
        skip, take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true } },
          game: { select: { id: true, title: true, coverImage: true } },
        },
      }),
      prisma.favorite.count(),
    ])
  },

  async delete(id: string) {
    // 先取 gameId，删除收藏后同步递减游戏的 denormalized favoriteCount（M4 计数器对账）
    const favorite = await prisma.favorite.findUnique({ where: { id }, select: { gameId: true } })
    if (!favorite) throw new NotFoundError("收藏")
    const result = await prisma.$transaction(async (tx) => {
      const deleted = await tx.favorite.delete({ where: { id } })
      await tx.game.update({
        where: { id: favorite.gameId },
        data: { favoriteCount: { decrement: 1 } },
      })
      return deleted
    })
    await logAudit({ userId: "ADMIN", action: "favorite.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 关注管理 ────────────────────────

export const adminFollowService = {
  getPaginated(page: number) {
    const limit = 20
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.follow.findMany({
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: {
          follower: { select: { id: true, username: true, avatar: true } },
          following: { select: { id: true, username: true, avatar: true } },
        },
      }),
      prisma.follow.count(),
    ])
  },

  async delete(id: string) {
    const result = await prisma.follow.delete({ where: { id } })
    await logAudit({ userId: "ADMIN", action: "follow.delete", target: id }).catch((e) => logger.system.error("[Audit] 审计日志写入失败", e))
    return result
  },
}

// ── 辅助函数 ────────────────────────

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
