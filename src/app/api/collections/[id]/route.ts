import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { collectionService } from "@/services/user"
import { checkRateLimit, rateLimits } from "@/lib/rate-limit"
import { RateLimitError } from "@/lib/errors"

export const GET = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const { id } = await ctx!.params
  const collection = await collectionService.getById(id, userId)
  return json(collection)
})

export const PUT = withHandler(async (req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "collection-update")
  if (!rl.success) throw new RateLimitError()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  const collection = await collectionService.update(userId, id, body)
  return json(collection)
})

export const DELETE = withHandler(async (_req, ctx) => {
  const { userId } = await requireAuth()
  const rl = await checkRateLimit(rateLimits.interact, "collection-delete")
  if (!rl.success) throw new RateLimitError()
  const { id } = await ctx!.params
  await collectionService.delete(userId, id)
  return noContent()
})
