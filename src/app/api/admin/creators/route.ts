import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireSiteAdmin } from "@/lib/auth-context"
import { creatorService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async () => {
  await requireSiteAdmin("circleica")
  return json(await creatorService.getAll())
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireSiteAdmin("circleica")
  const body = await safeParseJson(req)
  return created(await creatorService.create(body))
})
