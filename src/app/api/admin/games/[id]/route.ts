import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminGameService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminGameService.getById(id))
})

export const PUT = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await adminGameService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  await adminGameService.delete(id)
  return noContent()
})
