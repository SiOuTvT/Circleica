import { forbidden, notFound, unauthorized } from "@/lib/api-response"
import { getAdminSession, roleAtLeast, type UserRole } from "@/lib/admin"
import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  const post = await prisma.forumPost.findUnique({ where: { id } })
  if (!post) return notFound()

  await prisma.forumPost.delete({ where: { id } })
  logAudit({ userId: session.user.id, action: "delete_forum_post", target: id, detail: `删除论坛帖子: ${post.title}` })
  return NextResponse.json({ ok: true })
}