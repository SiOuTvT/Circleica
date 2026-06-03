import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/**
 * PUT: 更新成就
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params
  const body = await req.json()

  const achievement = await prisma.achievement.update({
    where: { id },
    data: body,
  })
  return NextResponse.json(achievement)
}

/**
 * DELETE: 删除成就
 */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  await prisma.userAchievement.deleteMany({ where: { achievementId: id } })
  await prisma.achievement.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
