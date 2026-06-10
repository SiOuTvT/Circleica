import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { roleAtLeast, type UserRole } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return notFound()
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  const userRole = (dbUser?.role as UserRole) ?? "USER"
  if (post.userId !== session.user.id && !roleAtLeast(userRole, "ADMIN")) return forbidden()

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

  // Increment view count
  prisma.forumPost.update({ where: { id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  return NextResponse.json({
    ...post,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    comments: post.comments.map((c) => ({ ...c, createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })),
  })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return notFound()
  if (post.userId !== session.user.id) return forbidden()

  if (post.isLocked) return NextResponse.json({ error: "帖子已锁定" }, { status: 403 })

  const body = await req.json()
  const title = typeof body.title === "string" ? body.title.trim() : undefined
  const content = typeof body.content === "string" ? body.content.trim() : undefined
  const category = typeof body.category === "string" ? body.category.trim() : undefined

  if (title !== undefined && (!title || title.length > 100)) return NextResponse.json({ error: "标题不能为空且不超过100字" }, { status: 400 })
  if (content !== undefined && (!content || content.length > 5000)) return NextResponse.json({ error: "内容不能为空且不超过5000字" }, { status: 400 })
  if (category !== undefined) {
    const valid = ["discussion", "help", "resource", "offtopic"]
    if (!valid.includes(category)) return NextResponse.json({ error: "无效的分类" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (title !== undefined) data.title = title
  if (content !== undefined) data.content = content
  if (category !== undefined) data.category = category

  if (Object.keys(data).length === 0) return NextResponse.json({ error: "没有要更新的内容" }, { status: 400 })

  const updated = await prisma.forumPost.update({
    where: { id },
    data,
    include: {
      user: { select: { id: true, username: true, avatar: true } },
      _count: { select: { comments: true } },
    },
  })

  return NextResponse.json({
    id: updated.id, title: updated.title, content: updated.content,
    imageUrl: updated.imageUrl, likeCount: updated.likeCount,
    isSolved: updated.isSolved, isPinned: updated.isPinned, isLocked: updated.isLocked,
    category: updated.category, viewCount: updated.viewCount,
    updatedAt: updated.updatedAt.toISOString(), createdAt: updated.createdAt.toISOString(),
    user: updated.user, commentCount: updated._count.comments,
  })
}
