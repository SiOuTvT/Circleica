import { getAdminSession } from "@/lib/admin"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { vndbClient } from "@/lib/vndb"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  // 需要管理员权限
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: "未授权访问" }, { status: 403 })
  }

  try {
    const { vndbIds } = await req.json()

    if (!vndbIds || !Array.isArray(vndbIds) || vndbIds.length === 0) {
      return NextResponse.json(
        { error: "请提供 VNDB ID 列表" },
        { status: 400 }
      )
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

        // 自动填充信息
        const autoFill = await vndbClient.autoFillFromVNDB(String(vndbId))
        
        if (!autoFill) {
          results.push({ vndbId, status: "failed", reason: "获取信息失败" })
          failCount++
          continue
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
            status: "完结",
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

    return NextResponse.json({
      message: `导入完成：成功 ${successCount}，失败 ${failCount}`,
      results,
      successCount,
      failCount,
    })
  } catch (error) {
    logger.db.error("VNDB batch import error", error)
    return NextResponse.json(
      { error: "批量导入失败" },
      { status: 500 }
    )
  }
}
