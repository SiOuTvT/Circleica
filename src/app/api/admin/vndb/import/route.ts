import { withHandler, json, safeParseJson } from "@/lib/api-handler"
import { requireAdminRole } from "@/lib/auth-context"
import { AppError } from "@/lib/errors"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { vndbClient } from "@/lib/vndb"
import { vndbAdapter } from "@/lib/galvelica/sources"
import { GameStatus } from "@prisma/client"

export const POST = withHandler(async (req) => {
  await requireAdminRole()

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
      const autoFill = {
        title: norm.title,
        original: norm.originalWork ?? "",
        tags: (norm.tags ?? []).map((t) => t.name),
      }

      // 创建游戏记录
      const game = await prisma.game.create({
        data: {
          title: autoFill.title || `VNDB #${vndbId}`,
          originalWork: autoFill.original || "",
          description: "",
          vndbId: String(vndbId),
          isPublished: false, // 默认不发布，需要管理员审核
          isNsfw: false,
          status: GameStatus.FINISHED,
          favoriteCount: 0,
          viewCount: 0,
          coverImage: "",
          screenshots: [],
          downloadLinks: [],
        },
      })

      // 添加标签
      if (autoFill.tags && autoFill.tags.length > 0) {
        for (const tagName of autoFill.tags.slice(0, 5)) {
          const tag = await prisma.tag.upsert({
            where: { name: tagName },
            update: {},
            create: { name: tagName, color: "#8b5cf6" },
          })

          await prisma.gameTag.create({
            data: {
              gameId: game.id,
              tagId: tag.id,
            },
          })
        }
      }

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
