import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminUserService } from "@/services/admin"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminUserService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  const auth = await requireAdminRole()
  const { id } = await ctx!.params
  const body = await req.json()
  return json(await adminUserService.updateRole(id, body.role, auth.role))
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  await adminUserService.delete(id, auth.role, auth.userId)
  return noContent()
})
