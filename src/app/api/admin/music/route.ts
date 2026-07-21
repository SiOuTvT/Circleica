import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminMusicService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await adminMusicService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  return created(await adminMusicService.create(body))
})
