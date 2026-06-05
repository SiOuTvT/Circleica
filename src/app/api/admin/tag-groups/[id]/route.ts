import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { isValidPosition } from "@/lib/tag-positions"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  const existing = await prisma.tagGroup.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "标签组不存在" }, { status: 404 })

  // 支持部分更新（如仅更新颜色）
  const updateData: Record<string, unknown> = {}

  if (body.name !== undefined) {
    if (!body.name?.trim()) return NextResponse.json({ error: "标签组名不能为空" }, { status: 400 })
    const dup = await prisma.tagGroup.findFirst({ where: { name: body.name.trim(), NOT: { id } } })
    if (dup) return NextResponse.json({ error: "标签组名已存在" }, { status: 409 })
    updateData.name = body.name.trim()
  }
  if (body.description !== undefined) updateData.description = body.description?.trim() ?? ""
  if (body.color !== undefined) updateData.color = body.color
  if (body.positions !== undefined) {
    updateData.positions = JSON.stringify(
      Array.isArray(body.positions) ? body.positions.filter((p: string) => isValidPosition(p)) : []
    )
  }

  const group = await prisma.tagGroup.update({ where: { id }, data: updateData })
  return NextResponse.json({ ...group, positions: JSON.parse(group.positions) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  const existing = await prisma.tagGroup.findUnique({
    where: { id },
    include: { _count: { select: { tags: true } } },
  })
  if (!existing) return NextResponse.json({ error: "标签组不存在" }, { status: 404 })

  // 允许删除内置标签组
  if (existing._count.tags > 0) {
    return NextResponse.json({
      error: `该标签组包含 ${existing._count.tags} 个标签，删除后这些标签将变为未分组状态，确认删除？`,
      tagCount: existing._count.tags,
      confirm: true,
    }, { status: 409 })
  }

  await prisma.tagGroup.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { forceDelete } = await req.json()

  if (forceDelete) {
    const existing = await prisma.tagGroup.findUnique({ where: { id } })
    if (!existing) return NextResponse.json({ error: "标签组不存在" }, { status: 404 })

    // 允许强制删除内置标签组
    await prisma.tag.updateMany({ where: { groupId: id }, data: { groupId: null } })
    await prisma.tagGroup.delete({ where: { id } })
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: "无效操作" }, { status: 400 })
}