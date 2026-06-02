import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  if (!await getAdminSession("SUPER_ADMIN")) return NextResponse.json({ error: "无权限" }, { status: 403 })
  const { ids } = await req.json()
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "请选择要删除的游戏" }, { status: 400 })
  }
  const result = await prisma.game.deleteMany({ where: { id: { in: ids } } })
  return NextResponse.json({ ok: true, deleted: result.count })
}