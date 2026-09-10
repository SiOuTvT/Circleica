import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminReviewService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"

export const GET = withHandler(async () => {
  await requireAdminRole()
  return json(await adminReviewService.getPending())
})

export const POST = withHandler(async (req) => {
  const auth = await requireAdminRole()
  const body = await safeParseJson(req)

  // gameId 会直接进 prisma 的 where，缺失/非字符串会变成 500
  if (typeof body.gameId !== "string" || !body.gameId) throw new ValidationError("缺少游戏 id")

  if (body.action === "approve") {
    return json(await adminReviewService.approve(body.gameId, auth.userId))
  } else {
    return json(await adminReviewService.reject(body.gameId, body.reason, auth.userId))
  }
})
