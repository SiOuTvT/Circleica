import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { hasRole } from "@/lib/permissions"

export const GET = withHandler(async (_req, ctx) => {
  const { id } = await ctx!.params
  const post = await forumService.viewPost(id)
  return json(post)
})

export const PUT = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const post = await forumService.updatePost(userId, id, body)
  return json(post)
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  // 管理员可删除任意帖子；普通用户仅能删除自己的（M17）
  const isAdmin = hasRole(auth.role, "ADMIN")
  await forumService.deletePost(auth.userId, id, isAdmin)
  return noContent()
})
