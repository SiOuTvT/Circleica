import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const { vndbId } = await safeParseJson(req)

  if (!vndbId) {
    throw new AppError("请提供 VNDB ID", "VALIDATION_ERROR", 422)
  }

  // 从 VNDB 自动填充信息
  const data = await vndbClient.autoFillFromVNDB(vndbId)

  if (!data) {
    throw new AppError("未找到该 VNDB ID 对应的作品", "NOT_FOUND", 404)
  }

  return json({
    title: data.title,
    original: data.original,
    tags: data.tags,
    creators: data.creators,
    message: "成功从 VNDB 获取信息",
  })
})
