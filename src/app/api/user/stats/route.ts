import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const stats = await userService.getStats(userId)
  return json(stats)
})
