import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: { id: true, username: true, email: true, role: true, avatar: true, createdAt: true,
      _count: { select: { favorites: true, comments: true, checkIns: true } } },
  })
  return NextResponse.json(users.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })))
}
