import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

// 允许更新的字段白名单
const UPDATABLE_FIELDS = [
  "name", "description", "icon", "characterImage", "category",
  "conditionType", "conditionTarget", "points", "hidden", "isActive",
] as const

/**
 * PUT: 更新成就
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { id } = await params

  try {
    const body = await req.json()

    // 只取白名单内的字段
    const data: Record<string, unknown> = {}
    for (const key of UPDATABLE_FIELDS) {
      if (key in body) data[key] = body[key]
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "没有有效的更新字段" }, { status: 400 })
    }

    const achievement = await prisma.achievement.update({
      where: { id },
      data,
    })
    return NextResponse.json(achievement)
  } catch {
    return NextResponse.json({ error: "更新失败" }, { status: 500 })
  }
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
