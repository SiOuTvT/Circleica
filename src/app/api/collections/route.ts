import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { collectionService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const collections = await collectionService.getByUserId(userId)
  return json(collections)
})

export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "collection-create")
  if (!rl.success) throw new RateLimitError()
  const body = await safeParseJson(req)
  const collection = await collectionService.create(userId, body)
  return created(collection)
})
