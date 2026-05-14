import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// POST /api/follow/[id] - 关注用户
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id: targetId } = await params
  const userId = session.user.id

  if (userId === targetId) {
    return NextResponse.json({ error: "不能关注自己" }, { status: 400 })
  }

  // 检查目标用户是否存在
  const target = await prisma.user.findUnique({ where: { id: targetId } })
  if (!target) {
    return NextResponse.json({ error: "用户不存在" }, { status: 404 })
  }

  // 检查是否已关注
  const existing = await prisma.follow.findUnique({
    where: {
      followerId_followingId: {
        followerId: userId,
        followingId: targetId,
      }
    }
  })

  if (existing) {
    return NextResponse.json({ error: "已关注" }, { status: 409 })
  }

  await prisma.follow.create({
    data: {
      followerId: userId,
      followingId: targetId,
    }
  })

  return NextResponse.json({ success: true })
}

// DELETE /api/follow/[id] - 取消关注
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 })
  }

  const { id: targetId } = await params
  const userId = session.user.id

  try {
    await prisma.follow.delete({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: targetId,
        }
      }
    })
  } catch {
    // 不存在时也返回成功
  }

  return NextResponse.json({ success: true })
}