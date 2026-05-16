import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const groups = await prisma.tagGroup.findMany({
    orderBy: { name: "asc" },
    include: {
      tags: {
        orderBy: { name: "asc" },
        include: { _count: { select: { games: true } } },
      },
    },
  })
  return NextResponse.json(groups.map((g) => ({
    ...g,
    tags: g.tags.map((t) => ({ ...t, gameCount: t._count.games })),
  })))
}

export async function POST(req: NextRequest) {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { name, description, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: "标签组名不能为空" }, { status: 400 })

  const exists = await prisma.tagGroup.findUnique({ where: { name: name.trim() } })
  if (exists) return NextResponse.json({ error: "标签组已存在" }, { status: 409 })

  const group = await prisma.tagGroup.create({
    data: {
      name: name.trim(),
      description: description?.trim() ?? "",
      color: color ?? "#7c8a9e",
    },
  })
  return NextResponse.json(group, { status: 201 })
}