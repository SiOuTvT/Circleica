import { auth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/* ─── POST: 反馈资源链接失效 ─── */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; resourceId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 })
    }

    const { id: gameId, resourceId } = await params
    const userId = session.user.id

    // 查询资源及游戏信息
    const resource = await prisma.gameResource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        userId: true,
        gameId: true,
        isReported: true,
        game: { select: { serialId: true, title: true } },
      },
    })

    if (!resource) {
      return NextResponse.json({ error: "资源不存在" }, { status: 404 })
    }
    if (resource.gameId !== gameId) {
      return NextResponse.json({ error: "资源不属于该游戏" }, { status: 400 })
    }

    // 检查是否已反馈过（利用唯一约束）
    const existing = await prisma.resourceReport.findUnique({
      where: {
        resourceId_userId: { resourceId, userId },
      },
    })

    if (existing) {
      return NextResponse.json({ ok: true, alreadyReported: true })
    }

    // 使用事务：创建举报记录 + 更新资源状态 + 条件发通知
    const wasAlreadyReported = resource.isReported

    await prisma.$transaction(async (tx) => {
      // 创建举报记录
      await tx.resourceReport.create({
        data: { resourceId, userId },
      })

      // 更新资源失效状态
      await tx.gameResource.update({
        where: { id: resourceId },
        data: { isReported: true, reportedAt: new Date() },
      })
    })

    // 仅在资源首次被标记失效时，给发布者发通知
    if (!wasAlreadyReported && resource.userId !== userId) {
      await createNotification({
        userId: resource.userId,
        actorId: userId,
        type: "resource_reported",
        targetType: "game",
        targetId: String(resource.game.serialId),
      })
    }

    return NextResponse.json({ ok: true, alreadyReported: false })
  } catch (error) {
    logger.db.error("[Resource Report POST]", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}