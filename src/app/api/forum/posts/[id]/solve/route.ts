import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

    const { id } = await params
    const post = await prisma.forumPost.findUnique({ where: { id }, select: { userId: true, isSolved: true } })
    if (!post) return NextResponse.json({ error: "帖子不存在" }, { status: 404 })
    if (post.userId !== session.user.id) return NextResponse.json({ error: "只有发帖人可以标记" }, { status: 403 })

    const updated = await prisma.forumPost.update({
      where: { id },
      data: { isSolved: !post.isSolved },
      select: { isSolved: true },
    })

    return NextResponse.json({ isSolved: updated.isSolved })
  } catch (error) {
    console.error("[Forum Post Solve]", error)
    return NextResponse.json({ error: "服务器内部错误" }, { status: 500 })
  }
}
