import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { name } = await req.json().catch(() => ({}))
  if (!name?.trim()) return NextResponse.json({ error: "名称不能为空" }, { status: 400 })
  await prisma.playlist.update({ where: { id }, data: { name: name.trim() } })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.music.updateMany({ where: { playlistId: id }, data: { playlistId: null } })
  await prisma.playlist.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}