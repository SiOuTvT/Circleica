/**
 * 用户 Repository — 用户/认证/收藏/通知/关注
 */

import { prisma } from "@/lib/prisma"
import type { Prisma, UserRole } from "@prisma/client"

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

  findByUsernameOrEmail(identifier: string) {
    return prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    })
  },

  create(data: { username: string; email: string; password: string; role?: UserRole; emailVerified?: boolean }) {
    return prisma.user.create({ data: { ...data, role: data.role || "USER", emailVerified: data.emailVerified ?? false } })
  },

  updateProfile(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({ where: { id }, data, select: { id: true, username: true, avatar: true, bio: true, banner: true } })
  },

  updateAvatar(id: string, avatar: string) {
    return prisma.user.update({ where: { id }, data: { avatar } })
  },

  updateAvatarFrame(id: string, avatarFrameId: string | null) {
    return prisma.user.update({ where: { id }, data: { avatarFrameId } })
  },

  getStats(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        _count: { select: { comments: true, favorites: true, forumPosts: true, checkIns: true, followers: true, following: true } },
      },
    })
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

  create(data: { userId: string; actorId: string; type: string; targetType: string; targetId: string }) {
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

  update(id: string, data: Prisma.CommentUpdateInput) {
    return prisma.comment.update({ where: { id }, data })
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
  findByDate(userId: string, date: Date) {
    const dateStr = date.toISOString().split("T")[0]
    return prisma.checkIn.findFirst({
      where: { userId, date: new Date(dateStr + "T00:00:00.000Z") as unknown as Date },
    })
  },

  create(userId: string, marks: number) {
    const dateStr = new Date().toISOString().split("T")[0]
    const date = new Date(dateStr + "T00:00:00.000Z")
    return prisma.checkIn.create({ data: { userId, date, marks } })
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
