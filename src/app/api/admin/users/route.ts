import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminUserService } from "@/services/admin"

export const GET = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const search = req.nextUrl.searchParams.get("search")?.trim() || undefined
  return json(await adminUserService.getPaginated(page, search))
})
