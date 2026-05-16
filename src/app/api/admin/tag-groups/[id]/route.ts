import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { name, description, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "标签组名不能为空" }, { status: 400 })

  const existing = await prisma.tagGroup.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "标签组不存在" }, { status: 404 })

  const dup = await prisma.tagGroup.findFirst({ where: { name: name.trim(), NOT: { id } } })
  if (dup) return NextResponse.json({ error: "标签组名已存在" }, { status: 409 })

  const group = await prisma.tagGroup.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      color: color ?? "#7c8a9e",
    },
  })
  return NextResponse.json(group)
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  // Unset groupId for all tags in this group before deleting
  await prisma.tag.updateMany({ where: { groupId: id }, data: { groupId: null } })
  await prisma.tagGroup.delete({ where: { id } })
  return NextResponse.json({ success: true })
}