import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

/**
 * GET: 获取所有成就（管理员）
 */
export async function GET() {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const achievements = await prisma.achievement.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(achievements)
}

/**
 * POST: 创建成就
 */
export async function POST(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  const name = body.name as string | undefined
  const description = body.description as string | undefined
  const icon = body.icon as string | undefined
  const characterImage = body.characterImage as string | undefined
  const category = body.category as string | undefined
  const conditionType = body.conditionType as string | undefined
  const conditionTarget = body.conditionTarget as number | undefined
  const points = body.points as number | undefined
  const hidden = body.hidden as boolean | undefined

  if (!name?.trim()) return NextResponse.json({ error: "名称不能为空" }, { status: 400 })
  if (!conditionType) return NextResponse.json({ error: "条件类型不能为空" }, { status: 400 })

  const achievement = await prisma.achievement.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      icon: icon?.trim() ?? "",
      characterImage: characterImage?.trim() ?? "",
      category: category?.trim() ?? "general",
      conditionType,
      conditionTarget: conditionTarget ?? 1,
      points: points ?? 10,
      hidden: hidden !== false,
    },
  })

  return NextResponse.json(achievement, { status: 201 })
}
