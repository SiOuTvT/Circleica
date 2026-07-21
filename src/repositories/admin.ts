/**
 * Admin Repository — 管理后台数据访问
 *
 * 包含：成就、头像框、创作者、情感消息、标签组、标签、音乐、播放列表、签到、审计日志、举报、设置
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

// ── 成就 ────────────────────────────

export const achievementRepo = {
  findAll() {
    return prisma.achievement.findMany({ orderBy: { createdAt: "desc" }, take: 200 })
  },
  findById(id: string) {
    return prisma.achievement.findUnique({ where: { id } })
  },
  create(data: Prisma.AchievementCreateInput) {
    return prisma.achievement.create({ data })
  },
  update(id: string, data: Prisma.AchievementUpdateInput) {
    return prisma.achievement.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.userAchievement.deleteMany({ where: { achievementId: id } }),
      prisma.achievement.delete({ where: { id } }),
    ])
  },
}

// ── 头像框 ──────────────────────────

export const avatarFrameRepo = {
  findAll() {
    return prisma.avatarFrame.findMany({ orderBy: { sort: "asc" } })
  },
  findById(id: string) {
    return prisma.avatarFrame.findUnique({ where: { id } })
  },
  create(data: Prisma.AvatarFrameCreateInput) {
    return prisma.avatarFrame.create({ data })
  },
  update(id: string, data: Prisma.AvatarFrameUpdateInput) {
    return prisma.avatarFrame.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.user.updateMany({
        where: { avatarFrameId: id },
        data: { avatarFrameId: null, composedAvatarUrl: null },
      }),
      prisma.avatarFrame.delete({ where: { id } }),
    ])
  },
  findUsersWithFrame(id: string) {
    return prisma.user.findMany({
      where: { avatarFrameId: id },
      select: { composedAvatarUrl: true },
    })
  },
}

// ── 创作者 ──────────────────────────

export const creatorRepo = {
  findAll() {
    return prisma.creator.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { _count: { select: { games: true } } },
    })
  },
  findById(id: string) {
    return prisma.creator.findUnique({ where: { id } })
  },
  findGamesByCreator(creatorId: string) {
    return prisma.gameCreator.findMany({
      where: { creatorId },
      include: { game: { select: { id: true, title: true, coverImage: true } } },
      orderBy: { game: { createdAt: "desc" } },
    })
  },
  create(data: Prisma.CreatorCreateInput) {
    return prisma.creator.create({ data })
  },
  update(id: string, data: Prisma.CreatorUpdateInput) {
    return prisma.creator.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.gameCreator.deleteMany({ where: { creatorId: id } }),
      prisma.creator.delete({ where: { id } }),
    ])
  },
}

// ── 情感消息 ────────────────────────

export const emotionalMessageRepo = {
  findAll(category?: string) {
    return prisma.emotionalMessage.findMany({
      where: category ? { category } : {},
      orderBy: [{ category: "asc" }, { key: "asc" }],
    })
  },
  findById(id: string) {
    return prisma.emotionalMessage.findUnique({ where: { id } })
  },
  findByKey(key: string) {
    return prisma.emotionalMessage.findUnique({ where: { key } })
  },
  create(data: Prisma.EmotionalMessageCreateInput) {
    return prisma.emotionalMessage.create({ data })
  },
  update(id: string, data: Prisma.EmotionalMessageUpdateInput) {
    return prisma.emotionalMessage.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.emotionalMessage.delete({ where: { id } })
  },
}

// ── 标签组 ──────────────────────────

export const tagGroupRepo = {
  findAll() {
    return prisma.tagGroup.findMany({
      orderBy: { name: "asc" },
      include: { tags: { select: { id: true, name: true, color: true } } },
    })
  },
  findById(id: string) {
    return prisma.tagGroup.findUnique({ where: { id }, include: { tags: true } })
  },
  create(data: Prisma.TagGroupCreateInput) {
    return prisma.tagGroup.create({ data })
  },
  update(id: string, data: Prisma.TagGroupUpdateInput) {
    return prisma.tagGroup.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.tag.updateMany({ where: { groupId: id }, data: { groupId: null } }),
      prisma.tagGroup.delete({ where: { id } }),
    ])
  },
}

// ── 标签 ────────────────────────────

export const tagRepo = {
  findAll() {
    return prisma.tag.findMany({
      orderBy: { sortOrder: "asc" },
      include: { group: { select: { id: true, name: true, color: true } }, _count: { select: { games: true } } },
    })
  },
  findById(id: string) {
    return prisma.tag.findUnique({ where: { id }, include: { group: true } })
  },
  create(data: Prisma.TagCreateInput) {
    return prisma.tag.create({ data })
  },
  update(id: string, data: Prisma.TagUpdateInput) {
    return prisma.tag.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.gameTag.deleteMany({ where: { tagId: id } }),
      prisma.tag.delete({ where: { id } }),
    ])
  },
}

// ── 音乐 ────────────────────────────

export const musicRepo = {
  findAll() {
    return prisma.music.findMany({ orderBy: { createdAt: "desc" }, take: 200, include: { playlist: true } })
  },
  findById(id: string) {
    return prisma.music.findUnique({ where: { id } })
  },
  create(data: Prisma.MusicCreateInput) {
    return prisma.music.create({ data })
  },
  update(id: string, data: Prisma.MusicUpdateInput) {
    return prisma.music.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.music.delete({ where: { id } })
  },
}

// ── 播放列表 ────────────────────────

export const playlistRepo = {
  findAll() {
    return prisma.playlist.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { music: true } } } })
  },
  findById(id: string) {
    return prisma.playlist.findUnique({ where: { id }, include: { music: { orderBy: { createdAt: "desc" } } } })
  },
  create(data: Prisma.PlaylistCreateInput) {
    return prisma.playlist.create({ data })
  },
  update(id: string, data: Prisma.PlaylistUpdateInput) {
    return prisma.playlist.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.music.updateMany({ where: { playlistId: id }, data: { playlistId: null } }),
      prisma.playlist.delete({ where: { id } }),
    ])
  },
}

// ── 签到 ────────────────────────────

export const checkInRepo = {
  findPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.checkIn.findMany({
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { user: { select: { id: true, username: true, avatar: true } } },
      }),
      prisma.checkIn.count(),
    ])
  },
  delete(id: string) {
    return prisma.checkIn.delete({ where: { id } })
  },
}

// ── 审计日志 ────────────────────────

export const auditLogRepo = {
  findPaginated(page: number, limit: number, action?: string) {
    const skip = (page - 1) * limit
    const where = action ? { action } : {}
    return Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { user: { select: { id: true, username: true, avatar: true } } },
      }),
      prisma.auditLog.count({ where }),
    ])
  },
}

// ── 举报 ────────────────────────────

export const reportRepo = {
  findGameReports() {
    return prisma.gameReport.findMany({
      orderBy: { createdAt: "desc" },
      include: { game: { select: { id: true, title: true } } },
      take: 50,
    })
  },
  findResourceReports() {
    return prisma.resourceReport.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        resource: { select: { id: true, resourceName: true, gameId: true, game: { select: { title: true } } } },
        user: { select: { id: true, username: true } },
      },
      take: 50,
    })
  },
}

// ── 管理后台统计 ────────────────────

export const adminStatsRepo = {
  async getCounts() {
    const [reports, unpublishedGames] = await Promise.all([
      prisma.gameReport.count(),
      prisma.game.count({ where: { isPublished: false } }),
    ])
    return { reports, unpublishedGames }
  },
}

// ── 管理后台游戏 ────────────────────

export const adminGameRepo = {
  findPaginated(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit
    const where = search
      ? { title: { contains: search, mode: "insensitive" as const } }
      : {}
    return Promise.all([
      prisma.game.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: {
          id: true, serialId: true, title: true, originalWork: true, coverImage: true,
          isPublished: true, isNsfw: true, status: true, viewCount: true,
          favoriteCount: true, createdAt: true, updatedAt: true,
          publisher: { select: { id: true, username: true } },
          tags: { take: 3, select: { tag: { select: { name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
    ])
  },
  findById(id: string) {
    return prisma.game.findUnique({
      where: { id },
      include: {
        publisher: { select: { id: true, username: true } },
        tags: { include: { tag: true } },
        creators: { include: { creator: true } },
      },
    })
  },
  async exists(id: string): Promise<boolean> {
    return !!(await prisma.game.findUnique({ where: { id }, select: { id: true } }))
  },
  update(id: string, data: Prisma.GameUpdateInput) {
    return prisma.game.update({ where: { id }, data })
  },
  delete(id: string) {
    return prisma.game.delete({ where: { id } })
  },
  batchDelete(ids: string[]) {
    return prisma.$transaction([
      prisma.gameTag.deleteMany({ where: { gameId: { in: ids } } }),
      prisma.comment.deleteMany({ where: { gameId: { in: ids } } }),
      prisma.favorite.deleteMany({ where: { gameId: { in: ids } } }),
      prisma.game.deleteMany({ where: { id: { in: ids } } }),
    ])
  },
  findLogs(gameId: string) {
    return prisma.gameLog.findMany({
      where: { gameId },
      orderBy: { createdAt: "desc" },
    })
  },
  createLog(gameId: string, content: string) {
    return prisma.gameLog.create({ data: { gameId, content } })
  },
}

// ── 管理后台审核 ────────────────────

export const adminReviewRepo = {
  findPending(take = 50) {
    return prisma.game.findMany({
      where: { isPublished: false },
      orderBy: { createdAt: "asc" },
      take,
      select: {
        id: true, serialId: true, title: true, originalWork: true, coverImage: true,
        createdAt: true, rejectReason: true,
        publisher: { select: { id: true, username: true, avatar: true } },
        tags: { select: { tag: { select: { name: true, color: true } } } },
      },
    })
  },
  approve(gameId: string, reviewerId: string) {
    return prisma.game.update({
      where: { id: gameId },
      data: { isPublished: true, publishedAt: new Date(), reviewedBy: reviewerId, reviewedAt: new Date() },
    })
  },
  reject(gameId: string, reason: string, reviewerId: string) {
    return prisma.game.update({
      where: { id: gameId },
      data: { isPublished: false, rejectReason: reason, reviewedBy: reviewerId, reviewedAt: new Date() },
    })
  },
}

// ── 管理后台论坛 ────────────────────

export const adminForumRepo = {
  findPostsPaginated(page: number, limit: number) {
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.forumPost.findMany({
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: { user: { select: { id: true, username: true, avatar: true } } },
      }),
      prisma.forumPost.count(),
    ])
  },
  deletePost(id: string) {
    return prisma.$transaction([
      prisma.forumComment.deleteMany({ where: { postId: id } }),
      prisma.forumPostLike.deleteMany({ where: { postId: id } }),
      prisma.forumPost.delete({ where: { id } }),
    ])
  },
}

// ── 管理后台用户 ────────────────────

export const adminUserRepo = {
  findPaginated(page: number, limit: number, search?: string) {
    const skip = (page - 1) * limit
    const where = search
      ? { OR: [{ username: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
      : {}
    return Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        select: { id: true, serialId: true, username: true, email: true, avatar: true, role: true, createdAt: true, _count: { select: { comments: true, favorites: true, forumPosts: true } } },
      }),
      prisma.user.count({ where }),
    ])
  },
  findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: { id: true, serialId: true, username: true, email: true, avatar: true, bio: true, role: true, createdAt: true, _count: { select: { comments: true, favorites: true, forumPosts: true, checkIns: true } } },
    })
  },
  findBasic(id: string) {
    return prisma.user.findUnique({ where: { id }, select: { id: true, role: true } })
  },
  updateRole(id: string, role: Prisma.UserUpdateInput["role"]) {
    return prisma.user.update({ where: { id }, data: { role } })
  },
  delete(id: string) {
    return prisma.$transaction([
      prisma.game.updateMany({ where: { reviewedBy: id }, data: { reviewedBy: null } }),
      prisma.user.delete({ where: { id } }),
    ])
  },
}

// ── 管理后台搜索 ────────────────────

export const adminSearchRepo = {
  async search(query: string) {
    const [games, users, forumPosts] = await Promise.all([
      prisma.game.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        take: 5,
        select: { id: true, serialId: true, title: true, coverImage: true },
      }),
      prisma.user.findMany({
        where: { username: { contains: query, mode: "insensitive" } },
        take: 5,
        select: { id: true, username: true, avatar: true },
      }),
      prisma.forumPost.findMany({
        where: { title: { contains: query, mode: "insensitive" } },
        take: 5,
        select: { id: true, title: true },
      }),
    ])
    return { games, users, forumPosts }
  },
}

