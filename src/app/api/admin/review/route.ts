import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminReviewService } from "@/services/admin"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await adminReviewService.getPending())
})

export const POST = withHandler(async (req) => {
  const auth = await requireAdminRole()
  const body = await req.json()

  if (body.action === "approve") {
    return json(await adminReviewService.approve(body.gameId, auth.userId))
  } else {
    return json(await adminReviewService.reject(body.gameId, body.reason, auth.userId))
  }
})
