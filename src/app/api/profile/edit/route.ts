import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"

export const PUT = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await req.json()
  const updated = await userService.updateProfile(userId, body)
  return json(updated)
})
