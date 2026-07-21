import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagGroupService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await tagGroupService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  return created(await tagGroupService.create(body))
})
