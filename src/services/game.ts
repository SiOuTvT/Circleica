/**
 * 游戏 Service — 游戏相关业务逻辑
 */

import { gameRepo } from "@/repositories/game"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { gameResourceCreateSchema } from "@/lib/validations"
import { checkAchievements } from "@/lib/achievements"
import type { PlayStatusType, Prisma, UserRole } from "@prisma/client"
import { hasRole } from "@/lib/permissions"

export const gameService = {
  getPaginated(page: number, limit: number, filters?: { q?: string; sort?: string; tag?: string }) {
    return gameRepo.findPaginated(page, Math.min(limit, 50), filters)
  },

  async getById(id: string) {
    const game = await gameRepo.findById(id)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  async getBySerialId(serialId: number) {
    const game = await gameRepo.findBySerialId(serialId)
    if (!game) throw new NotFoundError("游戏")
    return game
  },

  getRandom(limit = 5) { return gameRepo.findRandom(limit) },

  incrementView(id: string) { return gameRepo.incrementViewCount(id) },

  batchIncrementView(ids: string[]) {
    if (!ids.length) return
    return gameRepo.batchIncrementViewCount(ids.slice(0, 50))
  },

  // ── 收藏 ────────────────────────────

  async toggleFavorite(userId: string, gameId: string, collectionId?: string) {
    const game = await gameRepo.findById(gameId)
    if (!game) throw new NotFoundError("游戏")
    try {
      const favorited = await gameRepo.toggleFavorite(userId, gameId, collectionId)
      if (favorited) checkAchievements(userId).catch(() => {})
      return { favorited }
    } catch (e: unknown) {
      // 并发双触发可能导致唯一约束(P2002)/未找到(P2025)冲突：交互式事务回滚后
      // 状态已落在正确终态，按真实收藏状态返回，避免给第二次并发请求抛错。
      const code = (e as { code?: string })?.code
      if (code === "P2002" || code === "P2025") {
        const stillFav = await gameRepo.isFavorited(userId, gameId)
        return { favorited: !!stillFav }
      }
      throw e
    }
  },

  // ── 游玩状态 ────────────────────────

  async setPlayStatus(userId: string, gameId: string, status: string) {
    // 中文 → 枚举映射（兼容旧前端）
    const STATUS_MAP: Record<string, PlayStatusType> = {
      "想玩": "WANT_TO_PLAY", "在玩": "PLAYING", "玩过": "PLAYED",
      "搁置": "ON_HOLD", "弃坑": "DROPPED",
    }
    const enumValue = STATUS_MAP[status] ?? (status as PlayStatusType)
    const validEnums: PlayStatusType[] = ["WANT_TO_PLAY", "PLAYING", "PLAYED", "ON_HOLD", "DROPPED"]
    if (!validEnums.includes(enumValue)) throw new ValidationError("无效的游玩状态")
    return gameRepo.setPlayStatus(userId, gameId, enumValue)
  },

  getPlayStatus(userId: string, gameId: string) {
    return gameRepo.getPlayStatus(userId, gameId)
  },

  // ── 评分 ────────────────────────────

  async setRating(userId: string, gameId: string, score: number) {
    if (!Number.isInteger(score) || score < 1 || score > 5) throw new ValidationError("评分必须是 1-5 的整数")
    await gameRepo.setRating(userId, gameId, score)
    return gameRepo.getRatingStats(gameId)
  },

  getRating(userId: string, gameId: string) {
    return gameRepo.getRating(userId, gameId)
  },

  // ── 评论 ────────────────────────────

  getComments(gameId: string, page: number, limit: number) {
    return gameRepo.findComments(gameId, page, Math.min(limit, 50))
  },

  async createComment(userId: string, gameId: string, content: string, imageUrl?: string, parentId?: string) {
    if (!content?.trim() && !imageUrl) throw new ValidationError("评论内容不能为空")
    if (content && content.length > 2000) throw new ValidationError("评论最多 2000 个字符")
    const comment = await gameRepo.createComment(userId, gameId, content?.trim() || "", imageUrl, parentId)
    checkAchievements(userId).catch(() => {})
    return comment
  },

  // ── 举报 ────────────────────────────

  report(userId: string, gameId: string, ip: string, reason?: string) {
    return gameRepo.report(userId, gameId, ip, reason || "")
  },

  // ── 资源 ────────────────────────────

  getResources(gameId: string) { return gameRepo.findResources(gameId) },

  async createResource(gameId: string, userId: string, raw: Record<string, unknown>) {
    // Zod 验证
    const parsed = gameResourceCreateSchema.parse(raw)

    return gameRepo.createResource({
      gameId, userId,
      resourceName: parsed.resourceName ?? "",
      resourceNote: parsed.resourceNote ?? "",
      platform: JSON.stringify(parsed.platform ?? []),
      language: JSON.stringify(parsed.language ?? []),
      runType: JSON.stringify(parsed.runType ?? []),
      resourceContent: JSON.stringify(parsed.resourceContent ?? []),
      entries: {
        create: parsed.entries.map((e) => ({
          url: e.url,
          extractCode: e.extractCode ?? "",
          decompressCode: e.decompressCode ?? "",
          fileSize: e.fileSize ?? "",
        })),
      },
    })
  },

  async deleteResource(resourceId: string, userId: string, role: string) {
    const resource = await prisma.gameResource.findUnique({
      where: { id: resourceId },
      select: { userId: true },
    })
    if (!resource) throw new NotFoundError("资源")
    if (resource.userId !== userId && !hasRole(role as UserRole, "ADMIN")) {
      throw new ForbiddenError("只能删除自己上传的资源")
    }
    return gameRepo.deleteResource(resourceId)
  },

  reportResource(userId: string, resourceId: string) {
    return gameRepo.reportResource(userId, resourceId)
  },

  async updateResource(resourceId: string, userId: string, role: string, raw: Record<string, unknown>) {
    const resource = await prisma.gameResource.findUnique({
      where: { id: resourceId },
      select: { userId: true },
    })
    if (!resource) throw new NotFoundError("资源")
    if (resource.userId !== userId && !hasRole(role as UserRole, "ADMIN")) {
      throw new ForbiddenError("只能编辑自己上传的资源")
    }
    const parsed = gameResourceCreateSchema.partial().parse(raw)
    const updateData: Record<string, unknown> = {}
    if (parsed.resourceName !== undefined) updateData.resourceName = parsed.resourceName
    if (parsed.resourceNote !== undefined) updateData.resourceNote = parsed.resourceNote
    if (parsed.platform !== undefined) updateData.platform = JSON.stringify(parsed.platform)
    if (parsed.language !== undefined) updateData.language = JSON.stringify(parsed.language)
    if (parsed.runType !== undefined) updateData.runType = JSON.stringify(parsed.runType)
    if (parsed.resourceContent !== undefined) updateData.resourceContent = JSON.stringify(parsed.resourceContent)
    if (parsed.entries) {
      await prisma.gameResourceEntry.deleteMany({ where: { resourceId } })
      updateData.entries = {
        create: parsed.entries.map((e) => ({
          url: e.url,
          extractCode: e.extractCode ?? "",
          decompressCode: e.decompressCode ?? "",
          fileSize: e.fileSize ?? "",
        })),
      }
    }
    return prisma.gameResource.update({
      where: { id: resourceId },
      data: updateData as Prisma.GameResourceUpdateInput,
      include: { entries: true, user: { select: { id: true, username: true } } },
    })
  },
}
