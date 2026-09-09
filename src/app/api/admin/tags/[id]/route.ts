import { NextResponse } from "next/server"
import { withHandler, json, noContent, safeParseJson } from "@/lib/api-handler"
import { requireSiteAdmin } from "@/lib/auth-context"
import { tagService } from "@/services/admin"
import { ValidationError } from "@/lib/errors"

export const PUT = withHandler(async (req, ctx) => {
  await requireSiteAdmin("circleica")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)
  return json(await tagService.update(id, body))
})

export const DELETE = withHandler(async (_req, ctx) => {
  await requireSiteAdmin("circleica")
  const { id } = await ctx!.params
  // 二段式删除：被游戏引用时先回 409 + confirm，前端弹二次确认后再走 PATCH forceDelete。
  // confirm / gameCount / error 必须放在响应体顶层——apiClient 成功与失败都是按顶层取的。
  const [tag, gameCount] = await Promise.all([tagService.getById(id), tagService.countGames(id)])
  if (gameCount > 0) {
    return NextResponse.json(
      {
        success: false,
        code: "CONFIRM_DELETE",
        error: `「${tag.name}」正被 ${gameCount} 部游戏使用，删除会同时从这些游戏上移除该标签`,
        gameCount,
        confirm: true,
      },
      { status: 409 },
    )
  }
  await tagService.delete(id)
  return noContent()
})

// Force-delete / assign-group
export const PATCH = withHandler(async (req, ctx) => {
  await requireSiteAdmin("circleica")
  const { id } = await ctx!.params
  const body = await safeParseJson(req)

  if (body.forceDelete) {
    return json(await tagService.forceDelete(id))
  }

  if (body.groupId !== undefined) {
    return json(await tagService.assignGroup(id, body.groupId))
  }

  throw new ValidationError("无效操作")
})
