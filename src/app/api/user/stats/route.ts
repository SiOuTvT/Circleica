import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { userService } from "@/services/user"

export const GET = withHandler(async () => {
  const auth = await requireAuth().catch(() => null)
  if (!auth) return json({ totalMarks: 0 })
  const stats = await userService.getStats(auth.userId)
  return json(stats)
})
