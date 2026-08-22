import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { checkinService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async () => {
  const auth = await requireAuth().catch(() => null)
  if (!auth) return json({ checkedIn: false })
  const status = await checkinService.getStatus(auth.userId)
  return json(status)
})

export const POST = withHandler(async () => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "checkin")
  if (!rl.success) throw new RateLimitError()
  const result = await checkinService.checkIn(userId)
  return json(result)
})
