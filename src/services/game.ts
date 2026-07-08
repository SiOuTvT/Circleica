/**
 * 游戏 Service — 游戏相关业务逻辑
 */

import { gameRepo } from "@/repositories/game"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"

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

  getFeatured(limit?: number) { return gameRepo.findFeatured(limit || 8) },

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
    const existing = await gameRepo.isFavorited(userId, gameId)
    if (existing) {
      await gameRepo.removeFavorite(userId, gameId)
      return { favorited: false }
    } else {
      await gameRepo.addFavorite(userId, gameId, collectionId)
      return { favorited: true }
    }
  },

  // ── 游玩状态 ────────────────────────

  async setPlayStatus(userId: string, gameId: string, status: string) {
    const validStatuses = ["想玩", "在玩", "玩过", "搁置", "弃坑"]
    if (!validStatuses.includes(status)) throw new ValidationError("无效的游玩状态")
    return gameRepo.setPlayStatus(userId, gameId, status)
  },

  getPlayStatus(userId: string, gameId: string) {
    return gameRepo.getPlayStatus(userId, gameId)
  },

  // ── 评分 ────────────────────────────

  async setRating(userId: string, gameId: string, score: number) {
    if (!Number.isInteger(score) || score < 1 || score > 10) throw new ValidationError("评分必须是 1-10 的整数")
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
    return gameRepo.createComment(userId, gameId, content?.trim() || "", imageUrl, parentId)
  },

  // ── 举报 ────────────────────────────

  report(userId: string, gameId: string, ip: string, reason?: string) {
    return gameRepo.report(userId, gameId, ip, reason || "")
  },

  // ── 资源 ────────────────────────────

  getResources(gameId: string) { return gameRepo.findResources(gameId) },

  async createResource(gameId: string, userId: string, raw: Record<string, unknown>) {
    return gameRepo.createResource({
      gameId, userId,
      resourceName: raw.resourceName ? String(raw.resourceName) : "",
      resourceNote: raw.resourceNote ? String(raw.resourceNote) : "",
      platform: JSON.stringify(raw.platform || []),
      language: JSON.stringify(raw.language || []),
      runType: JSON.stringify(raw.runType || []),
      resourceContent: JSON.stringify(raw.resourceContent || []),
      entries: {
        create: Array.isArray(raw.entries) ? raw.entries.map((e: any) => ({
          url: String(e.url || ""),
          extractCode: String(e.extractCode || ""),
          decompressCode: String(e.decompressCode || ""),
          fileSize: String(e.fileSize || ""),
        })) : [],
      },
    })
  },

  async deleteResource(resourceId: string) {
    return gameRepo.deleteResource(resourceId)
  },

  reportResource(userId: string, resourceId: string) {
    return gameRepo.reportResource(userId, resourceId)
  },
}
