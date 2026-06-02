import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.forumPostLike.findUnique({
      where: { userId_postId: { userId: session.user.id, postId: id } },
    })

    if (existing) {
      await tx.forumPostLike.delete({ where: { id: existing.id } })
      const post = await tx.forumPost.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true },
      })
      return { likeCount: post.likeCount, liked: false, userId: null }
    }

    await tx.forumPostLike.create({
      data: { userId: session.user.id, postId: id },
    })
    const post = await tx.forumPost.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true, userId: true },
    })
    return { likeCount: post.likeCount, liked: true, userId: post.userId }
  })

  // 事务外创建通知（非关键路径）
  if (result.liked && result.userId) {
    createNotification({
      userId: result.userId,
      actorId: session.user.id,
      type: "forum_post_like",
      targetType: "forum_post",
      targetId: id,
    }).catch(() => {})
  }

  return NextResponse.json({ likeCount: result.likeCount, liked: result.liked })
}
