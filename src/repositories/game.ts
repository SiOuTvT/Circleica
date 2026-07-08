/**
 * 游戏 Repository — 游戏相关数据访问
 */

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@prisma/client"

export const gameRepo = {
  findPaginated(page: number, limit: number, filters?: {
    q?: string; sort?: string; tag?: string; isNsfw?: boolean
  }) {
    const skip = (page - 1) * limit
    const where: Prisma.GameWhereInput = { isPublished: true }
    if (filters?.q) where.title = { contains: filters.q, mode: "insensitive" }
    if (filters?.isNsfw === false) where.isNsfw = false
    if (filters?.tag) where.tags = { some: { tag: { name: filters.tag } } }

    const orderBy = filters?.sort === "popular"
      ? { viewCount: "desc" as const }
      : filters?.sort === "rating"
      ? { favoriteCount: "desc" as const }
      : { createdAt: "desc" as const }

    return Promise.all([
      prisma.game.findMany({
        where, orderBy, skip, take: limit,
        include: {
          publisher: { select: { id: true, username: true, avatar: true } },
          tags: { take: 3, select: { tag: { select: { id: true, name: true, color: true } } } },
        },
      }),
      prisma.game.count({ where }),
    ])
  },

  findById(id: string) {
    return prisma.game.findUnique({
      where: { id },
      include: {
        publisher: { select: { id: true, username: true, avatar: true } },
        tags: { include: { tag: true } },
        creators: { include: { creator: true } },
        resources: {
          where: { isReported: false },
          include: { entries: true, user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  },

  findBySerialId(serialId: number) {
    return prisma.game.findFirst({
      where: { serialId },
      include: {
        publisher: { select: { id: true, username: true, avatar: true } },
        tags: { include: { tag: true } },
        creators: { include: { creator: true } },
        resources: {
          where: { isReported: false },
          include: { entries: true, user: { select: { id: true, username: true } } },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  },

  findByVndbId(vndbId: string) {
    return prisma.game.findFirst({ where: { vndbId } })
  },

  incrementViewCount(id: string) {
    return prisma.game.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  },

  batchIncrementViewCount(ids: string[]) {
    return prisma.$transaction(
      ids.map(id => prisma.game.update({ where: { id }, data: { viewCount: { increment: 1 } } }))
    )
  },

  findRandom(limit: number) {
    return prisma.$queryRawUnsafe<any[]>(
      `SELECT id, "serialId", title, "coverImage", "viewCount" FROM "Game" WHERE "isPublished" = true ORDER BY RANDOM() LIMIT $1`,
      limit,
    )
  },

  findFeatured(limit: number) {
    return prisma.game.findMany({
      where: { isPublished: true },
      orderBy: { viewCount: "desc" },
      take: limit,
      include: {
        tags: { take: 3, select: { tag: { select: { name: true, color: true } } } },
      },
    })
  },

  // ── 收藏 ────────────────────────────

  isFavorited(userId: string, gameId: string) {
    return prisma.favorite.findUnique({ where: { userId_gameId: { userId, gameId } } })
  },

  addFavorite(userId: string, gameId: string, collectionId?: string) {
    return prisma.$transaction([
      prisma.favorite.create({ data: { userId, gameId, collectionId } }),
      prisma.game.update({ where: { id: gameId }, data: { favoriteCount: { increment: 1 } } }),
    ])
  },

  removeFavorite(userId: string, gameId: string) {
    return prisma.$transaction([
      prisma.favorite.delete({ where: { userId_gameId: { userId, gameId } } }),
      prisma.game.update({ where: { id: gameId }, data: { favoriteCount: { decrement: 1 } } }),
    ])
  },

  // ── 游玩状态 ────────────────────────

  getPlayStatus(userId: string, gameId: string) {
    return prisma.playStatus.findUnique({ where: { userId_gameId: { userId, gameId } } })
  },

  setPlayStatus(userId: string, gameId: string, status: string) {
    return prisma.playStatus.upsert({
      where: { userId_gameId: { userId, gameId } },
      update: { status },
      create: { userId, gameId, status },
    })
  },

  // ── 评分 ────────────────────────────

  getRating(userId: string, gameId: string) {
    return prisma.gameRating.findUnique({ where: { gameId_userId: { gameId, userId } } })
  },

  setRating(userId: string, gameId: string, score: number) {
    return prisma.gameRating.upsert({
      where: { gameId_userId: { gameId, userId } },
      update: { score },
      create: { userId, gameId, score },
    })
  },

  getRatingStats(gameId: string) {
    return prisma.gameRating.aggregate({
      where: { gameId },
      _avg: { score: true },
      _count: { score: true },
    })
  },

  // ── 评论 ────────────────────────────

  findComments(gameId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.comment.findMany({
        where: { gameId, parentId: null },
        orderBy: { createdAt: "desc" },
        skip, take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true, avatarFrameId: true } },
          replies: {
            include: { user: { select: { id: true, username: true, avatar: true } } },
            orderBy: { createdAt: "asc" },
          },
          likes: { select: { userId: true } },
        },
      }),
      prisma.comment.count({ where: { gameId, parentId: null } }),
    ])
  },

  createComment(userId: string, gameId: string, content: string, imageUrl?: string, parentId?: string) {
    return prisma.comment.create({
      data: { userId, gameId, content, imageUrl: imageUrl || "", parentId },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
  },

  // ── 举报 ────────────────────────────

  report(userId: string, gameId: string, ip: string, reason: string) {
    return prisma.gameReport.upsert({
      where: { gameId_ip: { gameId, ip } },
      update: {},
      create: { gameId, ip, reason },
    })
  },

  // ── 资源 ────────────────────────────

  findResources(gameId: string) {
    return prisma.gameResource.findMany({
      where: { gameId },
      include: { entries: true, user: { select: { id: true, username: true } } },
      orderBy: { createdAt: "desc" },
    })
  },

  createResource(data: any) {
    return prisma.gameResource.create({
      data,
      include: { entries: true },
    })
  },

  deleteResource(resourceId: string) {
    return prisma.gameResource.delete({ where: { id: resourceId } })
  },

  reportResource(userId: string, resourceId: string) {
    return prisma.$transaction([
      prisma.resourceReport.create({ data: { userId, resourceId } }),
      prisma.gameResource.update({ where: { id: resourceId }, data: { isReported: true, reportedAt: new Date() } }),
    ])
  },
}
