import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireSiteAdmin } from "@/lib/auth-context"
import { tagService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireSiteAdmin("circleica")
  return json(await tagService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireSiteAdmin("circleica")
  const body = await safeParseJson(req)
  return created(await tagService.create(body))
})
