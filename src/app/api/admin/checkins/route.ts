import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminCheckinService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  return json(await adminCheckinService.getPaginated(page))
})

export const DELETE = withHandler(async (req) => {
  await requireAdminRole()
  const { id } = await safeParseJson(req)
  await adminCheckinService.delete(id)
  return noContent()
})
