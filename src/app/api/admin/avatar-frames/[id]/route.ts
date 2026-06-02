import { getAdminSession } from "@/lib/admin"
import { cleanupOldComposedAvatar } from "@/lib/avatar-compose"
import { prisma } from "@/lib/prisma"
import fs from "fs/promises"
import { NextResponse } from "next/server"
import path from "path"

// GET: 获取单个头像框
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await params
  const frame = await prisma.avatarFrame.findUnique({ where: { id } })
  if (!frame) {
    return NextResponse.json({ error: "头像框不存在" }, { status: 404 })
  }

  return NextResponse.json({ frame })
}

// PUT: 更新头像框
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await params
  const existing = await prisma.avatarFrame.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "头像框不存在" }, { status: 404 })
  }

  try {
    const body = await request.json()
    const { name, description, imageUrl, isPublic, sort } = body

    const frame = await prisma.avatarFrame.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(imageUrl !== undefined && { imageUrl }),
        ...(isPublic !== undefined && { isPublic }),
        ...(sort !== undefined && { sort }),
      },
    })

    return NextResponse.json({ frame })
  } catch (error) {
    console.error("更新头像框失败:", error)
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
}

// DELETE: 删除头像框
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await params
  const existing = await prisma.avatarFrame.findUnique({ where: { id } })
  if (!existing) {
    return NextResponse.json({ error: "头像框不存在" }, { status: 404 })
  }

  try {
    // 删除头像框图片文件（支持多种格式）
    for (const ext of ["png", "webp", "jpg"]) {
      const framePath = path.join(
        process.cwd(),
        "public",
        "uploads",
        "avatar-frames",
        `${id}.${ext}`
      )
      try {
        await fs.unlink(framePath)
      } catch {
        // 文件可能不存在，忽略
      }
    }

    // 清理使用该头像框的用户的合成头像文件和数据
    const affectedUsers = await prisma.user.findMany({
      where: { avatarFrameId: id },
      select: { composedAvatarUrl: true },
    })

    // 删除旧的合成头像文件
    for (const user of affectedUsers) {
      if (user.composedAvatarUrl) {
        await cleanupOldComposedAvatar(user.composedAvatarUrl)
      }
    }

    // 将使用该头像框的用户的 avatarFrameId 和 composedAvatarUrl 设为 null
    await prisma.user.updateMany({
      where: { avatarFrameId: id },
      data: { avatarFrameId: null, composedAvatarUrl: null },
    })

    await prisma.avatarFrame.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("删除头像框失败:", error)
    return NextResponse.json({ error: "删除失败" }, { status: 500 })
  }
}
