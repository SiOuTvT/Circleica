import { withHandler, json } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { vndbClient } from "@/lib/vndb"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const { vndbId } = await req.json()

  if (!vndbId) {
    throw new AppError("请提供 VNDB ID", "VALIDATION_ERROR", 422)
  }

  // 验证 VNDB ID 格式（应该是纯数字）
  if (!/^\d+$/.test(vndbId)) {
    throw new AppError("VNDB ID 格式不正确", "VALIDATION_ERROR", 422)
  }

  // 调用 VNDB API 验证
  const result = await vndbClient.validateDoujinWork(vndbId)

  if (!result.isValid) {
    throw new AppError("未找到该 VNDB ID 对应的作品", "NOT_FOUND", 404)
  }

  // 返回验证结果
  return json({
    valid: true,
    isDoujin: result.isDoujin,
    title: result.title,
    tags: result.tags,
    message: result.isDoujin
      ? "确认为同人作品"
      : "未检测到同人标签，但仍可发布",
  })
})
