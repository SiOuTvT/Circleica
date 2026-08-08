import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"

export const POST = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { frameId } = await ctx!.params
  const result = await userService.purchaseAvatarFrame(userId, frameId)
  return json(result)
})
