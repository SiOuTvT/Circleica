import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminGameService } from "@/services/admin"

export const POST = withHandler(async (req) => {
  await requireAdminRole("SUPER_ADMIN")
  const { ids } = await safeParseJson(req)
  return json(await adminGameService.batchDelete(ids))
})
