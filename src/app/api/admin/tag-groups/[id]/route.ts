import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagGroupService } from "@/services/admin"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await tagGroupService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()
  return json(await tagGroupService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await tagGroupService.delete(id)
  return noContent()
})

// Force-delete: unassigns tags from group before deleting
export const PATCH = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { forceDelete } = await req.json()
  if (!forceDelete) {
    throw new Error("无效操作")
  }
  return json(await tagGroupService.forceDelete(id))
})
