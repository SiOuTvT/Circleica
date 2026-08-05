import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireSiteAdmin } from "@/lib/auth-context"
import { creatorService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const PUT = withHandler(async (req: NextRequest, ctx) => {
  await requireSiteAdmin("circleica")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await creatorService.update(id, body))
})

export const DELETE = withHandler(async (_req: NextRequest, ctx) => {
  await requireSiteAdmin("circleica")
  const { id } = await ctx!.params
  await creatorService.delete(id)
  return noContent()
})
