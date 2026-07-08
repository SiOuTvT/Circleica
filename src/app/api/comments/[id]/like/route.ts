import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const result = await commentService.toggleLike(userId, id)
  return json(result)
})
