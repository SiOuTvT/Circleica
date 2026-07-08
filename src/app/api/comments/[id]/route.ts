import { withHandler, noContent } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { commentService } from "@/services/user"

export const DELETE = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  await commentService.delete(userId, id)
  return noContent()
})
