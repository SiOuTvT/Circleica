import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { vndbClient } from "@/lib/vndb"
import { vndbAdapter } from "@/lib/galvelica/sources"
import { adminGameService } from "@/services/admin"

export const POST = withHandler(async (req) => {
  const auth = await requireAdminRole()

  const { vndbIds } = await safeParseJson(req)

  if (!vndbIds || !Array.isArray(vndbIds) || vndbIds.length === 0) {
    throw new AppError("请提供 VNDB ID 列表", "VALIDATION_ERROR", 422)
  }

  const results: { vndbId: string; status: string; reason?: string; gameId?: string }[] = []
  let successCount = 0
  let failCount = 0

  for (const vndbId of vndbIds) {
    try {
      // 验证是否为同人作品
      const validation = await vndbClient.validateDoujinWork(vndbId)

      if (!validation.isValid) {
        results.push({ vndbId, status: "failed", reason: "未找到作品" })
        failCount++
        continue
      }

      // 检查是否已存在
      const existing = await prisma.game.findFirst({
        where: { vndbId: String(vndbId) },
      })

      if (existing) {
        results.push({ vndbId, status: "skipped", reason: "已存在" })
        continue
      }

      // 经 Galvelica 源适配器拉取并归一化（与 /api/admin/vndb 共用同一套逻辑）
      const payload = await vndbAdapter.fetchByExternalId(String(vndbId))
      if (!payload) {
        results.push({ vndbId, status: "failed", reason: "获取信息失败" })
        failCount++
        continue
      }
      const norm = vndbAdapter.normalize(payload)
      if (!norm.title) {
        results.push({ vndbId, status: "failed", reason: "获取信息失败" })
        failCount++
        continue
      }

      // 构造与草稿表单提交相同的 DTO，复用统一的 Save Service（adminGameService.create）。
      // 这样批量导入与草稿导入共用「Normalize → Draft → Save」同一套管道，
      // 不再维护两套保存逻辑；Creator 关联 / 事务原子性 / 字段落库与草稿流完全一致。
      const game = await adminGameService.create(
        {
          title: norm.title,
          originalWork: norm.originalWork ?? "",
          englishName: norm.englishName ?? "",
          aliases: (norm.aliases ?? []).join(", "),
          releaseDate: norm.releaseDate ?? null,
          description: norm.description ?? "",
          studioName: norm.studioName ?? "",
          coverImage: norm.coverImage ?? "",
          vndbId: String(vndbId),
          isPublished: false, // 默认不发布，需要管理员审核
          tagNames: (norm.tags ?? []).map((t) => t.name),
          creators: (norm.creators ?? []).map((c) => ({
            vndbId: c.sourceId ?? "",
            name: c.name,
            nameJa: c.nameJa ?? "",
            role: c.role,
          })),
        },
        auth.userId,
      )

      results.push({ vndbId, status: "success", gameId: game.id })
      successCount++
    } catch (error) {
      logger.db.error(`Failed to import VNDB ${vndbId}`, error)
      results.push({ vndbId, status: "failed", reason: String(error) })
      failCount++
    }
  }

  return json({
    message: `导入完成：成功 ${successCount}，失败 ${failCount}`,
    results,
    successCount,
    failCount,
  })
})
