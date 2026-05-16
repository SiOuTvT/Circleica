import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { name, color, groupId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "标签名不能为空" }, { status: 400 })
  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name: name.trim(),
      color: color ?? "#a78bfa",
      groupId: groupId || null,
    },
  })
  return NextResponse.json(tag)
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
