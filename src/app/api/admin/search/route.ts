import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminSearchService } from "@/services/admin"

export const GET = withHandler(async (req) => {
  await requireAdminRole()
  const query = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  return json(await adminSearchService.search(query))
})
