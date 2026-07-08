import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { forumService } from "@/services/forum"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const result = await forumService.toggleCommentLike(userId, id)
  return json(result)
})
