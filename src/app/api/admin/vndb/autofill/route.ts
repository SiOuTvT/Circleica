import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { vndbAdapter } from "@/lib/galvelica/sources"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

  const { vndbId } = await safeParseJson(req)

  if (!vndbId) {
    throw new AppError("请提供 VNDB ID", "VALIDATION_ERROR", 422)
  }

  // 经 Galvelica 源适配器拉取并归一化（与 /api/admin/vndb 共用同一套归一化逻辑）
  const payload = await vndbAdapter.fetchByExternalId(vndbId)
  if (!payload) {
    throw new AppError("未找到该 VNDB ID 对应的作品", "NOT_FOUND", 404)
  }

  const norm = vndbAdapter.normalize(payload)
  if (!norm.title) {
    throw new AppError("未找到该 VNDB ID 对应的作品", "NOT_FOUND", 404)
  }

  return json({
    title: norm.title,
    original: norm.originalWork ?? "",
    tags: (norm.tags ?? []).map((t) => t.name),
    creators: (norm.creators ?? []).map((c) => ({
      vndbId: c.sourceId ?? "",
      name: c.name,
      nameJa: c.nameJa ?? "",
      role: c.role,
    })),
    message: "成功从 VNDB 获取信息",
  })
})
