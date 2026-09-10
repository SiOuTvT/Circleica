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

  // 显式白名单：不做 trim/大小写归一化，拼写错误要 422 报出来而不是静默落到 reject。
  // 否则 action 缺失或写成 "Approve"/"approve " 都会走 else，把一部已发布游戏改成拒回。
  if (body.action === "approve") {
    return json(await adminReviewService.approve(body.gameId, auth.userId))
  } else if (body.action === "reject") {
    return json(await adminReviewService.reject(body.gameId, body.reason, auth.userId))
  } else {
    throw new ValidationError("action 只能是 approve 或 reject")
  }
})
