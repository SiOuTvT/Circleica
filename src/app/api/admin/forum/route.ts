import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"))
  const limit = 20
  const skip = (page - 1) * limit

  const [posts, total] = await Promise.all([
    prisma.forumPost.findMany({
      orderBy: { createdAt: "desc" },
      skip, take: limit,
      include: {
        user: { select: { id: true, username: true, avatar: true } },
        _count: { select: { comments: true } },
      },
    }),
    prisma.forumPost.count(),
  ])

  return NextResponse.json({ posts, total, page, limit })
}

export async function DELETE(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: "缺少 ID" }, { status: 400 })

  await prisma.forumPost.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}