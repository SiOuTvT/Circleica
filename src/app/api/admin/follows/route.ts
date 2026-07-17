import { withHandler, json, noContent } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminFollowService } from "@/services/admin"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (req: NextRequest) => {
  await requireAdminRole()
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const [follows, total] = await adminFollowService.getPaginated(page)
  return json({ follows, total, page, limit: 20 })
})

export const DELETE = withHandler(async (req) => {
  await requireAdminRole()
  const { id } = await req.json()
  await adminFollowService.delete(id)
  return noContent()
})
