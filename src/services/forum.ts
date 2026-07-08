/**
 * 论坛 Service — 论坛业务逻辑
 */

import { forumRepo } from "@/repositories/forum"
import { notificationRepo } from "@/repositories/user"
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors"

export const forumService = {
  getPosts(page: number, category?: string, solved?: string) {
    return forumRepo.findPostsPaginated(page, 20, category, solved)
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
    if (!raw.title?.toString().trim()) throw new ValidationError("标题不能为空")
    if (!raw.content?.toString().trim()) throw new ValidationError("内容不能为空")
    if (String(raw.title).length > 200) throw new ValidationError("标题最多 200 个字符")
    if (String(raw.content).length > 10000) throw new ValidationError("内容最多 10000 个字符")
    return forumRepo.createPost(userId, {
      title: String(raw.title).trim(),
      content: String(raw.content).trim(),
      imageUrl: raw.imageUrl ? String(raw.imageUrl) : "",
      category: raw.category ? String(raw.category) : "discussion",
    })
  },

  async updatePost(userId: string, postId: string, raw: Record<string, unknown>) {
    const post = await forumRepo.findPostById(postId)
    if (!post) throw new NotFoundError("帖子")
    if (post.userId !== userId) throw new ForbiddenError("只能编辑自己的帖子")
    const data: Record<string, unknown> = {}
    if (raw.title) data.title = String(raw.title).trim()
    if (raw.content) data.content = String(raw.content).trim()
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
    return forumRepo.findComments(postId, page, 50)
  },

  async createComment(userId: string, postId: string, raw: Record<string, unknown>, imageUrl?: string) {
    const content = raw.content ? String(raw.content).trim() : ""
    if (!content && !imageUrl) throw new ValidationError("内容不能为空")
    if (content.length > 2000) throw new ValidationError("评论最多 2000 个字符")

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
