import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { resourceTagService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await resourceTagService.getAll())
})
