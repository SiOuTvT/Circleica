import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { checkAchievements } from "@/lib/achievements"

export const POST = withHandler(async () => {
  const { userId } = await requireAuth()
  const unlocked = await checkAchievements(userId)
  return json({ unlocked })
})
