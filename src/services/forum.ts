/**
 * 论坛 Service — 论坛业务逻辑
 */

import { forumRepo } from "@/repositories/forum"
import { notificationRepo } from "@/repositories/user"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"
import { forumPostSchema, forumCommentSchema } from "@/lib/validations"
import { FORUM } from "@/lib/config"
import type { ForumPostCategory } from "@prisma/client"

export const forumService = {
  getPosts(page: number, category?: string, solved?: string) {
    return forumRepo.findPostsPaginated(page, FORUM.POSTS_PER_PAGE, category, solved)
  },

  async getPost(id: string) {
    const post = await forumRepo.findPostById(id)
    if (!post) throw new NotFoundError("帖子")
    return post
  },

  async viewPost(id: string) {
    await forumRepo.incrementPostView(id)
    return this.getPost(id)
  },

  async createPost(userId: string, raw: Record<string, unknown>) {
    // Zod 验证
    const parsed = forumPostSchema.parse(raw)

    // 保留手动校验作为额外保护层
    if (!raw.title?.toString().trim()) throw new ValidationError("标题不能为空")
    if (!raw.content?.toString().trim()) throw new ValidationError("内容不能为空")
    if (String(raw.title).length > FORUM.POST_TITLE_MAX) throw new ValidationError(`标题最多 ${FORUM.POST_TITLE_MAX} 个字符`)
    if (String(raw.content).length > FORUM.POST_CONTENT_MAX) throw new ValidationError(`内容最多 ${FORUM.POST_CONTENT_MAX} 个字符`)
    return forumRepo.createPost(userId, {
      title: parsed.title.trim(),
      content: parsed.content.trim(),
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : "",
      category: (parsed.category ?? "discussion") as ForumPostCategory,
    })
  },

  async updatePost(userId: string, postId: string, raw: Record<string, unknown>) {
    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")
    if (post.userId !== userId) throw new ForbiddenError("只能编辑自己的帖子")
    const data: Record<string, unknown> = {}
    if (raw.title !== undefined) {
      const title = String(raw.title).trim()
      if (!title) throw new ValidationError("标题不能为空")
      if (title.length > FORUM.POST_TITLE_MAX) throw new ValidationError(`标题最多 ${FORUM.POST_TITLE_MAX} 个字符`)
      data.title = title
    }
    if (raw.content !== undefined) {
      const content = String(raw.content).trim()
      if (!content) throw new ValidationError("内容不能为空")
      if (content.length > FORUM.POST_CONTENT_MAX) throw new ValidationError(`内容最多 ${FORUM.POST_CONTENT_MAX} 个字符`)
      data.content = content
    }
    return forumRepo.updatePost(postId, data)
  },

  async deletePost(userId: string, postId: string, isAdmin = false) {
    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")
    if (!isAdmin && post.userId !== userId) throw new ForbiddenError("只能删除自己的帖子")
    return forumRepo.deletePost(postId)
  },

  async toggleLike(userId: string, postId: string) {
    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")
    return forumRepo.togglePostLike(userId, postId)
  },

  async solve(userId: string, postId: string) {
    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")
    if (post.userId !== userId) throw new ForbiddenError("只有作者可以标记已解决")
    return forumRepo.markSolved(postId)
  },

  // ── 评论 ────────────────────────────

  getComments(postId: string, page: number) {
    return forumRepo.findComments(postId, page, FORUM.COMMENTS_PER_PAGE)
  },

  async createComment(userId: string, postId: string, raw: Record<string, unknown>, imageUrl?: string) {
    // Zod 验证
    const parsed = forumCommentSchema.parse(raw)
    const content = parsed.content.trim()

    // 保留手动校验作为额外保护层
    if (!content && !imageUrl) throw new ValidationError("内容不能为空")
    if (content.length > FORUM.COMMENT_MAX) throw new ValidationError(`评论最多 ${FORUM.COMMENT_MAX} 个字符`)

    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")

    const comment = await forumRepo.createComment(postId, userId, content, imageUrl)

    // 通知帖子作者
    if (post.userId !== userId) {
      notificationRepo.create({
        userId: post.userId,
        actorId: userId,
        type: "forum_comment_new",
        targetType: "forum_post",
        targetId: postId,
      }).catch(() => {})
    }

    return comment
  },

  async deleteComment(userId: string, commentId: string, isAdmin = false) {
    const comment = await forumRepo.findCommentById(commentId)
    if (!comment) throw new NotFoundError("评论")
    if (!isAdmin && comment.userId !== userId) throw new ForbiddenError("只能删除自己的评论")
    return forumRepo.deleteComment(commentId)
  },

  async toggleCommentLike(userId: string, commentId: string) {
    const comment = await forumRepo.findCommentById(commentId)
    if (!comment) throw new NotFoundError("评论")
    return forumRepo.toggleCommentLike(userId, commentId)
  },
}
