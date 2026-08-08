/**
 * Admin Service — 社区管理（adminForumService / adminFavoriteService / adminFollowService / reportService / auditLogService）
 * 从 src/services/admin.ts 拆分而来，保持导出名与签名完全一致。
 */

import { adminForumRepo, reportRepo, auditLogRepo } from "@/repositories/admin"
import { NotFoundError } from "@/lib/errors"
import { prisma } from "@/lib/prisma"
import { logAudit } from "@/lib/audit-log"
import { logger } from "@/lib/logger"

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

// ── 举报 ────────────────────────────

export const reportService = {
  getGameReports() { return reportRepo.findGameReports() },
  getResourceReports() { return reportRepo.findResourceReports() },
}

// ── 审计日志 ────────────────────────

export const auditLogService = {
  getPaginated(page: number, action?: string) { return auditLogRepo.findPaginated(page, 30, action) },
}
