import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminUserService } from "@/services/admin"

export const GET = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminUserService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  // 角色管理属于超级管理员专属操作：只有 SUPER_ADMIN 可以修改任何用户角色，
  // 避免 ADMIN 自行提升其他用户为 ADMIN（权限提升）。
  const auth = await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await adminUserService.updateRole(id, body.role, auth.role))
})

export const DELETE = withHandler(async (_req, ctx) => {
  const auth = await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  await adminUserService.delete(id, auth.role, auth.userId)
  return noContent()
})
