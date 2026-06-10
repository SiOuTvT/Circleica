import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { auth } from "@/lib/auth"
import { roleAtLeast, type UserRole } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const comment = await prisma.forumComment.findUnique({ where: { id } })
  if (!comment) return notFound()
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  const userRole = (dbUser?.role as UserRole) ?? "USER"
  if (comment.userId !== session.user.id && !roleAtLeast(userRole, "ADMIN")) return forbidden()

  await prisma.forumComment.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()
  const { id } = await params

  const comment = await prisma.forumComment.findUnique({ where: { id } })
  if (!comment) return notFound()
  if (comment.userId !== session.user.id) return forbidden()

  const body = await req.json()
  const content = typeof body.content === "string" ? body.content.trim() : ""
  if (!content || content.length > 2000) return NextResponse.json({ error: "内容不能为空且不超过2000字" }, { status: 400 })

  const updated = await prisma.forumComment.update({
    where: { id },
    data: { content },
    include: { user: { select: { id: true, username: true, avatar: true } } },
  })

  return NextResponse.json({ ...updated, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() })
}