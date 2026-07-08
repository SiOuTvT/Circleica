import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { reportService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  const [gameReports, resourceReports] = await Promise.all([
    reportService.getGameReports(),
    reportService.getResourceReports(),
  ])
  return json({ gameReports, resourceReports })
})
