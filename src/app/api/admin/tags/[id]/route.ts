import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

type Ctx = { params: Promise<{ id: string }> }

export async function PUT(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { name, description, color, groupId, sortOrder, isVisible } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "标签名不能为空" }, { status: 400 })

  const existing = await prisma.tag.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "标签不存在" }, { status: 404 })

  const dup = await prisma.tag.findFirst({ where: { name: name.trim(), NOT: { id } } })
  if (dup) return NextResponse.json({ error: "标签名已存在" }, { status: 409 })

  const tag = await prisma.tag.update({
    where: { id },
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      color: color ?? "#a78bfa",
      groupId: groupId || null,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      isVisible: isVisible !== false,
    },
    include: { _count: { select: { games: true } } },
  })
  return NextResponse.json({ ...tag, gameCount: tag._count.games })
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  const tag = await prisma.tag.findUnique({
    where: { id },
    include: { _count: { select: { games: true } } },
  })
  if (!tag) return NextResponse.json({ error: "标签不存在" }, { status: 404 })

  if (tag._count.games > 0) {
    return NextResponse.json({
      error: `该标签正被 ${tag._count.games} 个游戏使用，删除后将解除所有关联，确认删除？`,
      gameCount: tag._count.games,
      confirm: true,
    }, { status: 409 })
  }

  await prisma.tag.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const { forceDelete, groupId } = await req.json()

  // 强制删除
  if (forceDelete) {
    await prisma.tag.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  }

  // 分配标签到标签组
  if (groupId !== undefined) {
    const tag = await prisma.tag.findUnique({ where: { id } })
    if (!tag) return NextResponse.json({ error: "标签不存在" }, { status: 404 })

    // 如果指定了groupId，验证目标组存在
    if (groupId) {
      const group = await prisma.tagGroup.findUnique({ where: { id: groupId } })
      if (!group) return NextResponse.json({ error: "目标标签组不存在" }, { status: 404 })
    }

    const updated = await prisma.tag.update({
      where: { id },
      data: { groupId: groupId || null },
      include: { _count: { select: { games: true } } },
    })
    return NextResponse.json({ ...updated, gameCount: updated._count.games })
  }

  return NextResponse.json({ error: "无效操作" }, { status: 400 })
}
