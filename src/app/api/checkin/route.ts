import { withHandler, json } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { checkinService } from "@/services/user"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const status = await checkinService.getStatus(userId)
  return json(status)
})

export const POST = withHandler(async () => {
  const { userId } = await requireAuth()
  const result = await checkinService.checkIn(userId)
  return json(result)
})
