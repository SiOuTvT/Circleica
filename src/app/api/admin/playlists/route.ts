import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminPlaylistService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await adminPlaylistService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const { name } = await safeParseJson(req)
  return created(await adminPlaylistService.create(name))
})
