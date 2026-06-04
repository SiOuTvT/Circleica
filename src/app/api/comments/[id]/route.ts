import { auth } from "@/lib/auth"
import { roleAtLeast, type UserRole } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "未登录" }, { status: 401 })

  const { id } = await params

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { userId: true },
  })

  if (!comment) return NextResponse.json({ error: "评论不存在" }, { status: 404 })

  // 允许作者或管理员删除
  const dbUser = await prisma.user.findUnique({ where: { id: session.user.id }, select: { role: true } })
  const userRole = (dbUser?.role as UserRole) ?? "USER"
  if (comment.userId !== session.user.id && !roleAtLeast(userRole, "ADMIN")) {
    return NextResponse.json({ error: "无权删除" }, { status: 403 })
  }

  await prisma.comment.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}