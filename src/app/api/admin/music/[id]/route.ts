import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminSession } from "@/lib/admin"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  let isActive: boolean
  try {
    const body = await req.json()
    isActive = body.isActive
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const m = await prisma.music.update({ where: { id }, data: { isActive }, select: { id: true, isActive: true } })
  return NextResponse.json(m)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.music.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
