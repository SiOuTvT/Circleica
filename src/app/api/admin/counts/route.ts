import { getAdminSession } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  if (!await getAdminSession()) return NextResponse.json({ error: "无权限" }, { status: 403 })

  const [reports, unpublishedGames] = await Promise.all([
    prisma.gameReport.count(),
    prisma.game.count({ where: { isPublished: false } }),
  ])

  return NextResponse.json({ reports, unpublishedGames })
}
