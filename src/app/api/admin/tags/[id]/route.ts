import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { tagService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()
  return json(await tagService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await tagService.delete(id)
  return noContent()
})

// Force-delete / assign-group
export const PATCH = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()

  if (body.forceDelete) {
    return json(await tagService.forceDelete(id))
  }

  if (body.groupId !== undefined) {
    return json(await tagService.assignGroup(id, body.groupId))
  }

  throw new ValidationError("无效操作")
})
