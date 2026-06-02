import { auth } from "@/lib/auth"
import { createNotification } from "@/lib/notifications"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
  const { id } = await params

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.forumCommentLike.findUnique({
      where: { userId_commentId: { userId: session.user.id, commentId: id } },
    })

    if (existing) {
      await tx.forumCommentLike.delete({ where: { id: existing.id } })
      const c = await tx.forumComment.update({
        where: { id },
        data: { likeCount: { decrement: 1 } },
        select: { likeCount: true, postId: true },
      })
      return { likeCount: c.likeCount, liked: false, userId: null }
    }

    await tx.forumCommentLike.create({
      data: { userId: session.user.id, commentId: id },
    })
    const c = await tx.forumComment.update({
      where: { id },
      data: { likeCount: { increment: 1 } },
      select: { likeCount: true, userId: true, postId: true },
    })
    return { likeCount: c.likeCount, liked: true, userId: c.userId, postId: c.postId }
  })

  if (result.liked && result.userId) {
    createNotification({
      userId: result.userId,
      actorId: session.user.id,
      type: "forum_comment_like",
      targetType: "forum_comment",
      targetId: id,
    }).catch(() => {})
  }

  return NextResponse.json({ likeCount: result.likeCount, liked: result.liked })
}
