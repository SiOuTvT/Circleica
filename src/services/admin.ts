/**
 * Admin Service — 管理后台业务逻辑
 */

import { achievementRepo, avatarFrameRepo, creatorRepo, emotionalMessageRepo, tagGroupRepo, tagRepo, musicRepo, playlistRepo, checkInRepo, auditLogRepo, reportRepo, adminStatsRepo, adminGameRepo, adminReviewRepo, adminForumRepo, adminUserRepo, adminSearchRepo, adminSettingsRepo } from "@/repositories/admin"
import { NotFoundError, ConflictError, ValidationError, AppError } from "@/lib/errors"
import type { Prisma, UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { revalidateTag } from "next/cache"
import fs from "fs/promises"
import path from "path"

// ── 成就 ────────────────────────────

export const achievementService = {
  getAll() { return achievementRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名称不能为空")
    if (!raw.conditionType) throw new ValidationError("条件类型不能为空")
    return achievementRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description).trim() : "",
      icon: raw.icon ? String(raw.icon).trim() : "",
      characterImage: raw.characterImage ? String(raw.characterImage).trim() : "",
      category: raw.category ? String(raw.category).trim() : "general",
      conditionType: String(raw.conditionType),
      conditionTarget: Number(raw.conditionTarget) || 1,
      points: Number(raw.points) || 10,
      hidden: raw.hidden !== false,
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await achievementRepo.findById(id)
    if (!existing) throw new NotFoundError("成就")
    const fields = ["name", "description", "icon", "characterImage", "category", "conditionType", "conditionTarget", "points", "hidden", "isActive"]
    const data: Record<string, unknown> = {}
    for (const f of fields) { if (f in raw) data[f] = raw[f] }
    if (Object.keys(data).length === 0) throw new ValidationError("没有有效的更新字段")
    return achievementRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await achievementRepo.findById(id)
    if (!existing) throw new NotFoundError("成就")
    return achievementRepo.delete(id)
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
    return avatarFrameRepo.create({
      name: String(raw.name),
      description: raw.description ? String(raw.description) : "",
      imageUrl: String(raw.imageUrl),
      isPublic: raw.isPublic !== false,
      sort: Number(raw.sort) || 0,
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await avatarFrameRepo.findById(id)
    if (!existing) throw new NotFoundError("头像框")
    const data: Record<string, unknown> = {}
    for (const f of ["name", "description", "imageUrl", "isPublic", "sort"]) {
      if (f in raw) data[f] = raw[f]
    }
    return avatarFrameRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await avatarFrameRepo.findById(id)
    if (!existing) throw new NotFoundError("头像框")
    // 清理合成头像文件
    const affectedUsers = await avatarFrameRepo.findUsersWithFrame(id)
    for (const user of affectedUsers) {
      if (user.composedAvatarUrl) {
        try { await cleanupOldComposedAvatar(user.composedAvatarUrl) } catch {}
      }
    }
    // 删除头像框图片文件
    for (const ext of ["png", "webp", "jpg"]) {
      try {
        await fs.unlink(path.join(process.cwd(), "public", "uploads", "avatar-frames", `${id}.${ext}`))
      } catch {}
    }
    return avatarFrameRepo.delete(id)
  },
}

// ── 创作者 ──────────────────────────

export const creatorService = {
  getAll() { return creatorRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    if (!raw.name?.toString().trim()) throw new ValidationError("名字不能为空")
    return creatorRepo.create({
      vndbId: raw.vndbId ? String(raw.vndbId).trim() : "",
      name: String(raw.name).trim(),
      nameJa: raw.nameJa ? String(raw.nameJa).trim() : "",
      avatar: raw.avatar ? String(raw.avatar).trim() : "",
      bio: raw.bio ? String(raw.bio).trim() : "",
      gender: raw.gender ? String(raw.gender) : "",
      twitterUrl: raw.twitterUrl ? String(raw.twitterUrl).trim() : "",
      wikipediaUrl: raw.wikipediaUrl ? String(raw.wikipediaUrl).trim() : "",
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await creatorRepo.findById(id)
    if (!existing) throw new NotFoundError("创作者")
    if (!raw.name?.toString().trim()) throw new ValidationError("名字不能为空")
    return creatorRepo.update(id, {
      vndbId: raw.vndbId ? String(raw.vndbId).trim() : "",
      name: String(raw.name).trim(),
      nameJa: raw.nameJa ? String(raw.nameJa).trim() : "",
      avatar: raw.avatar ? String(raw.avatar).trim() : "",
      bio: raw.bio ? String(raw.bio).trim() : "",
      gender: raw.gender ? String(raw.gender) : "",
      twitterUrl: raw.twitterUrl ? String(raw.twitterUrl).trim() : "",
      wikipediaUrl: raw.wikipediaUrl ? String(raw.wikipediaUrl).trim() : "",
    })
  },

  async delete(id: string) {
    const existing = await creatorRepo.findById(id)
    if (!existing) throw new NotFoundError("创作者")
    return creatorRepo.delete(id)
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
    return emotionalMessageRepo.create({
      key: String(raw.key), category: String(raw.category),
      title: raw.title ? String(raw.title) : "", subtitle: raw.subtitle ? String(raw.subtitle) : "",
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : "", emoji: raw.emoji ? String(raw.emoji) : "",
      enabled: raw.enabled !== false,
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await emotionalMessageRepo.findById(id)
    if (!existing) throw new NotFoundError("情感消息")
    const data: Record<string, unknown> = {}
    for (const f of ["title", "subtitle", "imageUrl", "emoji", "enabled", "category"]) {
      if (f in raw) data[f] = raw[f]
    }
    return emotionalMessageRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await emotionalMessageRepo.findById(id)
    if (!existing) throw new NotFoundError("情感消息")
    return emotionalMessageRepo.delete(id)
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
    return tagGroupRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#7c8a9e",
      positions: raw.positions ? String(raw.positions) : "[]",
      isPreset: Boolean(raw.isPreset),
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    const data: Record<string, unknown> = {}
    for (const f of ["name", "description", "color", "positions", "isPreset"]) {
      if (f in raw) data[f] = raw[f]
    }
    return tagGroupRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await tagGroupRepo.findById(id)
    if (!existing) throw new NotFoundError("标签组")
    return tagGroupRepo.delete(id)
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
    return tagRepo.create({
      name: String(raw.name).trim(),
      description: raw.description ? String(raw.description) : "",
      color: raw.color ? String(raw.color) : "#a78bfa",
      sortOrder: Number(raw.sortOrder) || 0,
      isVisible: raw.isVisible !== false,
      ...(raw.groupId ? { group: { connect: { id: String(raw.groupId) } } } : {}),
    })
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
    return tagRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    return tagRepo.delete(id)
  },

  async forceDelete(id: string) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    return tagRepo.delete(id)
  },

  async assignGroup(id: string, groupId: string | null) {
    const existing = await tagRepo.findById(id)
    if (!existing) throw new NotFoundError("标签")
    return tagRepo.update(id, groupId ? { group: { connect: { id: groupId } } } : { group: { disconnect: true } })
  },
}

// ── 音乐 ────────────────────────────

export const musicService = {
  getAll() { return musicRepo.findAll() },

  async create(raw: Record<string, unknown>) {
    if (!raw.title || !raw.filename) throw new ValidationError("标题和文件名必填")
    return musicRepo.create({
      title: String(raw.title), filename: String(raw.filename),
      url: raw.url ? String(raw.url) : "",
      isActive: raw.isActive !== false,
      ...(raw.playlistId ? { playlist: { connect: { id: String(raw.playlistId) } } } : {}),
    })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await musicRepo.findById(id)
    if (!existing) throw new NotFoundError("音乐")
    const data: Prisma.MusicUpdateInput = {}
    if ("title" in raw) data.title = String(raw.title)
    if ("filename" in raw) data.filename = String(raw.filename)
    if ("url" in raw) data.url = String(raw.url)
    if ("isActive" in raw) data.isActive = Boolean(raw.isActive)
    if ("playlistId" in raw) {
      data.playlist = raw.playlistId ? { connect: { id: String(raw.playlistId) } } : { disconnect: true }
    }
    return musicRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await musicRepo.findById(id)
    if (!existing) throw new NotFoundError("音乐")
    return musicRepo.delete(id)
  },
}

// ── 播放列表 ────────────────────────

export const playlistService = {
  getAll() { return playlistRepo.findAll() },
  getById(id: string) { return playlistRepo.findById(id) },

  async create(raw: Record<string, unknown>) {
    if (!raw.name) throw new ValidationError("名称不能为空")
    return playlistRepo.create({ name: String(raw.name), sortOrder: Number(raw.sortOrder) || 0 })
  },

  async update(id: string, raw: Record<string, unknown>) {
    const existing = await playlistRepo.findById(id)
    if (!existing) throw new NotFoundError("播放列表")
    const data: Record<string, unknown> = {}
    if ("name" in raw) data.name = raw.name
    if ("sortOrder" in raw) data.sortOrder = raw.sortOrder
    return playlistRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await playlistRepo.findById(id)
    if (!existing) throw new NotFoundError("播放列表")
    return playlistRepo.delete(id)
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

  async getById(id: string) {
    const game = await adminGameRepo.findById(id)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  async update(id: string, data: Record<string, unknown>) {
    const existing = await adminGameRepo.findById(id)
    if (!existing) throw new NotFoundError("游戏")
    return adminGameRepo.update(id, data)
  },

  async delete(id: string) {
    const existing = await adminGameRepo.findById(id)
    if (!existing) throw new NotFoundError("游戏")
    return adminGameRepo.delete(id)
  },

  async batchDelete(ids: string[]) {
    if (!ids.length) throw new ValidationError("缺少游戏 ID")
    return adminGameRepo.batchDelete(ids)
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
    const game = await adminGameRepo.findById(gameId)
    if (!game) throw new NotFoundError("游戏")
    return adminReviewRepo.approve(gameId, reviewerId)
  },

  async reject(gameId: string, reason: string, reviewerId: string) {
    const game = await adminGameRepo.findById(gameId)
    if (!game) throw new NotFoundError("游戏")
    if (!reason?.trim()) throw new ValidationError("拒绝原因不能为空")
    return adminReviewRepo.reject(gameId, reason.trim(), reviewerId)
  },
}

// ── 论坛管理 ────────────────────────

export const adminForumService = {
  getPostsPaginated(page: number) { return adminForumRepo.findPostsPaginated(page, 20) },

  async deletePost(id: string) {
    const post = await prisma.forumPost.findUnique({ where: { id } })
    if (!post) throw new NotFoundError("帖子")
    return adminForumRepo.deletePost(id)
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
    const user = await adminUserRepo.findById(id)
    if (!user) throw new NotFoundError("用户")
    // 只有 SUPER_ADMIN 可以设置/变更 SUPER_ADMIN 角色
    if (role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以设置超级管理员角色")
    }
    // 不能降级同级或更高级的用户（除非自己是 SUPER_ADMIN）
    if (callerRole !== "SUPER_ADMIN" && user.role === "SUPER_ADMIN") {
      throw new ForbiddenError("不能修改超级管理员的角色")
    }
    return adminUserRepo.updateRole(id, role as UserRole)
  },

  async delete(id: string, callerRole: UserRole, callerId: string) {
    const user = await adminUserRepo.findById(id)
    if (!user) throw new NotFoundError("用户")
    if (user.id === callerId) throw new ValidationError("不能删除自己的账号")
    if (user.role === "SUPER_ADMIN" && callerRole !== "SUPER_ADMIN") {
      throw new ForbiddenError("只有超级管理员可以删除超级管理员账号")
    }
    return adminUserRepo.delete(id)
  },
}

// ── 搜索 ────────────────────────────

export const adminSearchService = {
  search(query: string) {
    if (!query?.trim()) return { games: [], users: [], forumPosts: [] }
    return adminSearchRepo.search(query.trim())
  },
}

// ── 设置 ────────────────────────────

export const adminSettingsService = {
  getAll() { return adminSettingsRepo.findAll() },

  async upsert(key: string, value: string) {
    if (!key) throw new ValidationError("key 不能为空")
    revalidateTag("site-settings", "max")
    return adminSettingsRepo.upsert(key, value)
  },
}

// ── 资源标签 ────────────────────────

export const resourceTagService = {
  async getAll() {
    return prisma.tag.findMany({
      where: { group: { isPreset: true } },
      orderBy: { sortOrder: "asc" },
      include: { group: { select: { id: true, name: true } } },
    })
  },
}

// ── 辅助函数 ────────────────────────

async function cleanupOldComposedAvatar(url: string) {
  try {
    const filePath = path.join(process.cwd(), "public", url.startsWith("/") ? url.slice(1) : url)
    await fs.unlink(filePath)
  } catch {}
}
