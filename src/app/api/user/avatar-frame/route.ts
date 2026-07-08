import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"

export const PUT = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await req.json()
  const frameId = body.avatarFrameId ?? null
  const result = await userService.setAvatarFrame(userId, frameId)
  return json(result)
})
