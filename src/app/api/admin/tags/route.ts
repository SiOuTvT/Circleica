import { getAdminSession } from "@/lib/admin"
import { ensurePresetTagGroups } from "@/lib/preset-tag-groups"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  // 确保预设标签组存在
  await ensurePresetTagGroups()
  const tags = await prisma.tag.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { games: true } },
      group: true,
    },
  })
  return NextResponse.json(tags.map((t) => ({ ...t, gameCount: t._count.games })))
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  // 确保预设标签组存在（创建标签时可能引用默认组）
  await ensurePresetTagGroups()

  let name: string, description: string | undefined, color: string | undefined, groupId: string | undefined, sortOrder: number | undefined, isVisible: boolean | undefined
  try {
    const body = await req.json()
    name = body.name
    description = body.description
    color = body.color
    groupId = body.groupId
    sortOrder = body.sortOrder
    isVisible = body.isVisible
  } catch {
    return NextResponse.json({ error: "请求格式错误" }, { status: 400 })
  }
  if (!name?.trim()) return NextResponse.json({ error: "标签名不能为空" }, { status: 400 })

  const exists = await prisma.tag.findUnique({ where: { name: name.trim() } })
  if (exists) return NextResponse.json({ error: "标签已存在" }, { status: 409 })

  const tag = await prisma.tag.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      color: color ?? "#a78bfa",
      groupId: groupId || "preset_detail_header",
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
      isVisible: isVisible !== false,
    },
  })
  return NextResponse.json(tag, { status: 201 })
}
