import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return notFound()
  // 只允许作者或管理员删除
  const isAdmin = (session.user as { role?: string }).role === "admin"
  if (post.userId !== session.user.id && !isAdmin) return forbidden()

  await prisma.forumPost.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const post = await prisma.forumPost.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        include: { user: { select: { id: true, username: true, avatar: true } } },
      },
    },
  })
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return NextResponse.json({
    ...post,
    isSolved: post.isSolved,
    createdAt: post.createdAt.toISOString(),
    comments: post.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString() })),
  })
}
