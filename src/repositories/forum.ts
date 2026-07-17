/**
 * 论坛 Repository — 论坛帖子/评论数据访问
 */

import { prisma } from "@/lib/prisma"
import type { Prisma, ForumCategory } from "@prisma/client"

export const forumRepo = {
  // ── 帖子 ────────────────────────────

  findPostsPaginated(page: number, limit: number, category?: string, solved?: string) {
    const skip = (page - 1) * limit
    const where: Prisma.ForumPostWhereInput = {}
    if (category) where.category = category as ForumCategory
    if (solved === "true") where.isSolved = true
    if (solved === "false") where.isSolved = false

    return Promise.all([
      prisma.forumPost.findMany({
        where,
        orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
        skip, take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true, avatarFrameId: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.forumPost.count({ where }),
    ])
  },

  findPostById(id: string) {
    return prisma.forumPost.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, username: true, avatar: true, avatarFrameId: true, serialId: true } },
        likes: { select: { userId: true } },
      },
    })
  },

  incrementPostView(id: string) {
    return prisma.forumPost.update({ where: { id }, data: { viewCount: { increment: 1 } } })
  },

  createPost(userId: string, data: { title: string; content: string; imageUrl?: string; category?: ForumCategory }) {
    return prisma.forumPost.create({
      data: { userId, ...data },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
  },

  updatePost(id: string, data: Prisma.ForumPostUpdateInput) {
    return prisma.forumPost.update({ where: { id }, data })
  },

  deletePost(id: string) {
    return prisma.$transaction([
      prisma.forumComment.deleteMany({ where: { postId: id } }),
      prisma.forumPostLike.deleteMany({ where: { postId: id } }),
      prisma.forumPost.delete({ where: { id } }),
    ])
  },

  togglePostLike(userId: string, postId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.forumPostLike.findUnique({
        where: { userId_postId: { userId, postId } },
      })
      if (existing) {
        await tx.forumPostLike.delete({ where: { id: existing.id } })
        await tx.forumPost.update({ where: { id: postId }, data: { likeCount: { decrement: 1 } } })
        return { liked: false }
      } else {
        await tx.forumPostLike.create({ data: { userId, postId } })
        await tx.forumPost.update({ where: { id: postId }, data: { likeCount: { increment: 1 } } })
        return { liked: true }
      }
    })
  },

  markSolved(id: string) {
    return prisma.forumPost.update({ where: { id }, data: { isSolved: true } })
  },

  // ── 评论 ────────────────────────────

  findComments(postId: string, page: number, limit: number) {
    const skip = (page - 1) * limit
    return Promise.all([
      prisma.forumComment.findMany({
        where: { postId },
        orderBy: { createdAt: "asc" },
        skip, take: limit,
        include: {
          user: { select: { id: true, username: true, avatar: true, avatarFrameId: true } },
          likes: { select: { userId: true } },
        },
      }),
      prisma.forumComment.count({ where: { postId } }),
    ])
  },

  findCommentById(id: string) {
    return prisma.forumComment.findUnique({
      where: { id },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
  },

  createComment(postId: string, userId: string, content: string, imageUrl?: string) {
    return prisma.forumComment.create({
      data: { postId, userId, content, imageUrl: imageUrl || "" },
      include: { user: { select: { id: true, username: true, avatar: true } } },
    })
  },

  deleteComment(id: string) {
    return prisma.$transaction([
      prisma.forumCommentLike.deleteMany({ where: { commentId: id } }),
      prisma.forumComment.delete({ where: { id } }),
    ])
  },

  toggleCommentLike(userId: string, commentId: string) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.forumCommentLike.findUnique({
        where: { userId_commentId: { userId, commentId } },
      })
      if (existing) {
        await tx.forumCommentLike.delete({ where: { id: existing.id } })
        await tx.forumComment.update({ where: { id: commentId }, data: { likeCount: { decrement: 1 } } })
        return { liked: false }
      } else {
        await tx.forumCommentLike.create({ data: { userId, commentId } })
        await tx.forumComment.update({ where: { id: commentId }, data: { likeCount: { increment: 1 } } })
        return { liked: true }
      }
    })
  },
}
