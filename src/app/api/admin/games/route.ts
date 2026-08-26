import { withHandler, json, created, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminGameService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = Math.min(100, Math.max(1, parseInt(req.nextUrl.searchParams.get("limit") || "20")))
  const search = req.nextUrl.searchParams.get("search") || undefined
  const [games, count] = await adminGameService.getPaginated(page, limit, search)
  return paginated(games, { page, pageSize: limit, total: count })
})

export const POST = withHandler(async (req) => {
  const auth = await requireAdminRole()
  const body = await safeParseJson(req)
  const game = await adminGameService.create(body, auth.userId)
  return created(game)
})
