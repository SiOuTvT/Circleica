import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const playlists = await prisma.playlist.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { music: true } } },
  })
  return NextResponse.json(playlists)
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { name } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: "名称不能为空" }, { status: 400 })
  const pl = await prisma.playlist.create({ data: { name: name.trim() } })
  return NextResponse.json(pl, { status: 201 })
}