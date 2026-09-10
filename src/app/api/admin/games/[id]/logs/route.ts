import { withHandler, json, created, noContent, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { adminGameService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"
import type { NextRequest } from "next/server"

export const GET = withHandler(async (_req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  return json(await adminGameService.getLogs(id))
})

export const POST = withHandler(async (req, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { content } = await safeParseJson(req)
  return created(await adminGameService.createLog(id, content))
})

/**
 * 删除一条更新日志。
 * 前端调用方式保持不变：DELETE /api/admin/games/{gameId}/logs + body { logId }。
 * 归属校验（logId 必须属于该 gameId）在 adminGameService.deleteLog 里做。
 */
export const DELETE = withHandler(async (req: NextRequest, ctx) => {
  await requireAdminRole()
  const { id } = await ctx!.params
  const { logId } = await safeParseJson(req)
  if (typeof logId !== "string" || !logId) throw new ValidationError("缺少日志 id")
  await adminGameService.deleteLog(id, logId)
  return noContent()
})
