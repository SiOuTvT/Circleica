import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminMusicService } from "@/services/admin"

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()
  return json(await adminMusicService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await adminMusicService.delete(id)
  return noContent()
})
