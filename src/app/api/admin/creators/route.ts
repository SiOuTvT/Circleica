import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { creatorService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await creatorService.getAll())
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const body = await safeParseJson(req)
  return created(await creatorService.create(body))
})
