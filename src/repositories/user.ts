/**
 * 用户 Repository — 用户/认证/收藏/通知/关注
 */

import { prisma } from "@/lib/prisma"
import type { Prisma, UserRole } from "@prisma/client"
import { toShanghaiDate } from "@/lib/date"

// ── 用户 ────────────────────────────

export const userRepo = {
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true, serialId: true, uid: true, username: true, email: true,
        avatar: true, avatarFrameId: true, composedAvatarUrl: true,
        banner: true, bio: true, role: true, faveGameId: true, createdAt: true,
        _count: { select: { comments: true, favorites: true, forumPosts: true, followers: true, following: true, checkIns: true } },
      },
    })
  },

  findByUsername(username: string) {
    return prisma.user.findUnique({ where: { username }, select: { id: true } })
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email }, select: { id: true } })
  },

  create(data: { username: string; email: string; password: string; role?: UserRole; emailVerified?: boolean }) {
    return prisma.user.create({ data: { ...data, role: data.role || "USER", emailVerified: data.emailVerified ?? false } })
  },

  updateProfile(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: { id: true, username: true, avatar: true, bio: true, banner: true } })
  },

  updateAvatarFrame(id: string, avatarFrameId: string | null) {
    return prisma.user.update({ where: { id }, data: { avatarFrameId } })
  },

  async getStats(id: string) {
    const [userStats, marksSum] = await Promise.all([
      prisma.user.findUnique({
        where: { id },
        select: {
          _count: { select: { comments: true, favorites: true, forumPosts: true, checkIns: true, followers: true, following: true } },
        },
      }),
      prisma.checkIn.aggregate({ where: { userId: id }, _sum: { marks: true } }),
    ])
    return {
      ...userStats,
      totalMarks: marksSum._sum.marks ?? 0,
    }
  },
}

// ── 收藏夹 ──────────────────────────

export const collectionRepo = {
  findByUserId(userId: string) {
    return prisma.collection.findMany({
      where: { userId },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { favorites: true } } },
    })
  },

  findById(id: string) {
    return prisma.collection.findUnique({
      where: { id },
      include: {
        favorites: {
          include: {
            game: {
              select: { id: true, serialId: true, title: true, coverImage: true, viewCount: true, favoriteCount: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  },

  create(userId: string, data: { name: string; description?: string; isDefault?: boolean }) {
    return prisma.collection.create({ data: { userId, ...data } })
  },

  update(id: string, data: Prisma.CollectionUpdateInput) {
    return prisma.collection.update({ where: { id }, data })
  },

  delete(id: string) {
    return prisma.$transaction([
      prisma.favorite.updateMany({ where: { collectionId: id }, data: { collectionId: null } }),
      prisma.collection.delete({ where: { id } }),
    ])
  },
}

// ── 通知 ────────────────────────────

export const notificationRepo = {
  findPaginated(userId: string, page: number, limit: number, unreadOnly?: boolean) {
    const skip = (page - 1) * limit
    const where: any = { userId }
    if (unreadOnly) where.isRead = false

    return Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { actor: { select: { id: true, username: true, avatar: true } } },
      }),
      prisma.notification.count({ where }),
    ])
  },

  getUnreadCount(userId: string) {
    return prisma.notification.count({ where: { userId, isRead: false } })
  },

  markAllRead(userId: string) {
    return prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
  },

  markRead(id: string) {
    return prisma.notification.update({ where: { id }, data: { isRead: true } })
  },

  markReadBulk(ids: string[], userId: string) {
    return prisma.notification.updateMany({ where: { id: { in: ids }, userId }, data: { isRead: true } })
  },

  deleteMany(ids: string[], userId: string) {
    return prisma.notification.deleteMany({ where: { id: { in: ids }, userId } })
  },

  deleteAllRead(userId: string) {
    return prisma.notification.deleteMany({ where: { userId, isRead: true } })
  },

  create(data: { userId: string; actorId: string; type: import("@prisma/client").NotificationTypeEnum; targetType: import("@prisma/client").NotificationTargetTypeEnum; targetId: string }) {
    return prisma.notification.create({ data })
  },
}

// ── 关注 ────────────────────────────

export const followRepo = {
  isFollowing(followerId: string, followingId: string) {
    return prisma.follow.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    })
  },

  follow(followerId: string, followingId: string) {
    return prisma.follow.create({ data: { followerId, followingId } })
  },

  unfollow(followerId: string, followingId: string) {
    return prisma.follow.delete({
      where: { followerId_followingId: { followerId, followingId } },
    })
  },
}

// ── 评论（公共）────────────────────

export const commentRepo = {
  findById(id: string) {
    return prisma.comment.findUnique({ where: { id } })
  },

  delete(id: string) {
    return prisma.$transaction([
      prisma.commentLike.deleteMany({ where: { commentId: id } }),
      prisma.comment.delete({ where: { id } }),
    ])
  },

  toggleLike(userId: string, commentId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      })
      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } })
        await tx.comment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } })
        return { liked: false }
      } else {
        await tx.commentLike.create({ data: { userId, commentId } })
        await tx.comment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } })
        return { liked: true }
      }
    })
  },
}

// ── 搜索 ────────────────────────────

export const searchRepo = {
  async search(query: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    const where = {
      isPublished: true,
      title: { contains: query, mode: "insensitive" as const },
    }
    return Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { viewCount: "desc" },
        skip, take: limit,
        include: {
          tags: { take: 3, select: { tag: { select: { name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
    ])
  },

  async suggestions(query: string) {
    const games = await prisma.game.findMany({
      where: { isPublished: true, title: { contains: query, mode: "insensitive" } },
      take: 8,
      select: { id: true, serialId: true, title: true, coverImage: true },
    })
    return games
  },
}

// ── 签到（公共）────────────────────

export const checkinRepo = {
  /** 将 Date 转为 Asia/Shanghai 的 YYYY-MM-DD（与 lib/date.ts 保持一致，避免 UTC 切片导致跨日偏差） */
  _toDateStr(date: Date): string {
    return toShanghaiDate(date)
  },

  findByDate(userId: string, date: Date) {
    const dateStr = this._toDateStr(date)
    return prisma.checkIn.findFirst({
      where: { userId, date: new Date(dateStr + "T00:00:00+08:00") as unknown as Date },
    })
  },

  create(userId: string, marks: number, date?: Date) {
    const d = date || new Date()
    const dateStr = this._toDateStr(d)
    const dateObj = new Date(dateStr + "T00:00:00+08:00")
    return prisma.checkIn.create({ data: { userId, date: dateObj, marks } })
  },

  getUserStreak(userId: string) {
    return prisma.checkIn.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 30,
      select: { date: true },
    })
  },
}

// ── 用户个人资料页 ─────────────────

export const profileRepo = {
  findComments(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.comment.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { game: { select: { id: true, title: true, coverImage: true } } },
      }),
      prisma.comment.count({ where: { userId } }),
    ])
  },

  findFavorites(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { game: { select: { id: true, serialId: true, title: true, coverImage: true } } },
    })
  },

  findPlayStatuses(userId: string) {
    return prisma.playStatus.findMany({
      where: { userId },
      include: { game: { select: { id: true, title: true, coverImage: true } } },
    })
  },
}
