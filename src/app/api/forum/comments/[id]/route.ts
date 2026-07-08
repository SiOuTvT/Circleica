import { withHandler, noContent } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"

export const DELETE = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  await forumService.deleteComment(userId, id)
  return noContent()
})
