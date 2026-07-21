import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAuth } from "@/lib/auth-context"
import { collectionService } from "@/services/user"

export const GET = withHandler(async () => {
  const { userId } = await requireAuth()
  const collections = await collectionService.getByUserId(userId)
  return json(collections)
})

export const POST = withHandler(async (req) => {
  const { userId } = await requireAuth()
  const body = await safeParseJson(req)
  const collection = await collectionService.create(userId, body)
  return created(collection)
})
