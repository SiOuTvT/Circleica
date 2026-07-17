import { withHandler, json, created } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminPlaylistService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await adminPlaylistService.getAll())
})

export const POST = withHandler(async (req) => {
  await requireAdminRole()
  const { name } = await req.json()
  return created(await adminPlaylistService.create(name))
})
