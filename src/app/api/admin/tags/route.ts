import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await tagService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await req.json()
  return created(await tagService.create(body))
})
