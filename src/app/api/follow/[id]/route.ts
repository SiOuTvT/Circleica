import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { followService } from "@/services/user"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id: targetUserId } = await ctx!.params
  const result = await followService.toggle(userId, targetUserId)
  return json(result)
})
