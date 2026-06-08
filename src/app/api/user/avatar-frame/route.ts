import { auth } from "@/lib/auth"
import { cleanupOldComposedAvatar, composeAvatar } from "@/lib/avatar-compose"
import { logger } from "@/lib/logger"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

// GET: 获取公开头像框列表 + 当前用户选择
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  const frames = await prisma.avatarFrame.findMany({
    where: { isPublic: true },
    orderBy: { sort: "asc" },
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { avatarFrameId: true, composedAvatarUrl: true },
  })

  return NextResponse.json({
    frames,
    currentFrameId: user?.avatarFrameId || null,
    composedAvatarUrl: user?.composedAvatarUrl || null,
  })
}

// POST: 选择头像框并合成
export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { frameId } = body as { frameId: string | null }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatar: true, composedAvatarUrl: true },
    })

    if (!user) {
      return NextResponse.json({ error: "用户不存在" }, { status: 404 })
    }

    // 清理旧的合成头像
    await cleanupOldComposedAvatar(user.composedAvatarUrl || "")

    let composedUrl = ""

    if (frameId) {
      // 验证头像框存在且公开
      const frame = await prisma.avatarFrame.findUnique({
        where: { id: frameId },
      })
      if (!frame) {
        return NextResponse.json({ error: "头像框不存在" }, { status: 404 })
      }

      // 合成头像（DB头像框传入imageUrl，内置头像框只传frameId）
      if (user.avatar) {
        composedUrl = await composeAvatar(user.avatar, frameId, frame.imageUrl)
      }
    }

    // 更新用户
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        avatarFrameId: frameId || null,
        composedAvatarUrl: composedUrl || "",
      },
    })

    return NextResponse.json({
      success: true,
      composedAvatarUrl: composedUrl || null,
    })
  } catch (error) {
    logger.upload.error("选择头像框失败", error)
    return NextResponse.json({ error: "操作失败" }, { status: 500 })
  }
}