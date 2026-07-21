import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { emotionalMessageService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const category = req.nextUrl.searchParams.get("category") || undefined
  return json(await emotionalMessageService.getAll(category))
})

export const POST = withHandler(async (req: NextRequest) => {
  await requireAdminRole("SUPER_ADMIN")
  const body = await safeParseJson(req)
  return created(await emotionalMessageService.create(body))
})
