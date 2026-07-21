import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagGroupService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await tagGroupService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
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
  const { forceDelete } = await safeParseJson(req)
  if (!forceDelete) {
    throw new ValidationError("无效操作")
  }
  return json(await tagGroupService.forceDelete(id))
})
