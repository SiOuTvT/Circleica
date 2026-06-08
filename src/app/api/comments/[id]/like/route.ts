import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })
    const { id } = await params

    // 使用事务防止并发竞态条件
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.commentLike.findUnique({
        where: { userId_commentId: { userId: session.user.id, commentId: id } },
      })

      if (existing) {
        await tx.commentLike.delete({ where: { id: existing.id } })
        const comment = await tx.comment.update({
          where: { id },
          data: { likeCount: { decrement: 1 } },
          select: { likeCount: true },
        })
        return { count: comment.likeCount, liked: false }
      }

      await tx.commentLike.create({
        data: { userId: session.user.id, commentId: id },
      })
      const comment = await tx.comment.update({
        where: { id },
        data: { likeCount: { increment: 1 } },
        select: { likeCount: true },
      })
      return { count: comment.likeCount, liked: true }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error("[Comment Like]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
