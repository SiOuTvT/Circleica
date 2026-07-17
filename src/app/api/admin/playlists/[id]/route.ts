import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminPlaylistService } from "@/services/admin"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminPlaylistService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { name } = await req.json()
  return json(await adminPlaylistService.update(id, name))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await adminPlaylistService.delete(id)
  return noContent()
})
