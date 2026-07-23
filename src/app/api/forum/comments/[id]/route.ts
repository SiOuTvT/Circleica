import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"
import { hasRole } from "@/lib/permissions"

export const PUT = withHandler(async (req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const isAdmin = hasRole(auth.role, "ADMIN")
  const comment = await forumService.updateComment(auth.userId, id, body.content, isAdmin)
  return json(comment)
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAuth()
  const { id } = await ctx!.params
  // 管理员可删除任意评论；普通用户仅能删除自己的（M17）
  const isAdmin = hasRole(auth.role, "ADMIN")
  await forumService.deleteComment(auth.userId, id, isAdmin)
  return noContent()
})
