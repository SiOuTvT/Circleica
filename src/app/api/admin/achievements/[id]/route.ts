import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { achievementService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await achievementService.update(id, body))
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole("SUPER_ADMIN")
  const { id } = await ctx!.params
  await achievementService.delete(id)
  return noContent()
})
